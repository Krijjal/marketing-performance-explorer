import Link from "next/link";
import { getFilterOptions, parseFilters, toQueryString, type SearchParams } from "../analytics/filters";
import { getKpis } from "../analytics/kpis";
import { getChannelSummaries, getSpendByChannel, getWeeklyTrend } from "../analytics/trends";
import { ChangeBadge, toneFor } from "../components/ChangeBadge";
import { ChannelMix } from "../components/ChannelMix";
import { channelColour, INK } from "../components/channelColours";
import { ApplyButton, CategoryFields, DateField, FILTER_FORM_CLASS, Phrase } from "../components/Filters";
import { formatDate, formatDecimal, formatNumber, formatPercent, pluralize } from "../components/format";
import { Flowchart } from "../components/Flowchart";
import { KpiCard, KpiGroup } from "../components/KpiCard";
import { Legend, LegendItem } from "../components/Legend";
import { NoDataYet, Notice, NoticeStack } from "../components/Notice";
import { PageShell } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { firstToLast, ratio } from "../components/series";
import { Sparkline } from "../components/Sparkline";
import { PerformanceChart, type PerformanceWeek } from "../components/TrendCharts";
import { getAppPool } from "../db/appPool";

// Every page reads the database per request, so none of them can be prerendered at build time.
export const dynamic = "force-dynamic";

