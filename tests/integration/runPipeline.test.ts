import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type pg from "pg";
import * as XLSX from "xlsx";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runPipeline } from "../../src/ingestion/runPipeline";
import { createTestPool, resetDatabase } from "./testDatabase";

const DATASET_PATH = "docs/Technical_Assessment_Sample_Dataset.xlsx";
const MONDAY_2025_01_06 = 45663;

const BUSINESS_HEADERS = [
  "week_start", "brand", "market", "revenue", "units_sold", "promotion_flag",
  "price_index", "distribution_pct", "competitor_price_index", "economic_index",
];
const MEDIA_HEADERS = [
  "week_start", "brand", "market", "channel", "media_spend", "impressions", "clicks", "tv_grps",
];
const VALID_BUSINESS_ROW = [MONDAY_2025_01_06, "Pulse", "UK", 1000, 50, 0, 100, 90, 100, 100];
const VALID_MEDIA_ROW = [MONDAY_2025_01_06, "Pulse", "UK", "Social", 100, 1000, 10, 0];

let pool: pg.Pool;
let temporaryDirectory: string;

async function writeWorkbook(sheets: Record<string, unknown[][]>): Promise<string> {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  const filePath = path.join(temporaryDirectory, "workbook.xlsx");
  await writeFile(filePath, XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer);
  return filePath;
}

