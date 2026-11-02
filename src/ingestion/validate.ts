import {
  BUSINESS_SHEET,
  MEDIA_SHEET,
  type DataQualityIssue,
  type NormalizedBusinessRow,
  type ParsedMediaRow,
  type ReferenceData,
  type SheetName,
  type StepResult,
} from "./types";

// These limits match the CHECK constraints in db/migrations/001_schema.sql.
// The pipeline checks them first so a bad row is logged rather than failing the load.
const MINIMUM_INDEX = 50;
const MAXIMUM_INDEX = 200;

export function validateBusinessRows(
  rows: NormalizedBusinessRow[],
  reference: ReferenceData,
): StepResult<NormalizedBusinessRow> {
  const validRows: NormalizedBusinessRow[] = [];
  const issues: DataQualityIssue[] = [];

  for (const row of rows) {
    const rowIssues = [
      ...checkCategory(BUSINESS_SHEET, row, "brand", row.brand, reference.brandIds),
      ...checkCategory(BUSINESS_SHEET, row, "market", row.market, reference.marketIds),
      ...checkMonday(BUSINESS_SHEET, row),
      ...checkNotNegative(BUSINESS_SHEET, row, "revenue", row.revenue),
      ...checkNotNegative(BUSINESS_SHEET, row, "units_sold", row.unitsSold),
      ...checkIndexRange(row, "price_index", row.priceIndex),
      ...checkIndexRange(row, "competitor_price_index", row.competitorPriceIndex),
      ...checkIndexRange(row, "economic_index", row.economicIndex),
      ...checkPercentage(row, "distribution_pct", row.distributionPct),
    ];
    issues.push(...rowIssues);
    if (rowIssues.length === 0) {
      validRows.push(row);
    }
  }
  issues.push(...checkPromotionPriceDrop(validRows));
  return { rows: validRows, issues };
}

export function validateMediaRows(
  rows: ParsedMediaRow[],
  reference: ReferenceData,
): StepResult<ParsedMediaRow> {
  const validRows: ParsedMediaRow[] = [];
  const issues: DataQualityIssue[] = [];

  for (const row of rows) {
    const rowIssues = [
      ...checkCategory(MEDIA_SHEET, row, "brand", row.brand, reference.brandIds),
      ...checkCategory(MEDIA_SHEET, row, "market", row.market, reference.marketIds),
      ...checkCategory(MEDIA_SHEET, row, "channel", row.channel, reference.channels),
      ...checkMonday(MEDIA_SHEET, row),
      ...checkNotNegative(MEDIA_SHEET, row, "media_spend", row.mediaSpend),
      ...checkNotNegative(MEDIA_SHEET, row, "impressions", row.impressions),
      ...checkNotNegative(MEDIA_SHEET, row, "clicks", row.clicks),
      ...checkNotNegative(MEDIA_SHEET, row, "tv_grps", row.tvGrps),
      ...checkClicksWithinImpressions(row),
      ...checkChannelMetrics(row, reference),
    ];
    issues.push(...rowIssues);
    if (rowIssues.length === 0) {
      validRows.push(row);
    }
  }
  return { rows: validRows, issues };
}

function rejection(
  sheet: SheetName,
  rowNumber: number,
  rule: string,
  field: string,
  originalValue: unknown,
  message: string,
): DataQualityIssue {
  return {
    sheet,
    rowNumber,
    rule,
    severity: "error",
    actionTaken: "rejected",
    field,
    originalValue: String(originalValue),
    correctedValue: null,
    message: `Row rejected: ${message}`,
  };
}

function checkCategory(
  sheet: SheetName,
  row: { rowNumber: number },
  field: string,
  value: string,
  allowedValues: Map<string, unknown>,
): DataQualityIssue[] {
  if (allowedValues.has(value)) {
    return [];
  }
  return [rejection(sheet, row.rowNumber, "unknown_category", field, value, `unknown ${field}`)];
}

