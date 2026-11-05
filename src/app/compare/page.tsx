import { getFilterOptions, parseFilters, toQueryString, type SearchParams } from "../../analytics/filters";
import {
  comparePeriods,
  getPeriodSummary,
  parseComparisonPeriods,
} from "../../analytics/periodComparison";
import { getWeeklyTrend } from "../../analytics/trends";
import { ChangeBadge, driverTone, toneFor } from "../../components/ChangeBadge";
import { DriverList, PairBars, PeriodTag } from "../../components/Comparison";
import { ComparisonChart, type ChartPeriod } from "../../components/ComparisonChart";
import { ApplyButton, CategoryFields, DateField, FILTER_FORM_CLASS, Phrase } from "../../components/Filters";
import { formatDate, formatDecimal, formatNumber, pluralize } from "../../components/format";
import { KpiCard, KpiLedger } from "../../components/KpiCard";
import { NoDataYet, Notice, NoticeStack } from "../../components/Notice";
import { PageShell } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { getAppPool } from "../../db/appPool";

// Every page reads the database per request, so none of them can be prerendered at build time.
export const dynamic = "force-dynamic";

// Media spend is neither good nor bad on its own, so its change stays neutral.
const HIGHER_IS_BETTER: Record<string, boolean | null> = {
  "Revenue per week": true,
  "Units per week": true,
  "Media spend per week": null,
  ROAS: true,
};

// Whole numbers for the weekly totals, two decimals for ROAS, where they matter.
function formatMetric(label: string, value: number | null): string {
  return label === "ROAS" ? formatDecimal(value) : formatNumber(value);
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const pool = getAppPool();
  const options = await getFilterOptions(pool);
  if (!options) {
    return <NoDataYet />;
  }

  const params = await searchParams;
  const filters = parseFilters(params, options);
  const { periodA, periodB } = parseComparisonPeriods(params, options);
  const chartStart = periodA.startDate < periodB.startDate ? periodA.startDate : periodB.startDate;
  const chartEnd = periodA.endDate > periodB.endDate ? periodA.endDate : periodB.endDate;
  const [summaryA, summaryB, weeklyTrend] = await Promise.all([
    getPeriodSummary(pool, periodA, filters),
    getPeriodSummary(pool, periodB, filters),
    getWeeklyTrend(pool, { ...filters, startDate: chartStart, endDate: chartEnd }),
  ]);
  const { metrics, drivers } = comparePeriods(summaryA, summaryB);
  const revenue = metrics[0]!;
  const revenueChange = revenue.percentChange;
  const imputedValues = summaryA.imputedValues + summaryB.imputedValues;

  // The chart shades the weeks actually in each period, so a range that starts
  // mid-week still lines up with the points.
  const chartPeriod = (startDate: string, endDate: string, revenuePerWeek: number | null): ChartPeriod | null => {
    const inside = weeklyTrend.filter((week) => week.weekStart >= startDate && week.weekStart <= endDate);
    return inside.length === 0
      ? null
      : { firstWeek: inside[0]!.weekStart, lastWeek: inside.at(-1)!.weekStart, revenuePerWeek };
  };

  const direction =
    revenueChange === null ? null : revenueChange > 0 ? "rose" : revenueChange < 0 ? "fell" : "held steady";
  const periodText = (period: typeof periodA) => `${formatDate(period.startDate)} to ${formatDate(period.endDate)}`;

  return (
    <PageShell
      currentPath="/compare"
      title="Compare periods"
      query={toQueryString(filters)}
      description="Two periods side by side, in values per week so periods of different lengths compare fairly, with the movements that usually drive revenue."
    >
      <form method="get" className={FILTER_FORM_CLASS}>
        <input type="hidden" name="start" value={filters.startDate} />
        <input type="hidden" name="end" value={filters.endDate} />
        <Phrase>
          <PeriodTag period="A" />
          <DateField label="Period A from" name="aStart" value={periodA.startDate} options={options} />
          <span>to</span>
          <DateField label="Period A to" name="aEnd" value={periodA.endDate} options={options} />
        </Phrase>
        <Phrase>
          <span>against</span>
          <PeriodTag period="B" />
          <DateField label="Period B from" name="bStart" value={periodB.startDate} options={options} />
          <span>to</span>
          <DateField label="Period B to" name="bEnd" value={periodB.endDate} options={options} />
        </Phrase>
        <CategoryFields lead="for" filters={filters} options={options} />
        <ApplyButton />
      </form>

      <NoticeStack>
        <Notice>
          This compares movements side by side. It shows correlation, not causation: period A has{" "}
          {pluralize(summaryA.weeks, "week", "weeks")} of data and period B has {summaryB.weeks}, and these factors
          often move together.
        </Notice>
        {imputedValues > 0 && (
          <Notice>These periods include {pluralize(imputedValues, "imputed value", "imputed values")}.</Notice>
        )}
      </NoticeStack>

      <section aria-label="Headline" className="flex flex-col gap-6">
        {direction && (
          <p className="max-w-4xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Revenue per week {direction}{" "}
            <span className={revenueChange! > 0 ? "text-good" : revenueChange! < 0 ? "text-bad" : ""}>
              {Math.abs(revenueChange! * 100).toFixed(1)}%
            </span>
            , from {formatNumber(revenue.periodA)} in period A to {formatNumber(revenue.periodB)} in period B.
          </p>
        )}
        <KpiLedger label="Period B against period A" columns={4}>
          {metrics.map((metric) => (
            <KpiCard
              key={metric.label}
              label={metric.label}
              value={formatMetric(metric.label, metric.periodB)}
              change={
                <>
                  <ChangeBadge
                    change={metric.percentChange}
                    format="percent"
                    tone={toneFor(metric.percentChange, HIGHER_IS_BETTER[metric.label] ?? null)}
                    label={metric.label}
                  />
                  <span className="text-xs text-ink-soft">vs period A</span>
                </>
              }
              chart={
                <PairBars
                  valueA={metric.periodA}
                  valueB={metric.periodB}
                  format={(value) => formatMetric(metric.label, value)}
                />
              }
            />
          ))}
        </KpiLedger>
      </section>

      <Panel
        title="Weekly revenue across both periods"
        description={
          <>
            Period A runs {periodText(periodA)} and period B runs {periodText(periodB)}. Dashed lines mark each
            period&apos;s revenue per week.
          </>
        }
      >
        <ComparisonChart
          weeks={weeklyTrend.map((week) => ({ weekStart: week.weekStart, revenue: week.revenue }))}
          periodA={chartPeriod(periodA.startDate, periodA.endDate, summaryA.revenuePerWeek)}
          periodB={chartPeriod(periodB.startDate, periodB.endDate, summaryB.revenuePerWeek)}
        />
      </Panel>

      <Panel
        title="Likely drivers of the revenue change"
        description="Bars show each driver's change relative to its period A value. Green changes normally help revenue and red ones normally hurt it. Each reading checks consistency with the revenue change; it is not a measured effect."
        flush
      >
        <DriverList drivers={drivers} toneOf={(driver) => driverTone(driver.alignment, revenueChange)} />
      </Panel>
    </PageShell>
  );
}