async function countRows(table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT count(*) FROM ${table}`);
  return Number(result.rows[0]!.count);
}

beforeAll(async () => {
  pool = createTestPool();
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), "pipeline-test-"));
});

afterAll(async () => {
  await pool.end();
  await rm(temporaryDirectory, { recursive: true });
});

beforeEach(async () => {
  await resetDatabase(pool);
});

describe("the sample dataset", () => {
  it("loads every valid row and records the run", async () => {
    const result = await runPipeline(pool, DATASET_PATH);

    expect(result).toMatchObject({ rowsRead: 129, rowsLoaded: 128, rowsRejected: 0, issueCount: 6 });
    expect(await countRows("fact_business_weekly")).toBe(32);
    expect(await countRows("fact_media_weekly")).toBe(96);

    const run = await pool.query("SELECT status, source_file, finished_at FROM ingestion_run");
    expect(run.rows[0]).toMatchObject({
      status: "succeeded",
      source_file: "Technical_Assessment_Sample_Dataset.xlsx",
    });
    expect((run.rows[0] as { finished_at: Date | null }).finished_at).not.toBeNull();
  });

  it("logs each planted issue against its spreadsheet row", async () => {
    await runPipeline(pool, DATASET_PATH);

    const issues = await pool.query(
      `SELECT sheet, row_number, rule, action_taken, field, original_value, corrected_value
       FROM data_quality_issue ORDER BY sheet, row_number, rule`,
    );

    expect(issues.rows).toEqual([
      {
        sheet: "Business_Performance", row_number: 21, rule: "missing_value_imputed",
        action_taken: "imputed", field: "distribution_pct", original_value: null, corrected_value: "95",
      },
      {
        sheet: "Business_Performance", row_number: 22, rule: "promotion_flag_normalized",
        action_taken: "normalized", field: "promotion_flag", original_value: "Yes", corrected_value: "true",
      },
      {
        sheet: "Business_Performance", row_number: 22, rule: "promotion_without_price_drop",
        action_taken: "reported", field: "promotion_flag", original_value: "true", corrected_value: null,
      },
      {
        sheet: "Media_Investment", row_number: 42, rule: "category_normalized",
        action_taken: "normalized", field: "channel", original_value: "paid search", corrected_value: "Paid Search",
      },
      {
        sheet: "Media_Investment", row_number: 82, rule: "missing_value_imputed",
        action_taken: "imputed", field: "media_spend", original_value: null, corrected_value: "1846.8",
      },
      {
        sheet: "Media_Investment", row_number: 98, rule: "duplicate_row",
        action_taken: "dropped", field: null,
        original_value: "2025-01-13|Pulse|Germany|Social", corrected_value: null,
      },
    ]);
  });

  it("stores imputed values with their flags, and no others", async () => {
    await runPipeline(pool, DATASET_PATH);

    const distribution = await pool.query(
      `SELECT f.week_start::text, b.name AS brand, m.name AS market, f.distribution_pct
       FROM fact_business_weekly f
       JOIN brand b ON b.id = f.brand_id
       JOIN market m ON m.id = f.market_id
       WHERE f.distribution_is_imputed`,
    );
    const spend = await pool.query(
      `SELECT f.week_start::text, b.name AS brand, m.name AS market, c.name AS channel, f.media_spend
       FROM fact_media_weekly f
       JOIN brand b ON b.id = f.brand_id
       JOIN market m ON m.id = f.market_id
       JOIN channel c ON c.id = f.channel_id
       WHERE f.spend_is_imputed`,
    );

    expect(distribution.rows).toEqual([
      { week_start: "2025-02-03", brand: "Hearth", market: "Germany", distribution_pct: "95.00" },
    ]);
    expect(spend.rows).toEqual([
      { week_start: "2025-02-17", brand: "Hearth", market: "UK", channel: "Social", media_spend: "1846.80" },
    ]);
  });

  it("stores the Yes row as a promotion and the other weeks by their flags", async () => {
    await runPipeline(pool, DATASET_PATH);

    const result = await pool.query(
      "SELECT count(*)::int AS promotions FROM fact_business_weekly WHERE is_promotion",
    );

    expect(result.rows[0]).toEqual({ promotions: 5 });
  });

  it("does not change the data when run twice, and records both runs", async () => {
    const readFacts = async () => {
      const business = await pool.query<Record<string, unknown>>(
        "SELECT * FROM fact_business_weekly ORDER BY week_start, brand_id, market_id",
      );
      const media = await pool.query<Record<string, unknown>>(
        "SELECT * FROM fact_media_weekly ORDER BY week_start, brand_id, market_id, channel_id",
      );
      const withoutRunId = (rows: Record<string, unknown>[]) =>
        rows.map(({ ingestion_run_id, ...fields }) => fields);
      return [withoutRunId(business.rows), withoutRunId(media.rows)];
    };

    await runPipeline(pool, DATASET_PATH);
    const firstLoad = await readFacts();
    await runPipeline(pool, DATASET_PATH);

    expect(await readFacts()).toEqual(firstLoad);
    expect(await countRows("ingestion_run")).toBe(2);
    expect(await countRows("data_quality_issue")).toBe(12);
  });
});

describe("generic behaviour", () => {
  it("rejects bad rows, loads good ones and counts each row once", async () => {
    const filePath = await writeWorkbook({
      Business_Performance: [
        BUSINESS_HEADERS,
        VALID_BUSINESS_ROW,
        [MONDAY_2025_01_06, "Ember", "France", -5, 50, 0, 100, 90, 100, 100],
      ],
      Media_Investment: [MEDIA_HEADERS, VALID_MEDIA_ROW],
    });

    const result = await runPipeline(pool, filePath);

    expect(result).toMatchObject({ rowsRead: 3, rowsLoaded: 2, rowsRejected: 1 });
    const issues = await pool.query<{ rule: string }>(
      "SELECT rule FROM data_quality_issue WHERE row_number = 3",
    );
    expect(issues.rows.map((row) => row.rule).sort()).toEqual([
      "negative_value",
      "unknown_category",
      "unknown_category",
    ]);
  });

  it("removes rows that are no longer in the source file", async () => {
    await runPipeline(pool, DATASET_PATH);
    const filePath = await writeWorkbook({
      Business_Performance: [BUSINESS_HEADERS, VALID_BUSINESS_ROW],
      Media_Investment: [MEDIA_HEADERS, VALID_MEDIA_ROW],
    });

    await runPipeline(pool, filePath);

    expect(await countRows("fact_business_weekly")).toBe(1);
    expect(await countRows("fact_media_weekly")).toBe(1);
  });
});

describe("failed runs", () => {
  it("records a failed run when a sheet is missing", async () => {
    const filePath = await writeWorkbook({ Business_Performance: [BUSINESS_HEADERS] });

    await expect(runPipeline(pool, filePath)).rejects.toThrow("Media_Investment");

    const run = await pool.query("SELECT status, error_message FROM ingestion_run");
    expect(run.rows[0]).toEqual({
      status: "failed",
      error_message: "Workbook has no sheet named Media_Investment",
    });
  });

  it("keeps existing data when a file has no valid rows, and keeps the reasons", async () => {
    await runPipeline(pool, DATASET_PATH);
    const filePath = await writeWorkbook({
      Business_Performance: [["renamed_column"], ["value"]],
      Media_Investment: [MEDIA_HEADERS, VALID_MEDIA_ROW],
    });

    await expect(runPipeline(pool, filePath)).rejects.toThrow("no valid rows");

    expect(await countRows("fact_business_weekly")).toBe(32);
    expect(await countRows("fact_media_weekly")).toBe(96);
    const issues = await pool.query(
      `SELECT count(*)::int AS count FROM data_quality_issue i
       JOIN ingestion_run r ON r.id = i.ingestion_run_id
       WHERE r.status = 'failed'`,
    );
    expect((issues.rows[0] as { count: number }).count).toBeGreaterThan(0);
  });

  it("rolls back the whole load when one row fails in the database", async () => {
    await runPipeline(pool, DATASET_PATH);
    // Makes the database stricter than validation, so the media row passes
    // validation and then fails during the load, after the business row was written.
    await pool.query(
      "ALTER TABLE fact_media_weekly ADD CONSTRAINT test_only_low_spend CHECK (media_spend < 100000) NOT VALID",
    );
    const filePath = await writeWorkbook({
      Business_Performance: [BUSINESS_HEADERS, VALID_BUSINESS_ROW],
      Media_Investment: [MEDIA_HEADERS, [MONDAY_2025_01_06, "Pulse", "UK", "Social", 200000, 1000, 10, 0]],
    });

    await expect(runPipeline(pool, filePath)).rejects.toThrow();

    expect(await countRows("fact_business_weekly")).toBe(32);
    expect(await countRows("fact_media_weekly")).toBe(96);
  });
});
