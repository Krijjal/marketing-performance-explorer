import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";
import { logger } from "../logging/logger";
import { findMissingBusinessWeeks, findMissingMediaWeeks } from "./completeness";
import { businessKey, dedupeRows, mediaKey } from "./dedupe";
import { imputeBusinessRows, imputeMediaRows } from "./impute";
import {
  failRun,
  finishRun,
  loadFacts,
  readReferenceData,
  saveIssues,
  startRun,
  type RunCounts,
} from "./load";
import { normalizeBusinessRows, normalizeMediaRows } from "./normalize";
import { readWorkbook } from "./readWorkbook";
import { parseBusinessRows, parseMediaRows } from "./schemas";
import { BUSINESS_SHEET, MEDIA_SHEET, type ReferenceData, type SourceRow } from "./types";
import { validateBusinessRows, validateMediaRows } from "./validate";

export interface PipelineResult extends RunCounts {
  runId: number;
  issueCount: number;
}

export async function runPipeline(pool: pg.Pool, filePath: string): Promise<PipelineResult> {
  const fileContents = await readFile(filePath);
  const sha256 = createHash("sha256").update(fileContents).digest("hex");
  const reference = await readReferenceData(pool);

  // The run row is committed on its own, before any data is written, so a failed
  // run stays on record even though the data transaction rolls back.
  const runId = await startRun(pool, path.basename(filePath), sha256);
  try {
    const { businessRows, mediaRows } = readWorkbook(fileContents);
    const business = cleanBusinessRows(businessRows, reference);
    const media = cleanMediaRows(mediaRows, reference);
    const issues = [...business.issues, ...media.issues];

    // Saved before the load so the reasons for a failed load can still be read.
    await saveIssues(pool, runId, issues);

    // Loading removes rows missing from the file, so a broken file (renamed
    // columns, say) must not be allowed to empty a table that holds good data.
    if (business.rows.length === 0 || media.rows.length === 0) {
      throw new Error("A sheet has no valid rows, so the load was stopped");
    }
    await loadFacts(pool, runId, reference, business.rows, media.rows);

    const rowsRead = businessRows.length + mediaRows.length;
    const rowsLoaded = business.rows.length + media.rows.length;
    const rowsDropped = issues.filter((issue) => issue.actionTaken === "dropped").length;
    // Counted from rows, not issues, because one rejected row can raise several issues.
    const counts = { rowsRead, rowsLoaded, rowsRejected: rowsRead - rowsLoaded - rowsDropped };

    await finishRun(pool, runId, counts);
    logger.info({ runId, ...counts, issueCount: issues.length }, "ingestion succeeded");
    return { runId, ...counts, issueCount: issues.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await failRun(pool, runId, errorMessage);
    logger.error({ runId, err: error }, "ingestion failed");
    throw error;
  }
}

function cleanBusinessRows(sourceRows: SourceRow[], reference: ReferenceData) {
  const parsed = parseBusinessRows(sourceRows);
  const normalized = normalizeBusinessRows(parsed.rows, reference);
  const deduped = dedupeRows(normalized.rows, BUSINESS_SHEET, businessKey);
  const validated = validateBusinessRows(deduped.rows, reference);
  const imputed = imputeBusinessRows(validated.rows);
  const missingWeeks = findMissingBusinessWeeks(imputed.rows, reference);

  return {
    rows: imputed.rows,
    issues: [
      ...parsed.issues,
      ...normalized.issues,
      ...deduped.issues,
      ...validated.issues,
      ...imputed.issues,
      ...missingWeeks,
    ],
  };
}

function cleanMediaRows(sourceRows: SourceRow[], reference: ReferenceData) {
  const parsed = parseMediaRows(sourceRows);
  const normalized = normalizeMediaRows(parsed.rows, reference);
  const deduped = dedupeRows(normalized.rows, MEDIA_SHEET, mediaKey);
  const validated = validateMediaRows(deduped.rows, reference);
  const imputed = imputeMediaRows(validated.rows);
  const missingWeeks = findMissingMediaWeeks(imputed.rows, reference);

  return {
    rows: imputed.rows,
    issues: [
      ...parsed.issues,
      ...normalized.issues,
      ...deduped.issues,
      ...validated.issues,
      ...imputed.issues,
      ...missingWeeks,
    ],
  };
}
