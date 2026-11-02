import type { DataQualityIssue, SheetName, StepResult } from "./types";

export function businessKey(row: { weekStart: string; brand: string; market: string }): string {
  return [row.weekStart, row.brand, row.market].join("|");
}

export function mediaKey(row: {
  weekStart: string;
  brand: string;
  market: string;
  channel: string;
}): string {
  return [row.weekStart, row.brand, row.market, row.channel].join("|");
}

// Duplicates are matched through a map of keys, not by comparing neighbouring
// rows, because the duplicate in the sample data sits 79 rows from its original.
export function dedupeRows<Row extends { rowNumber: number }>(
  rows: Row[],
  sheet: SheetName,
  keyOf: (row: Row) => string,
): StepResult<Row> {
  const firstRowByKey = new Map<string, Row>();
  const issues: DataQualityIssue[] = [];

  for (const row of rows) {
    const key = keyOf(row);
    const firstRow = firstRowByKey.get(key);
    if (!firstRow) {
      firstRowByKey.set(key, row);
      continue;
    }

    if (contentOf(row) === contentOf(firstRow)) {
      issues.push({
        sheet,
        rowNumber: row.rowNumber,
        rule: "duplicate_row",
        severity: "info",
        actionTaken: "dropped",
        field: null,
        originalValue: key,
        correctedValue: null,
        message: `Exact duplicate of row ${firstRow.rowNumber}, dropped`,
      });
    } else {
      // Neither version can be proven right, so this is an error for a person to
      // review. The first row is kept so the series has no gap.
      issues.push({
        sheet,
        rowNumber: row.rowNumber,
        rule: "conflicting_duplicate_key",
        severity: "error",
        actionTaken: "rejected",
        field: null,
        originalValue: key,
        correctedValue: null,
        message: `Same key as row ${firstRow.rowNumber} with different values, kept row ${firstRow.rowNumber}`,
      });
    }
  }
  return { rows: [...firstRowByKey.values()], issues };
}

function contentOf(row: { rowNumber: number }): string {
  const { rowNumber, ...content } = row;
  return JSON.stringify(content);
}
