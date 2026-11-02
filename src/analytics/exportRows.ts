import type pg from "pg";
import type { Filters } from "./filters";

type CsvValue = string | number | boolean | null;

// One row per week, brand and market. A channel-level export would have to repeat
// revenue on every channel row, and anyone summing that column would overcount it.
export async function getExportRows(
  pool: pg.Pool,
  filters: Filters,
): Promise<Record<string, CsvValue>[]> {
  const result = await pool.query<Record<string, CsvValue>>(
    `WITH media AS (
       SELECT week_start, brand, market,
              sum(media_spend) AS media_spend,
              bool_or(spend_is_imputed) AS spend_is_imputed
       FROM v_media_detail
       WHERE ($5::text IS NULL OR channel = $5)
       GROUP BY week_start, brand, market
     )
     SELECT
       business.week_start::text AS week_start,
       business.brand,
       business.market,
       COALESCE($5::text, 'All channels') AS media_channel,
       business.revenue::float8 AS revenue,
       business.units_sold,
       media.media_spend::float8 AS media_spend,
       COALESCE(media.spend_is_imputed, false) AS spend_is_imputed,
       business.is_promotion,
       business.price_index::float8 AS price_index,
       business.competitor_price_index::float8 AS competitor_price_index,
       business.distribution_pct::float8 AS distribution_pct,
       business.distribution_is_imputed,
       business.economic_index::float8 AS economic_index
     FROM v_business_weekly business
     LEFT JOIN media
       ON media.week_start = business.week_start
      AND media.brand = business.brand
      AND media.market = business.market
     WHERE business.week_start BETWEEN $1::date AND $2::date
       AND ($3::text IS NULL OR business.brand = $3)
       AND ($4::text IS NULL OR business.market = $4)
     ORDER BY business.week_start, business.brand, business.market`,
    [filters.startDate, filters.endDate, filters.brand, filters.market, filters.channel],
  );
  return result.rows;
}

export function toCsv(rows: Record<string, CsvValue>[]): string {
  const firstRow = rows[0];
  if (!firstRow) {
    return "";
  }
  const headers = Object.keys(firstRow);
  const lines = rows.map((row) => headers.map((header) => csvCell(row[header] ?? null)).join(","));
  return [headers.join(","), ...lines].join("\n");
}

function csvCell(value: CsvValue): string {
  if (value === null) {
    return "";
  }
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
