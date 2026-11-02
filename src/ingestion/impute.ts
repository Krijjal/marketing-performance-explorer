import {
  BUSINESS_SHEET,
  MEDIA_SHEET,
  type CleanBusinessRow,
  type CleanMediaRow,
  type DataQualityIssue,
  type NormalizedBusinessRow,
  type ParsedMediaRow,
  type SheetName,
  type StepResult,
} from "./types";

interface KnownPoint {
  weekStart: string;
  value: number;
}

// Linear between the nearest known weeks on each side, weighted by distance in
// time. Returns null at the edge of a series: extrapolating would be a guess
// about a trend, whereas interpolating stays between two real values.
export function interpolate(weekStart: string, knownPoints: KnownPoint[]): number | null {
  const before = knownPoints
    .filter((point) => point.weekStart < weekStart)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  const after = knownPoints
    .filter((point) => point.weekStart > weekStart)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))[0];
  if (!before || !after) {
    return null;
  }

  const beforeTime = Date.parse(before.weekStart);
  const progress = (Date.parse(weekStart) - beforeTime) / (Date.parse(after.weekStart) - beforeTime);
  const value = before.value + (after.value - before.value) * progress;
  return Math.round(value * 100) / 100;
}

export function imputeBusinessRows(rows: NormalizedBusinessRow[]): StepResult<CleanBusinessRow> {
  const cleanRows: CleanBusinessRow[] = [];
  const issues: DataQualityIssue[] = [];

  for (const row of rows) {
    if (row.distributionPct !== null) {
      cleanRows.push({ ...row, distributionPct: row.distributionPct, distributionIsImputed: false });
      continue;
    }
    const knownPoints = rows.flatMap((other) =>
      other.brand === row.brand && other.market === row.market && other.distributionPct !== null
        ? [{ weekStart: other.weekStart, value: other.distributionPct }]
        : [],
    );
    const estimate = interpolate(row.weekStart, knownPoints);
    issues.push(imputationIssue(BUSINESS_SHEET, row.rowNumber, "distribution_pct", estimate));
    if (estimate !== null) {
      cleanRows.push({ ...row, distributionPct: estimate, distributionIsImputed: true });
    }
  }
  return { rows: cleanRows, issues };
}

export function imputeMediaRows(rows: ParsedMediaRow[]): StepResult<CleanMediaRow> {
  const cleanRows: CleanMediaRow[] = [];
  const issues: DataQualityIssue[] = [];

  for (const row of rows) {
    if (row.mediaSpend !== null) {
      cleanRows.push({ ...row, mediaSpend: row.mediaSpend, spendIsImputed: false });
      continue;
    }
    const knownPoints = rows.flatMap((other) =>
      other.brand === row.brand &&
      other.market === row.market &&
      other.channel === row.channel &&
      other.mediaSpend !== null
        ? [{ weekStart: other.weekStart, value: other.mediaSpend }]
        : [],
    );
    const estimate = interpolate(row.weekStart, knownPoints);
    issues.push(imputationIssue(MEDIA_SHEET, row.rowNumber, "media_spend", estimate));
    if (estimate !== null) {
      cleanRows.push({ ...row, mediaSpend: estimate, spendIsImputed: true });
    }
  }
  return { rows: cleanRows, issues };
}

function imputationIssue(
  sheet: SheetName,
  rowNumber: number,
  field: string,
  estimate: number | null,
): DataQualityIssue {
  if (estimate === null) {
    return {
      sheet,
      rowNumber,
      rule: "not_imputable",
      severity: "error",
      actionTaken: "rejected",
      field,
      originalValue: null,
      correctedValue: null,
      message: `Row rejected: ${field} is missing and has no known value on both sides`,
    };
  }
  return {
    sheet,
    rowNumber,
    rule: "missing_value_imputed",
    severity: "warning",
    actionTaken: "imputed",
    field,
    originalValue: null,
    correctedValue: String(estimate),
    message: `${field} was missing, interpolated from neighbouring weeks of the same series`,
  };
}
