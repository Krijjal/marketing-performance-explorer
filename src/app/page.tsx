import Link from "next/link";
import { getFilterOptions, parseFilters, toQueryString, type SearchParams } from "../analytics/filters";
import { getKpis } from "../analytics/kpis";
import { getChannelSummaries, getSpendByChannel, getWeeklyTrend } from "../analytics/trends";
import { ApplyButton, CategoryFields, DateField, FILTER_FORM_CLASS, Phrase } from "../components/Filters";
import { formatDecimal, formatNumber, formatPercent, pluralize } from "../components/format";
import { Flowchart } from "../components/Flowchart";
import { KpiCard, KpiLedger } from "../components/KpiCard";
import { NoDataYet, Notice } from "../components/Notice";
import { PageHeader } from "../components/PageHeader";
import { Cell, HeaderCell, Table } from "../components/Table";
import { RevenueChart, SpendChart } from "../components/TrendCharts";
import { getAppPool } from "../db/appPool";

// Every page reads the database per request, so none of them can be prerendered at build time.
export const dynamic = "force-dynamic";

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

  return (
    <>
      <PageHeader currentPath="/" title="Overview" query={query} />

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
          <Link href={`/data-quality?${query}`} className="underline">
            See the data quality report
          </Link>
          .
        </Notice>
      )}

      <KpiLedger label="Headline KPIs" columns={6}>
        <KpiCard label="Revenue" value={formatNumber(kpis.revenue)} />
        <KpiCard label="Units sold" value={formatNumber(kpis.unitsSold)} />
        <KpiCard label="Media spend" value={formatNumber(kpis.mediaSpend)} imputedValues={kpis.imputedSpendValues} />
        <KpiCard
          label="ROAS"
          value={formatDecimal(kpis.roas)}
          note={kpis.roas === null ? "Needs all channels selected" : "Revenue / media spend"}
          imputedValues={kpis.roas === null ? 0 : kpis.imputedSpendValues}
        />
        <KpiCard
          label="CPC"
          value={formatDecimal(kpis.cpc)}
          note={kpis.cpc === null ? "Digital channels only" : "Digital only"}
          imputedValues={kpis.cpc === null ? 0 : kpis.imputedSpendValues}
        />
        <KpiCard
          label="CTR"
          value={formatPercent(kpis.ctr)}
          note={kpis.ctr === null ? "Digital channels only" : "Digital only"}
        />
      </KpiLedger>

      <Flowchart spend={spendByChannel} trend={weeklyTrend} />

      <section aria-label="Trends" className="grid gap-8 lg:grid-cols-2">
        <RevenueChart points={weeklyTrend} />
        <SpendChart points={weeklyTrend} />
      </section>

      <Table caption="Channel comparison">
        <thead>
          <tr>
            <HeaderCell>Channel</HeaderCell>
            <HeaderCell>Media spend</HeaderCell>
            <HeaderCell>Share of spend</HeaderCell>
            <HeaderCell>CPC</HeaderCell>
            <HeaderCell>CTR</HeaderCell>
            <HeaderCell>Cost per GRP</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {channelSummaries.map((summary) => (
            <tr key={summary.channel}>
              <Cell>{summary.channel}</Cell>
              <Cell>{formatNumber(summary.mediaSpend)}</Cell>
              <Cell>{formatPercent(summary.spendShare)}</Cell>
              <Cell>{formatDecimal(summary.cpc)}</Cell>
              <Cell>{formatPercent(summary.ctr)}</Cell>
              <Cell>{formatDecimal(summary.costPerGrp)}</Cell>
            </tr>
          ))}
        </tbody>
      </Table>

      <a
        href={`/api/export?${query}`}
        className="self-start rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
      >
        Export this view as CSV
      </a>
    </>
  );
}
