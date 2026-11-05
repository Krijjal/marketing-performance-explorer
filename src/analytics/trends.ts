import type pg from "pg";
import type { Filters } from "./filters";

export interface WeeklyTrendPoint {
  weekStart: string;
  revenue: number;
  unitsSold: number;
  mediaSpend: number | null;
  spendIsImputed: boolean;
  // Digital rows only, so a week's CPC and CTR never include TV.
  digitalSpend: number | null;
  clicks: number | null;
  impressions: number | null;
}

export interface ChannelWeekPoint {
  weekStart: string;
  channel: string;
  mediaSpend: number;
  spendIsImputed: boolean;
}

export interface ChannelSummary {
  channel: string;
  channelType: "tv" | "digital";
  mediaSpend: number;
  spendShare: number;
  cpc: number | null;
  ctr: number | null;
  costPerGrp: number | null;
}

function filterValues(filters: Filters): (string | null)[] {
  return [filters.startDate, filters.endDate, filters.brand, filters.market, filters.channel];
}

// Each side is grouped to one row per week before the join. Joining the channel
// rows directly would repeat each week's revenue once per channel.
export async function getWeeklyTrend(pool: pg.Pool, filters: Filters): Promise<WeeklyTrendPoint[]> {
  const result = await pool.query<{
    week_start: string;
    revenue: number;
    units_sold: number;
    media_spend: number | null;
    spend_is_imputed: boolean;
    digital_spend: number | null;
    clicks: number | null;
    impressions: number | null;
  }>(
    `WITH business AS (
       SELECT week_start, sum(revenue) AS revenue, sum(units_sold) AS units_sold
       FROM v_business_weekly
       WHERE week_start BETWEEN $1::date AND $2::date
         AND ($3::text IS NULL OR brand = $3)
         AND ($4::text IS NULL OR market = $4)
       GROUP BY week_start
     ),
     media AS (
       SELECT
         week_start,
         sum(media_spend) AS media_spend,
         bool_or(spend_is_imputed) AS spend_is_imputed,
         sum(media_spend) FILTER (WHERE channel_type = 'digital') AS digital_spend,
         sum(clicks) FILTER (WHERE channel_type = 'digital') AS clicks,
         sum(impressions) FILTER (WHERE channel_type = 'digital') AS impressions
       FROM v_media_detail
       WHERE week_start BETWEEN $1::date AND $2::date
         AND ($3::text IS NULL OR brand = $3)
         AND ($4::text IS NULL OR market = $4)
         AND ($5::text IS NULL OR channel = $5)
       GROUP BY week_start
     )
     SELECT
       business.week_start::text AS week_start,
       business.revenue::float8 AS revenue,
       business.units_sold::float8 AS units_sold,
       media.media_spend::float8 AS media_spend,
       COALESCE(media.spend_is_imputed, false) AS spend_is_imputed,
       media.digital_spend::float8 AS digital_spend,
       media.clicks::float8 AS clicks,
       media.impressions::float8 AS impressions
     FROM business
     LEFT JOIN media ON media.week_start = business.week_start
     ORDER BY business.week_start`,
    filterValues(filters),
  );

  return result.rows.map((row) => ({
    weekStart: row.week_start,
    revenue: row.revenue,
    unitsSold: row.units_sold,
    mediaSpend: row.media_spend,
    spendIsImputed: row.spend_is_imputed,
    digitalSpend: row.digital_spend,
    clicks: row.clicks,
    impressions: row.impressions,
  }));
}

export async function getSpendByChannel(
  pool: pg.Pool,
  filters: Filters,
): Promise<ChannelWeekPoint[]> {
  const result = await pool.query<{
    week_start: string;
    channel: string;
    media_spend: number;
    spend_is_imputed: boolean;
  }>(
    `SELECT
       week_start::text AS week_start,
       channel,
       sum(media_spend)::float8 AS media_spend,
       bool_or(spend_is_imputed) AS spend_is_imputed
     FROM v_media_detail
     WHERE week_start BETWEEN $1::date AND $2::date
       AND ($3::text IS NULL OR brand = $3)
       AND ($4::text IS NULL OR market = $4)
       AND ($5::text IS NULL OR channel = $5)
     GROUP BY week_start, channel
     ORDER BY week_start, channel`,
    filterValues(filters),
  );

  return result.rows.map((row) => ({
    weekStart: row.week_start,
    channel: row.channel,
    mediaSpend: row.media_spend,
    spendIsImputed: row.spend_is_imputed,
  }));
}

export async function getChannelSummaries(
  pool: pg.Pool,
  filters: Filters,
): Promise<ChannelSummary[]> {
  const result = await pool.query<{
    channel: string;
    channel_type: "tv" | "digital";
    media_spend: number;
    spend_share: number;
    cpc: number | null;
    ctr: number | null;
    cost_per_grp: number | null;
  }>(
    `SELECT
       channel,
       channel_type,
       sum(media_spend)::float8 AS media_spend,
       (sum(media_spend) / sum(sum(media_spend)) OVER ())::float8 AS spend_share,
       CASE WHEN channel_type = 'digital'
         THEN (sum(media_spend) / NULLIF(sum(clicks), 0))::float8
       END AS cpc,
       CASE WHEN channel_type = 'digital'
         THEN (sum(clicks)::numeric / NULLIF(sum(impressions), 0))::float8
       END AS ctr,
       CASE WHEN channel_type = 'tv'
         THEN (sum(media_spend) / NULLIF(sum(tv_grps), 0))::float8
       END AS cost_per_grp
     FROM v_media_detail
     WHERE week_start BETWEEN $1::date AND $2::date
       AND ($3::text IS NULL OR brand = $3)
       AND ($4::text IS NULL OR market = $4)
       AND ($5::text IS NULL OR channel = $5)
     GROUP BY channel, channel_type
     ORDER BY channel`,
    filterValues(filters),
  );

  return result.rows.map((row) => ({
    channel: row.channel,
    channelType: row.channel_type,
    mediaSpend: row.media_spend,
    spendShare: row.spend_share,
    cpc: row.cpc,
    ctr: row.ctr,
    costPerGrp: row.cost_per_grp,
  }));
}