const ACCENT = "#2f5bd3";
const SPEND = "#5d6b85";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="fill-current">
      <path d="M10 2.5a1 1 0 0 1 1 1v7.1l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L9 10.6V3.5a1 1 0 0 1 1-1ZM4 15.5a1 1 0 0 1 1 1h10a1 1 0 1 1 0 2H5a2 2 0 0 1-2-2 1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const pool = getAppPool();
  const options = await getFilterOptions(pool);
  if (!options) {
    return <NoDataYet />;
  }

  const filters = parseFilters(await searchParams, options);
  const query = toQueryString(filters);
  const [kpis, weeklyTrend, spendByChannel, channelSummaries] = await Promise.all([
    getKpis(pool, filters),
    getWeeklyTrend(pool, filters),
    getSpendByChannel(pool, filters),
    getChannelSummaries(pool, filters),
  ]);
  const imputedTotal = kpis.imputedSpendValues + kpis.imputedDistributionValues;
  const weekCount = weeklyTrend.length;

  // Revenue has no channel level, so a channel filter leaves no honest weekly ROAS.
  const roasAvailable = filters.channel === null;
  const series = {
    revenue: weeklyTrend.map((week) => week.revenue),
    units: weeklyTrend.map((week) => week.unitsSold),
    spend: weeklyTrend.map((week) => week.mediaSpend),
    roas: weeklyTrend.map((week) => (roasAvailable ? ratio(week.revenue, week.mediaSpend) : null)),
    cpc: weeklyTrend.map((week) => ratio(week.digitalSpend, week.clicks)),
    ctr: weeklyTrend.map((week) => ratio(week.clicks, week.impressions)),
  };
  const imputedWeeks = weeklyTrend.map((week) => week.spendIsImputed);

  const trendChange = (values: (number | null)[], label: string, higherIsBetter: boolean | null) => {
    const change = firstToLast(values);
    return (
      <>
        <ChangeBadge change={change} format="percent" tone={toneFor(change, higherIsBetter)} label={label} />
        {change !== null && <span className="text-xs text-ink-soft">first to last week</span>}
      </>
    );
  };

  const channels = options.channels.filter((channel) => spendByChannel.some((point) => point.channel === channel));
  const weeks: PerformanceWeek[] = weeklyTrend.map((week) => ({
    weekStart: week.weekStart,
    revenue: week.revenue,
    totalSpend: week.mediaSpend,
    roas: roasAvailable ? ratio(week.revenue, week.mediaSpend) : null,
    spendIsImputed: week.spendIsImputed,
    channels: Object.fromEntries(
      spendByChannel
        .filter((point) => point.weekStart === week.weekStart)
        .map((point) => [point.channel, { spend: point.mediaSpend, imputed: point.spendIsImputed }]),
    ),
  }));

  const scope = [filters.brand ?? "All brands", filters.market ?? "all markets", filters.channel ?? "all channels"];

  return (
    <PageShell
      currentPath="/"
      title="Overview"
      query={query}
      description={
        <>
          {scope.join(" · ")} — {pluralize(weekCount, "week", "weeks")}, {formatDate(filters.startDate)} to{" "}
          {formatDate(filters.endDate)}
        </>
      }
      actions={
        <a
          href={`/api/export?${query}`}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
        >
          <DownloadIcon />
          Export CSV
        </a>
      }
    >
      <form method="get" className={FILTER_FORM_CLASS}>
        <CategoryFields lead="Showing" filters={filters} options={options} />
        <Phrase>
          <span>from</span>
          <DateField label="From" name="start" value={filters.startDate} options={options} />
          <span>to</span>
          <DateField label="To" name="end" value={filters.endDate} options={options} />
        </Phrase>
        <ApplyButton />
      </form>

      {(filters.channel || imputedTotal > 0) && (
        <NoticeStack>
          {filters.channel && (
            <Notice>
              Revenue and units are not recorded by channel, so they stay at brand and market level.
              ROAS is hidden because this data cannot show what one channel earned.
            </Notice>
          )}
          {imputedTotal > 0 && (
            <Notice>
              Imputed from neighbouring weeks in this view:{" "}
              {pluralize(kpis.imputedSpendValues, "media spend value", "media spend values")} and{" "}
              {pluralize(kpis.imputedDistributionValues, "distribution value", "distribution values")}.{" "}
              <Link href={`/data-quality?${query}`} className="font-semibold underline underline-offset-2">
                See the data quality report
              </Link>
              .
            </Notice>
          )}
        </NoticeStack>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_4fr]">
        <KpiGroup title="Sales" columns={2}>
          <KpiCard
            label="Revenue"
            value={formatNumber(kpis.revenue)}
            change={trendChange(series.revenue, "Revenue, first to last week", true)}
            chart={<Sparkline values={series.revenue} colour={INK} label="Weekly revenue" />}
          />
          <KpiCard
            label="Units sold"
            value={formatNumber(kpis.unitsSold)}
            change={trendChange(series.units, "Units sold, first to last week", true)}
            chart={<Sparkline values={series.units} colour={INK} label="Weekly units sold" />}
          />
        </KpiGroup>
        <KpiGroup title="Media" columns={4}>
          <KpiCard
            label="Media spend"
            value={formatNumber(kpis.mediaSpend)}
            change={trendChange(series.spend, "Media spend, first to last week", null)}
            imputedValues={kpis.imputedSpendValues}
            chart={<Sparkline values={series.spend} imputed={imputedWeeks} colour={SPEND} label="Weekly media spend" />}
          />
          <KpiCard
            label="ROAS"
            value={formatDecimal(kpis.roas)}
            change={roasAvailable ? trendChange(series.roas, "ROAS, first to last week", true) : undefined}
            note={kpis.roas === null ? "Needs all channels selected" : "Revenue per unit of spend"}
            chart={<Sparkline values={series.roas} imputed={imputedWeeks} colour={ACCENT} label="Weekly ROAS" />}
          />
          <KpiCard
            label="CPC"
            value={formatDecimal(kpis.cpc)}
            change={kpis.cpc === null ? undefined : trendChange(series.cpc, "CPC, first to last week", false)}
            note={kpis.cpc === null ? "Digital channels only" : "Digital only"}
            chart={<Sparkline values={series.cpc} colour={channelColour("Paid Search")} label="Weekly CPC" />}
          />
          <KpiCard
            label="CTR"
            value={formatPercent(kpis.ctr)}
            change={kpis.ctr === null ? undefined : trendChange(series.ctr, "CTR, first to last week", true)}
            note={kpis.ctr === null ? "Digital channels only" : "Digital only"}
            chart={<Sparkline values={series.ctr} colour={channelColour("Social")} label="Weekly CTR" />}
          />
        </KpiGroup>
      </div>

      <Panel
        title="Revenue against media spend"
        description="Bars stack each channel's spend (left axis); the line is revenue (right axis). Hover a week for the full breakdown."
        aside={
          <>
            <ChangeBadge
              change={firstToLast(series.revenue)}
              format="percent"
              tone={toneFor(firstToLast(series.revenue), true)}
              label="Revenue, first to last week"
            />
            <span className="text-xs text-ink-soft">revenue</span>
            <ChangeBadge
              change={firstToLast(series.spend)}
              format="percent"
              tone="neutral"
              label="Media spend, first to last week"
            />
            <span className="text-xs text-ink-soft">spend</span>
          </>
        }
        legend={
          <Legend label="Chart key">
            <LegendItem mark={<span className="relative block h-3 w-5"><span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-ink" /><span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-surface" /></span>}>
              Revenue
            </LegendItem>
            {channels.map((channel) => (
              <LegendItem
                key={channel}
                mark={<span className="size-3 rounded-[3px]" style={{ backgroundColor: channelColour(channel) }} />}
              >
                {channel}
              </LegendItem>
            ))}
            {imputedWeeks.some(Boolean) && (
              <LegendItem
                mark={
                  <span
                    className="size-3 rounded-[3px]"
                    style={{ background: "repeating-linear-gradient(135deg, #5d6b85 0 2px, #c4cad6 2px 4px)" }}
                  />
                }
              >
                Includes an imputed value
              </LegendItem>
            )}
          </Legend>
        }
      >
        <PerformanceChart weeks={weeks} channels={channels} />
      </Panel>

      <Flowchart spend={spendByChannel} trend={weeklyTrend} />

      <ChannelMix summaries={channelSummaries} />
    </PageShell>
  );
}
