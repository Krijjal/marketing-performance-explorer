import type pg from "pg";
import { readDate, type FilterOptions, type Filters, type SearchParams } from "./filters";

const MILLISECONDS_PER_WEEK = 7 * 86_400_000;

export interface Period {
  startDate: string;
  endDate: string;
}

export interface ComparisonPeriods {
  periodA: Period;
  periodB: Period;
}

export interface PeriodSummary {
  weeks: number;
  revenuePerWeek: number | null;
  unitsPerWeek: number | null;
  spendPerWeek: number | null;
  roas: number | null;
  promotionShare: number | null;
  priceGap: number | null;
  distributionPct: number | null;
  imputedValues: number;
  spendPerWeekByChannel: Map<string, number>;
}

export interface MetricChange {
  label: string;
  periodA: number | null;
  periodB: number | null;
  percentChange: number | null;
}

// "with" means the driver moved the way that would normally push revenue in the
// direction it actually went. It is a consistency check, not a measured effect.
export type DriverAlignment = "with" | "against" | "flat" | "unknown";

export interface DriverChange {
  label: string;
  unit: "percent" | "points" | "number";
  periodA: number | null;
  periodB: number | null;
  change: number | null;
  alignment: DriverAlignment;
}

export interface PeriodComparison {
  metrics: MetricChange[];
  drivers: DriverChange[];
}

// Defaults to the data split in half, so the page is useful before any input.
export function parseComparisonPeriods(
  params: SearchParams,
  options: FilterOptions,
): ComparisonPeriods {
  const firstTime = Date.parse(options.firstWeek);
  const totalWeeks = (Date.parse(options.lastWeek) - firstTime) / MILLISECONDS_PER_WEEK + 1;
  const weeksInPeriodA = Math.floor(totalWeeks / 2);
  const defaultEndA = toIsoDate(firstTime + (weeksInPeriodA - 1) * MILLISECONDS_PER_WEEK);
  const defaultStartB = toIsoDate(firstTime + weeksInPeriodA * MILLISECONDS_PER_WEEK);

  return {
    periodA: readPeriod(params.aStart, params.aEnd, {
      startDate: options.firstWeek,
      endDate: defaultEndA,
    }),
    periodB: readPeriod(params.bStart, params.bEnd, {
      startDate: defaultStartB,
      endDate: options.lastWeek,
    }),
  };
}

function readPeriod(
  start: string | string[] | undefined,
  end: string | string[] | undefined,
  fallback: Period,
): Period {
  const startDate = readDate(start) ?? fallback.startDate;
  const endDate = readDate(end) ?? fallback.endDate;
  return startDate <= endDate ? { startDate, endDate } : fallback;
}

function toIsoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export async function getPeriodSummary(
  pool: pg.Pool,
  period: Period,
  filters: Filters,
): Promise<PeriodSummary> {
  const scope = [period.startDate, period.endDate, filters.brand, filters.market];

  // Price gap is price minus competitor price: a lower gap means better relative
  // value. Averages weight each brand-market week equally, not by revenue, so
  // that they stay simple to explain.
  const summary = await pool.query<{
    weeks: number;
    revenue: number | null;
    units_sold: number | null;
    promotion_share: number | null;
    price_gap: number | null;
    distribution_pct: number | null;
    imputed_distribution_values: number;
  }>(
    `SELECT
       count(DISTINCT week_start)::int AS weeks,
       sum(revenue)::float8 AS revenue,
       sum(units_sold)::float8 AS units_sold,
       avg(CASE WHEN is_promotion THEN 1 ELSE 0 END)::float8 AS promotion_share,
       avg(price_index - competitor_price_index)::float8 AS price_gap,
       avg(distribution_pct)::float8 AS distribution_pct,
       (count(*) FILTER (WHERE distribution_is_imputed))::int AS imputed_distribution_values
     FROM v_business_weekly
     WHERE week_start BETWEEN $1::date AND $2::date
       AND ($3::text IS NULL OR brand = $3)
       AND ($4::text IS NULL OR market = $4)`,
    scope,
  );
  const media = await pool.query<{
    channel: string;
    media_spend: number;
    imputed_spend_values: number;
  }>(
    `SELECT
       channel,
       sum(media_spend)::float8 AS media_spend,
       (count(*) FILTER (WHERE spend_is_imputed))::int AS imputed_spend_values
     FROM v_media_detail
     WHERE week_start BETWEEN $1::date AND $2::date
       AND ($3::text IS NULL OR brand = $3)
       AND ($4::text IS NULL OR market = $4)
       AND ($5::text IS NULL OR channel = $5)
     GROUP BY channel
     ORDER BY channel`,
    [...scope, filters.channel],
  );

  const row = summary.rows[0]!;
  const totalSpend = media.rows.reduce((total, channel) => total + channel.media_spend, 0);
  const perWeek = (total: number | null) => (total === null || row.weeks === 0 ? null : total / row.weeks);
  const roasIsMeaningful = filters.channel === null && row.revenue !== null && totalSpend > 0;

  return {
    weeks: row.weeks,
    revenuePerWeek: perWeek(row.revenue),
    unitsPerWeek: perWeek(row.units_sold),
    spendPerWeek: perWeek(totalSpend),
    roas: roasIsMeaningful ? row.revenue! / totalSpend : null,
    promotionShare: row.promotion_share,
    priceGap: row.price_gap,
    distributionPct: row.distribution_pct,
    imputedValues:
      row.imputed_distribution_values +
      media.rows.reduce((total, channel) => total + channel.imputed_spend_values, 0),
    spendPerWeekByChannel: new Map(
      media.rows.map((channel) => [channel.channel, perWeek(channel.media_spend) ?? 0]),
    ),
  };
}

export function comparePeriods(periodA: PeriodSummary, periodB: PeriodSummary): PeriodComparison {
  const metrics = [
    metricChange("Revenue per week", periodA.revenuePerWeek, periodB.revenuePerWeek),
    metricChange("Units per week", periodA.unitsPerWeek, periodB.unitsPerWeek),
    metricChange("Media spend per week", periodA.spendPerWeek, periodB.spendPerWeek),
    metricChange("ROAS", periodA.roas, periodB.roas),
  ];

  const revenueChange = difference(periodA.revenuePerWeek, periodB.revenuePerWeek);
  const driver = (
    label: string,
    unit: DriverChange["unit"],
    valueA: number | null,
    valueB: number | null,
    higherRaisesRevenue: boolean,
  ): DriverChange => {
    const change = difference(valueA, valueB);
    return {
      label,
      unit,
      periodA: valueA,
      periodB: valueB,
      change,
      alignment: alignmentOf(change, revenueChange, higherRaisesRevenue),
    };
  };

  const channels = [
    ...new Set([...periodA.spendPerWeekByChannel.keys(), ...periodB.spendPerWeekByChannel.keys()]),
  ];
  return {
    metrics,
    drivers: [
      driver("Weeks on promotion", "percent", periodA.promotionShare, periodB.promotionShare, true),
      driver("Price index minus competitor", "points", periodA.priceGap, periodB.priceGap, false),
      driver("Distribution", "points", periodA.distributionPct, periodB.distributionPct, true),
      ...channels.map((channel) =>
        driver(
          `${channel} spend per week`,
          "number",
          periodA.spendPerWeekByChannel.get(channel) ?? 0,
          periodB.spendPerWeekByChannel.get(channel) ?? 0,
          true,
        ),
      ),
    ],
  };
}

function difference(valueA: number | null, valueB: number | null): number | null {
  return valueA === null || valueB === null ? null : valueB - valueA;
}

function metricChange(
  label: string,
  periodA: number | null,
  periodB: number | null,
): MetricChange {
  const percentChange =
    periodA === null || periodB === null || periodA === 0 ? null : (periodB - periodA) / periodA;
  return { label, periodA, periodB, percentChange };
}

function alignmentOf(
  driverChange: number | null,
  revenueChange: number | null,
  higherRaisesRevenue: boolean,
): DriverAlignment {
  if (driverChange === null || revenueChange === null || revenueChange === 0) {
    return "unknown";
  }
  if (driverChange === 0) {
    return "flat";
  }
  const pushesRevenueUp = driverChange > 0 === higherRaisesRevenue;
  return pushesRevenueUp === revenueChange > 0 ? "with" : "against";
}
