import { getLatestRunReport } from "../../analytics/dataQuality";
import { getFilterOptions, parseFilters, toQueryString, type SearchParams } from "../../analytics/filters";
import { IssueBreakdown, RowFlow, SeverityKey, StatusPill } from "../../components/DataQuality";
import { IssueLog } from "../../components/IssueLog";
import { NoDataYet, Notice } from "../../components/Notice";
import { PageShell } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { humanize } from "../../components/severity";
import { getAppPool } from "../../db/appPool";

// Every page reads the database per request, so none of them can be prerendered at build time.
export const dynamic = "force-dynamic";

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
  const rowsTouched = new Set(issues.filter((i) => i.rowNumber !== null).map((i) => `${i.sheet}:${i.rowNumber}`)).size;

  return (
    <PageShell
      currentPath="/data-quality"
      title="Data quality"
      query={query}
      description={
        <>
          Latest ingestion run #{run.id} of <span className="font-semibold text-ink">{run.sourceFile}</span>, started{" "}
          {run.startedAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC.
        </>
      }
      actions={<StatusPill status={run.status} />}
    >
      {run.status === "failed" && (
        <Notice>
          This run failed, so the charts still show the previous good load. Reason: {run.errorMessage}
        </Notice>
      )}

      <Panel
        title="Where every row went"
        description={
          run.rowsRejected === 0
            ? "Every valid row was loaded. Rows not loaded were exact duplicates or otherwise dropped by a rule below."
            : "Rejected rows failed validation and were not loaded; the issue log below says why."
        }
      >
        <div className="px-2 pb-2 sm:px-2">
          <RowFlow run={run} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel
          title={`${issues.length} ${issues.length === 1 ? "issue" : "issues"} by rule`}
          description={`Across ${rowsTouched} spreadsheet ${rowsTouched === 1 ? "row" : "rows"}. Bar length counts issues; colour shows severity.`}
          legend={<SeverityKey />}
        >
          <div className="px-2 pb-2">
            <IssueBreakdown issues={issues} groupBy={(issue) => issue.rule} label={humanize} />
          </div>
        </Panel>
        <Panel title="By sheet and action" description="Which sheet the issue came from, and what the pipeline did about it.">
          <div className="flex flex-col gap-6 px-2 pb-2">
            <IssueBreakdown issues={issues} groupBy={(issue) => issue.sheet} label={(sheet) => sheet.replaceAll("_", " ")} />
            <div className="border-t border-line pt-5">
              <IssueBreakdown issues={issues} groupBy={(issue) => issue.actionTaken} label={humanize} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Issue log" description="Every issue the run recorded, with the spreadsheet location and the value before and after." flush>
        <IssueLog issues={issues} />
      </Panel>
    </PageShell>
  );
}
