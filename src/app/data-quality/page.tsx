import { getLatestRunReport } from "../../analytics/dataQuality";
import { getFilterOptions, parseFilters, toQueryString, type SearchParams } from "../../analytics/filters";
import { KpiCard, KpiLedger } from "../../components/KpiCard";
import { formatNumber } from "../../components/format";
import { NoDataYet, Notice } from "../../components/Notice";
import { PageHeader } from "../../components/PageHeader";
import { Cell, HeaderCell, Table } from "../../components/Table";
import { getAppPool } from "../../db/appPool";

// Every page reads the database per request, so none of them can be prerendered at build time.
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "good" | "bad" | undefined> = {
  succeeded: "good",
  failed: "bad",
};

const SEVERITY_CLASS: Record<string, string> = {
  error: "bg-bad-soft text-bad",
  warning: "bg-notice text-ink",
  info: "bg-neutral-soft text-ink-soft",
};

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

      <KpiLedger label="Run summary" columns={4}>
        <KpiCard label="Status" value={run.status} valueTone={STATUS_TONE[run.status]} />
        <KpiCard label="Rows read" value={formatNumber(run.rowsRead)} />
        <KpiCard label="Rows loaded" value={formatNumber(run.rowsLoaded)} />
        <KpiCard
          label="Rows rejected"
          value={formatNumber(run.rowsRejected)}
          valueTone={run.rowsRejected === 0 ? "good" : "bad"}
          note={run.rowsRejected === 0 ? "Every valid row was loaded" : undefined}
        />
      </KpiLedger>

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
              <Cell>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLASS[issue.severity]}`}>
                  {issue.severity}
                </span>
              </Cell>
              <Cell>{issue.actionTaken}</Cell>
              <Cell>{issue.field ?? "-"}</Cell>
              <Cell>{issue.originalValue ?? "(empty)"}</Cell>
              <Cell>{issue.correctedValue ?? "-"}</Cell>
              <Cell>
                <span className="block min-w-64">{issue.message}</span>
              </Cell>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
