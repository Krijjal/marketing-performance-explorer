import { getFilterOptions, parseFilters, toQueryString, type SearchParams } from "../../analytics/filters";
import {
  comparePeriods,
  getPeriodSummary,
  parseComparisonPeriods,
  type DriverAlignment,
  type DriverChange,
} from "../../analytics/periodComparison";
import { ApplyButton, CategoryFields, DateField, FILTER_FORM_CLASS } from "../../components/Filters";
import { formatDecimal, formatPercent, formatSignedPercent } from "../../components/format";
import { NoDataYet, Notice } from "../../components/Notice";
import { PageHeader } from "../../components/PageHeader";
import { Cell, HeaderCell, Table } from "../../components/Table";
import { getAppPool } from "../../db/appPool";

const ALIGNMENT_TEXT: Record<DriverAlignment, string> = {
  with: "Consistent with the revenue change",
  against: "Runs against the revenue change",
  flat: "No change",
  unknown: "Cannot say",
};

function formatDriverValue(driver: DriverChange, value: number | null): string {
  return driver.unit === "percent" ? formatPercent(value) : formatDecimal(value);
}

function formatDriverChange(driver: DriverChange): string {
  if (driver.change === null) {
    return "n/a";
  }
  const sign = driver.change > 0 ? "+" : "";
  return driver.unit === "percent"
    ? `${sign}${(driver.change * 100).toFixed(2)} pts`
    : `${sign}${formatDecimal(driver.change)}`;
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
  const imputedValues = summaryA.imputedValues + summaryB.imputedValues;

  return (
    <>
      <PageHeader currentPath="/compare" title="Compare periods" query={toQueryString(filters)} />

      <form method="get" className={FILTER_FORM_CLASS}>
        <input type="hidden" name="start" value={filters.startDate} />
        <input type="hidden" name="end" value={filters.endDate} />
        <DateField label="Period A from" name="aStart" value={periodA.startDate} options={options} />
        <DateField label="Period A to" name="aEnd" value={periodA.endDate} options={options} />
        <DateField label="Period B from" name="bStart" value={periodB.startDate} options={options} />
        <DateField label="Period B to" name="bEnd" value={periodB.endDate} options={options} />
        <CategoryFields filters={filters} options={options} />
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
              <Cell>{formatSignedPercent(metric.percentChange)}</Cell>
            </tr>
          ))}
        </tbody>
      </Table>

      <Table caption="Likely drivers of the revenue change">
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
              <Cell>{formatDriverChange(driver)}</Cell>
              <Cell>{ALIGNMENT_TEXT[driver.alignment]}</Cell>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
