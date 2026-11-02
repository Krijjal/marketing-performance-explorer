import type pg from "pg";
import type { Filters } from "./filters";

export interface Kpis {
  revenue: number;
  unitsSold: number;
  mediaSpend: number;
  roas: number | null;
  cpc: number | null;
  ctr: number | null;
  imputedSpendValues: number;
  imputedDistributionValues: number;
}

// Revenue has no channel level, so the channel filter applies to media only and
// ROAS is NULL under it: dividing all revenue by one channel's spend would credit
// that channel with sales it did not earn.
// CPC and CTR use channel_type = 'digital' explicitly, so TV can never enter them.
const KPI_SQL = `
  WITH business AS (
    SELECT
      COALESCE(sum(revenue), 0) AS revenue,
      COALESCE(sum(units_sold), 0) AS units_sold,
      count(*) FILTER (WHERE distribution_is_imputed) AS imputed_distribution_values
    FROM v_business_weekly
    WHERE week_start BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR brand = $3)
      AND ($4::text IS NULL OR market = $4)
  ),
  media AS (
    SELECT
      COALESCE(sum(media_spend), 0) AS media_spend,
      sum(media_spend) FILTER (WHERE channel_type = 'digital') AS digital_spend,
      sum(clicks) FILTER (WHERE channel_type = 'digital') AS digital_clicks,
      sum(impressions) FILTER (WHERE channel_type = 'digital') AS digital_impressions,
      count(*) FILTER (WHERE spend_is_imputed) AS imputed_spend_values
    FROM v_media_detail
    WHERE week_start BETWEEN $1::date AND $2::date
      AND ($3::text IS NULL OR brand = $3)
      AND ($4::text IS NULL OR market = $4)
      AND ($5::text IS NULL OR channel = $5)
  )
  SELECT
    business.revenue::float8 AS revenue,
    business.units_sold::float8 AS units_sold,
    media.media_spend::float8 AS media_spend,
    CASE WHEN $5::text IS NULL
      THEN (business.revenue / NULLIF(media.media_spend, 0))::float8
    END AS roas,
    (media.digital_spend / NULLIF(media.digital_clicks, 0))::float8 AS cpc,
    (media.digital_clicks::numeric / NULLIF(media.digital_impressions, 0))::float8 AS ctr,
    media.imputed_spend_values::int AS imputed_spend_values,
    business.imputed_distribution_values::int AS imputed_distribution_values
  FROM business CROSS JOIN media
`;

interface KpiRow {
  revenue: number;
  units_sold: number;
  media_spend: number;
  roas: number | null;
  cpc: number | null;
  ctr: number | null;
  imputed_spend_values: number;
  imputed_distribution_values: number;
}

export async function getKpis(pool: pg.Pool, filters: Filters): Promise<Kpis> {
  const result = await pool.query<KpiRow>(KPI_SQL, [
    filters.startDate,
    filters.endDate,
    filters.brand,
    filters.market,
    filters.channel,
  ]);
  const row = result.rows[0]!;
  return {
    revenue: row.revenue,
    unitsSold: row.units_sold,
    mediaSpend: row.media_spend,
    roas: row.roas,
    cpc: row.cpc,
    ctr: row.ctr,
    imputedSpendValues: row.imputed_spend_values,
    imputedDistributionValues: row.imputed_distribution_values,
  };
}
