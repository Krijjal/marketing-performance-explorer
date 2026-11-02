import type pg from "pg";

export interface LatestRun {
  id: number;
  sourceFile: string;
  status: string;
  startedAt: Date;
  rowsRead: number;
  rowsLoaded: number;
  rowsRejected: number;
  errorMessage: string | null;
}

export interface IssueRow {
  id: number;
  sheet: string;
  rowNumber: number | null;
  rule: string;
  severity: string;
  actionTaken: string;
  field: string | null;
  originalValue: string | null;
  correctedValue: string | null;
  message: string;
}

export interface DataQualityReport {
  run: LatestRun;
  issues: IssueRow[];
}

export async function getLatestRunReport(pool: pg.Pool): Promise<DataQualityReport | null> {
  const runs = await pool.query<{
    id: number;
    source_file: string;
    status: string;
    started_at: Date;
    rows_read: number;
    rows_loaded: number;
    rows_rejected: number;
    error_message: string | null;
  }>(
    `SELECT id, source_file, status, started_at, rows_read, rows_loaded, rows_rejected, error_message
     FROM ingestion_run
     ORDER BY id DESC
     LIMIT 1`,
  );
  const run = runs.rows[0];
  if (!run) {
    return null;
  }

  const issues = await pool.query<{
    id: number;
    sheet: string;
    row_number: number | null;
    rule: string;
    severity: string;
    action_taken: string;
    field: string | null;
    original_value: string | null;
    corrected_value: string | null;
    message: string;
  }>(
    `SELECT id, sheet, row_number, rule, severity, action_taken, field,
            original_value, corrected_value, message
     FROM data_quality_issue
     WHERE ingestion_run_id = $1
     ORDER BY sheet, row_number, rule`,
    [run.id],
  );

  return {
    run: {
      id: run.id,
      sourceFile: run.source_file,
      status: run.status,
      startedAt: run.started_at,
      rowsRead: run.rows_read,
      rowsLoaded: run.rows_loaded,
      rowsRejected: run.rows_rejected,
      errorMessage: run.error_message,
    },
    issues: issues.rows.map((issue) => ({
      id: issue.id,
      sheet: issue.sheet,
      rowNumber: issue.row_number,
      rule: issue.rule,
      severity: issue.severity,
      actionTaken: issue.action_taken,
      field: issue.field,
      originalValue: issue.original_value,
      correctedValue: issue.corrected_value,
      message: issue.message,
    })),
  };
}
