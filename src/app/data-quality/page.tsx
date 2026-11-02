import { getLatestRunReport } from "../../analytics/dataQuality";
import { getFilterOptions, parseFilters, toQueryString, type SearchParams } from "../../analytics/filters";
import { KpiCard } from "../../components/KpiCard";
import { formatNumber } from "../../components/format";
import { NoDataYet, Notice } from "../../components/Notice";
import { PageHeader } from "../../components/PageHeader";
import { Cell, HeaderCell, Table } from "../../components/Table";
import { getAppPool } from "../../db/appPool";

export default async function DataQualityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const pool = getAppPool();
  const [options, report] = await Promise.all([getFilterOptions(pool), getLatestRunReport(pool)]);
  if (!report) {
    return <NoDataYet />;
  }

  const query = options ? toQueryString(parseFilters(await searchParams, options)) : "";
  const { run, issues } = report;

  return (
    <>
      <PageHeader currentPath="/data-quality" title="Data quality" query={query} />

      <p className="text-sm text-ink-soft">
        Latest ingestion run #{run.id} of {run.sourceFile}, started{" "}
        {run.startedAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC.
      </p>

      {run.status === "failed" && (
        <Notice>
          This run failed, so the charts still show the previous good load. Reason:{" "}
          {run.errorMessage}
        </Notice>
      )}

      <section aria-label="Run summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Status" value={run.status} />
        <KpiCard label="Rows read" value={formatNumber(run.rowsRead)} />
        <KpiCard label="Rows loaded" value={formatNumber(run.rowsLoaded)} />
        <KpiCard label="Rows rejected" value={formatNumber(run.rowsRejected)} />
      </section>

      <Table caption={`${issues.length} issues found`}>
        <thead>
          <tr>
            <HeaderCell>Sheet</HeaderCell>
            <HeaderCell>Row</HeaderCell>
            <HeaderCell>Rule</HeaderCell>
            <HeaderCell>Severity</HeaderCell>
            <HeaderCell>Action taken</HeaderCell>
            <HeaderCell>Field</HeaderCell>
            <HeaderCell>Original</HeaderCell>
            <HeaderCell>Corrected</HeaderCell>
            <HeaderCell>Detail</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <Cell>{issue.sheet}</Cell>
              <Cell>{issue.rowNumber ?? "-"}</Cell>
              <Cell>{issue.rule}</Cell>
              <Cell>{issue.severity}</Cell>
              <Cell>{issue.actionTaken}</Cell>
              <Cell>{issue.field ?? "-"}</Cell>
              <Cell>{issue.originalValue ?? "(empty)"}</Cell>
              <Cell>{issue.correctedValue ?? "-"}</Cell>
              <Cell>{issue.message}</Cell>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
