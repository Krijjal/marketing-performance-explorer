import { getFilterOptions, parseFilters, toQueryString, type SearchParams } from "../../analytics/filters";
import {
  comparePeriods,
  getPeriodSummary,
  parseComparisonPeriods,
  type DriverAlignment,
  type DriverChange,
} from "../../analytics/periodComparison";
import { ChangeBadge, driverTone, toneFor } from "../../components/ChangeBadge";
import { ApplyButton, CategoryFields, DateField, FILTER_FORM_CLASS, Phrase } from "../../components/Filters";
import { formatDecimal, formatPercent } from "../../components/format";
import { KpiCard, KpiLedger } from "../../components/KpiCard";
import { NoDataYet, Notice } from "../../components/Notice";
import { PageHeader } from "../../components/PageHeader";
import { Cell, HeaderCell, Table } from "../../components/Table";
import { getAppPool } from "../../db/appPool";

// Every page reads the database per request, so none of them can be prerendered at build time.
export const dynamic = "force-dynamic";

const ALIGNMENT_TEXT: Record<DriverAlignment, string> = {
  with: "Consistent with the revenue change",
  against: "Runs against the revenue change",
  flat: "No change",
  unknown: "Cannot say",
};

// Media spend is neither good nor bad on its own, so its change stays neutral.
const HIGHER_IS_BETTER: Record<string, boolean | null> = {
  "Revenue per week": true,
  "Units per week": true,
  "Media spend per week": null,
  ROAS: true,
};

function formatDriverValue(driver: DriverChange, value: number | null): string {
  return driver.unit === "percent" ? formatPercent(value) : formatDecimal(value);
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
  const [summaryA, summaryB] = await Promise.all([
    getPeriodSummary(pool, periodA, filters),
    getPeriodSummary(pool, periodB, filters),
  ]);
  const { metrics, drivers } = comparePeriods(summaryA, summaryB);
  const metricBadge = (metric: (typeof metrics)[number]) => (
    <ChangeBadge
      change={metric.percentChange}
      format="percent"
      tone={toneFor(metric.percentChange, HIGHER_IS_BETTER[metric.label] ?? null)}
      label={metric.label}
    />
  );
  const revenueChange = metrics[0]!.percentChange;
  const imputedValues = summaryA.imputedValues + summaryB.imputedValues;

  return (
    <>
      <PageHeader currentPath="/compare" title="Compare periods" query={toQueryString(filters)} />

      <form method="get" className={FILTER_FORM_CLASS}>
        <input type="hidden" name="start" value={filters.startDate} />
        <input type="hidden" name="end" value={filters.endDate} />
        <Phrase>
          <span>Compare</span>
          <DateField label="Period A from" name="aStart" value={periodA.startDate} options={options} />
          <span>to</span>
          <DateField label="Period A to" name="aEnd" value={periodA.endDate} options={options} />
        </Phrase>
        <Phrase>
          <span>against</span>
          <DateField label="Period B from" name="bStart" value={periodB.startDate} options={options} />
          <span>to</span>
          <DateField label="Period B to" name="bEnd" value={periodB.endDate} options={options} />
        </Phrase>
        <CategoryFields lead="for" filters={filters} options={options} />
        <ApplyButton />
      </form>

      <Notice>
        This compares movements side by side. It shows correlation, not causation: period A has{" "}
        {summaryA.weeks} weeks of data and period B has {summaryB.weeks}, and these factors often
        move together.
      </Notice>

      {imputedValues > 0 && (
        <Notice>
          These periods include {imputedValues} imputed value{imputedValues === 1 ? "" : "s"}.
        </Notice>
      )}

      <KpiLedger label="Period B against period A" columns={4}>
        {metrics.map((metric) => (
          <KpiCard
            key={metric.label}
            label={metric.label}
            value={formatDecimal(metric.periodB)}
            change={metricBadge(metric)}
            note={`Period A: ${formatDecimal(metric.periodA)}`}
          />
        ))}
      </KpiLedger>

      <Table caption="Performance (values per week, so periods of different lengths compare fairly)">
        <thead>
          <tr>
            <HeaderCell>Metric</HeaderCell>
            <HeaderCell>Period A</HeaderCell>
            <HeaderCell>Period B</HeaderCell>
            <HeaderCell>Change</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.label}>
              <Cell>{metric.label}</Cell>
              <Cell>{formatDecimal(metric.periodA)}</Cell>
              <Cell>{formatDecimal(metric.periodB)}</Cell>
              <Cell>{metricBadge(metric)}</Cell>
            </tr>
          ))}
        </tbody>
      </Table>

      <Table
        caption="Likely drivers of the revenue change"
        description="Green changes normally help revenue and red ones normally hurt it. Each reading checks consistency with the revenue change; it is not a measured effect."
      >
        <thead>
          <tr>
            <HeaderCell>Driver</HeaderCell>
            <HeaderCell>Period A</HeaderCell>
            <HeaderCell>Period B</HeaderCell>
            <HeaderCell>Change</HeaderCell>
            <HeaderCell>Reading</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.label}>
              <Cell>{driver.label}</Cell>
              <Cell>{formatDriverValue(driver, driver.periodA)}</Cell>
              <Cell>{formatDriverValue(driver, driver.periodB)}</Cell>
              <Cell>
                <ChangeBadge
                  change={driver.change}
                  format={driver.unit === "percent" ? "points" : "number"}
                  tone={driverTone(driver.alignment, revenueChange)}
                  label={driver.label}
                />
              </Cell>
              <Cell>{ALIGNMENT_TEXT[driver.alignment]}</Cell>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
