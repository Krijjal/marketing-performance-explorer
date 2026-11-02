import {
  BUSINESS_SHEET,
  MEDIA_SHEET,
  type DataQualityIssue,
  type NormalizedBusinessRow,
  type ParsedBusinessRow,
  type ParsedMediaRow,
  type ReferenceData,
  type SheetName,
  type StepResult,
} from "./types";

const TRUE_TEXT_VALUES = new Set(["yes", "true"]);
const FALSE_TEXT_VALUES = new Set(["no", "false"]);

export function normalizeBusinessRows(
  rows: ParsedBusinessRow[],
  reference: ReferenceData,
): StepResult<NormalizedBusinessRow> {
  const normalizedRows: NormalizedBusinessRow[] = [];
  const issues: DataQualityIssue[] = [];

  for (const row of rows) {
    const { promotionFlag, ...otherFields } = row;
    const isPromotion = parsePromotionFlag(promotionFlag);
    if (isPromotion === null) {
      issues.push({
        sheet: BUSINESS_SHEET,
        rowNumber: row.rowNumber,
        rule: "invalid_promotion_flag",
        severity: "error",
        actionTaken: "rejected",
        field: "promotion_flag",
        originalValue: String(promotionFlag),
        correctedValue: null,
        message: "Row rejected: promotion_flag cannot be read as true or false",
      });
      continue;
    }
    if (typeof promotionFlag === "string") {
      issues.push({
        sheet: BUSINESS_SHEET,
        rowNumber: row.rowNumber,
        rule: "promotion_flag_normalized",
        severity: "info",
        actionTaken: "normalized",
        field: "promotion_flag",
        originalValue: promotionFlag,
        correctedValue: String(isPromotion),
        message: "Text promotion_flag converted to boolean",
      });
    }
    const brand = canonicalName(row.brand, [...reference.brandIds.keys()]);
    const market = canonicalName(row.market, [...reference.marketIds.keys()]);
    issues.push(...categoryIssues(BUSINESS_SHEET, row.rowNumber, "brand", row.brand, brand));
    issues.push(...categoryIssues(BUSINESS_SHEET, row.rowNumber, "market", row.market, market));
    normalizedRows.push({ ...otherFields, brand, market, isPromotion });
  }
  return { rows: normalizedRows, issues };
}

export function normalizeMediaRows(
  rows: ParsedMediaRow[],
  reference: ReferenceData,
): StepResult<ParsedMediaRow> {
  const normalizedRows: ParsedMediaRow[] = [];
  const issues: DataQualityIssue[] = [];

  for (const row of rows) {
    const brand = canonicalName(row.brand, [...reference.brandIds.keys()]);
    const market = canonicalName(row.market, [...reference.marketIds.keys()]);
    const channel = canonicalName(row.channel, [...reference.channels.keys()]);
    issues.push(...categoryIssues(MEDIA_SHEET, row.rowNumber, "brand", row.brand, brand));
    issues.push(...categoryIssues(MEDIA_SHEET, row.rowNumber, "market", row.market, market));
    issues.push(...categoryIssues(MEDIA_SHEET, row.rowNumber, "channel", row.channel, channel));
    normalizedRows.push({ ...row, brand, market, channel });
  }
  return { rows: normalizedRows, issues };
}

function parsePromotionFlag(flag: number | string): boolean | null {
  if (flag === 1) {
    return true;
  }
  if (flag === 0) {
    return false;
  }
  if (typeof flag === "string") {
    const text = flag.trim().toLowerCase();
    if (TRUE_TEXT_VALUES.has(text)) {
      return true;
    }
    if (FALSE_TEXT_VALUES.has(text)) {
      return false;
    }
  }
  return null;
}

// An unmatched value is returned unchanged, so validation can reject it as unknown.
function canonicalName(value: string, allowedNames: string[]): string {
  const comparableValue = value.trim().toLowerCase();
  return allowedNames.find((name) => name.toLowerCase() === comparableValue) ?? value;
}

function categoryIssues(
  sheet: SheetName,
  rowNumber: number,
  field: string,
  originalValue: string,
  canonicalValue: string,
): DataQualityIssue[] {
  if (originalValue === canonicalValue) {
    return [];
  }
  return [
    {
      sheet,
      rowNumber,
      rule: "category_normalized",
      severity: "info",
      actionTaken: "normalized",
      field,
      originalValue,
      correctedValue: canonicalValue,
      message: `${field} changed to its canonical name`,
    },
  ];
}
