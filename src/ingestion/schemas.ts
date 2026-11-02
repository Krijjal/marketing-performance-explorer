import { z } from "zod";
import {
  BUSINESS_SHEET,
  MEDIA_SHEET,
  type DataQualityIssue,
  type ParsedBusinessRow,
  type ParsedMediaRow,
  type SheetName,
  type SourceRow,
  type StepResult,
} from "./types";

const MILLISECONDS_PER_DAY = 86_400_000;
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

// Excel stores dates as a day count. Converting in UTC avoids the off-by-one
// days that a local-time Date would produce in timezones behind or ahead of UTC.
export function excelSerialToIsoDate(serial: number): string {
  return new Date(EXCEL_EPOCH_UTC + serial * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

const weekStartSchema = z.number().int().positive().transform(excelSerialToIsoDate);

const businessRowSchema = z
  .object({
    week_start: weekStartSchema,
    brand: z.string().min(1),
    market: z.string().min(1),
    revenue: z.number(),
    units_sold: z.number().int(),
    promotion_flag: z.union([z.number(), z.string()]),
    price_index: z.number(),
    distribution_pct: z.number().nullable(),
    competitor_price_index: z.number(),
    economic_index: z.number(),
  })
  .transform((row) => ({
    weekStart: row.week_start,
    brand: row.brand,
    market: row.market,
    revenue: row.revenue,
    unitsSold: row.units_sold,
    promotionFlag: row.promotion_flag,
    priceIndex: row.price_index,
    distributionPct: row.distribution_pct,
    competitorPriceIndex: row.competitor_price_index,
    economicIndex: row.economic_index,
  }));

const mediaRowSchema = z
  .object({
    week_start: weekStartSchema,
    brand: z.string().min(1),
    market: z.string().min(1),
    channel: z.string().min(1),
    media_spend: z.number().nullable(),
    impressions: z.number().int(),
    clicks: z.number().int(),
    tv_grps: z.number(),
  })
  .transform((row) => ({
    weekStart: row.week_start,
    brand: row.brand,
    market: row.market,
    channel: row.channel,
    mediaSpend: row.media_spend,
    impressions: row.impressions,
    clicks: row.clicks,
    tvGrps: row.tv_grps,
  }));

export function parseBusinessRows(sourceRows: SourceRow[]): StepResult<ParsedBusinessRow> {
  return parseRows(sourceRows, businessRowSchema, BUSINESS_SHEET);
}

export function parseMediaRows(sourceRows: SourceRow[]): StepResult<ParsedMediaRow> {
  return parseRows(sourceRows, mediaRowSchema, MEDIA_SHEET);
}

function parseRows<Output>(
  sourceRows: SourceRow[],
  schema: z.ZodType<Output>,
  sheet: SheetName,
): StepResult<Output & { rowNumber: number }> {
  const rows: (Output & { rowNumber: number })[] = [];
  const issues: DataQualityIssue[] = [];

  for (const sourceRow of sourceRows) {
    const result = schema.safeParse(sourceRow.values);
    if (result.success) {
      rows.push({ ...result.data, rowNumber: sourceRow.rowNumber });
      continue;
    }
    for (const zodIssue of result.error.issues) {
      const field = zodIssue.path.join(".");
      issues.push({
        sheet,
        rowNumber: sourceRow.rowNumber,
        rule: "invalid_value",
        severity: "error",
        actionTaken: "rejected",
        field,
        originalValue: String(sourceRow.values[field]),
        correctedValue: null,
        message: `Row rejected: ${field} ${zodIssue.message}`,
      });
    }
  }
  return { rows, issues };
}