function checkMonday(
  sheet: SheetName,
  row: { rowNumber: number; weekStart: string },
): DataQualityIssue[] {
  const MONDAY = 1;
  if (new Date(`${row.weekStart}T00:00:00Z`).getUTCDay() === MONDAY) {
    return [];
  }
  return [
    rejection(sheet, row.rowNumber, "week_not_monday", "week_start", row.weekStart, "week_start is not a Monday"),
  ];
}

function checkNotNegative(
  sheet: SheetName,
  row: { rowNumber: number },
  field: string,
  value: number | null,
): DataQualityIssue[] {
  if (value === null || value >= 0) {
    return [];
  }
  return [rejection(sheet, row.rowNumber, "negative_value", field, value, `${field} is negative`)];
}

function checkIndexRange(
  row: { rowNumber: number },
  field: string,
  value: number,
): DataQualityIssue[] {
  if (value >= MINIMUM_INDEX && value <= MAXIMUM_INDEX) {
    return [];
  }
  return [
    rejection(
      BUSINESS_SHEET,
      row.rowNumber,
      "index_out_of_range",
      field,
      value,
      `${field} is outside ${MINIMUM_INDEX} to ${MAXIMUM_INDEX}`,
    ),
  ];
}

function checkPercentage(
  row: { rowNumber: number },
  field: string,
  value: number | null,
): DataQualityIssue[] {
  if (value === null || (value >= 0 && value <= 100)) {
    return [];
  }
  return [
    rejection(BUSINESS_SHEET, row.rowNumber, "percentage_out_of_range", field, value, `${field} is outside 0 to 100`),
  ];
}

function checkClicksWithinImpressions(row: ParsedMediaRow): DataQualityIssue[] {
  if (row.clicks <= row.impressions) {
    return [];
  }
  return [
    rejection(MEDIA_SHEET, row.rowNumber, "clicks_exceed_impressions", "clicks", row.clicks, "clicks exceed impressions"),
  ];
}

// The database cannot enforce this rule because channel_type is in another table.
function checkChannelMetrics(row: ParsedMediaRow, reference: ReferenceData): DataQualityIssue[] {
  const channel = reference.channels.get(row.channel);
  if (!channel) {
    return [];
  }
  if (channel.channelType === "tv" && (row.impressions !== 0 || row.clicks !== 0)) {
    return [
      rejection(MEDIA_SHEET, row.rowNumber, "channel_metric_mismatch", "impressions", row.impressions, "TV row has impressions or clicks"),
    ];
  }
  if (channel.channelType === "digital" && row.tvGrps !== 0) {
    return [
      rejection(MEDIA_SHEET, row.rowNumber, "channel_metric_mismatch", "tv_grps", row.tvGrps, "digital row has GRPs"),
    ];
  }
  return [];
}

// Every numeric promotion in the sample cuts the price index on the week before.
// The row kept as true but with no price cut is reported, not changed: the flag
// may be right, but the promotion analysis should not take it on trust.
function checkPromotionPriceDrop(rows: NormalizedBusinessRow[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const previousRowBySeries = new Map<string, NormalizedBusinessRow>();
  const rowsByWeek = [...rows].sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  for (const row of rowsByWeek) {
    const series = `${row.brand}|${row.market}`;
    const previousRow = previousRowBySeries.get(series);
    if (row.isPromotion && previousRow && row.priceIndex >= previousRow.priceIndex) {
      issues.push({
        sheet: BUSINESS_SHEET,
        rowNumber: row.rowNumber,
        rule: "promotion_without_price_drop",
        severity: "warning",
        actionTaken: "reported",
        field: "promotion_flag",
        originalValue: "true",
        correctedValue: null,
        message: `Marked as a promotion, but price_index did not fall (${previousRow.priceIndex} to ${row.priceIndex})`,
      });
    }
    previousRowBySeries.set(series, row);
  }
  return issues;
}
