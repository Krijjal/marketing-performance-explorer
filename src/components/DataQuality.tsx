import type { CSSProperties } from "react";
import type { IssueRow, LatestRun } from "../analytics/dataQuality";
import { formatNumber } from "./format";
import { humanize, SEVERITIES, severityStyle } from "./severity";

const STATUS_STYLE: Record<string, string> = {
  succeeded: "bg-good-soft text-good",
  failed: "bg-bad-soft text-bad",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${STATUS_STYLE[status] ?? "bg-neutral-soft text-ink-soft"}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {humanize(status)}
    </span>
  );
}

// Every row read ends up loaded, dropped (duplicates and the like) or rejected,
// so one bar accounts for the whole sheet.
export function RowFlow({ run }: { run: LatestRun }) {
  const dropped = Math.max(run.rowsRead - run.rowsLoaded - run.rowsRejected, 0);
  const segments = [
    { label: "Loaded", value: run.rowsLoaded, colour: "#2f9e44", text: "text-good" },
    { label: "Dropped", value: dropped, colour: "#8a96ad", text: "text-ink-soft" },
    { label: "Rejected", value: run.rowsRejected, colour: "#c92a2a", text: "text-bad" },
  ];
  const total = Math.max(run.rowsRead, 1);
  return (
    <div className="flex flex-col gap-4">
      <div
        role="img"
        aria-label={`${formatNumber(run.rowsRead)} rows read: ${segments.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(", ")}`}
        className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-neutral-soft"
      >
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment, index) => (
            <span
              key={segment.label}
              className="bar-grow h-full min-w-1.5"
              style={{ "--row": index, flexBasis: `${(segment.value / total) * 100}%`, backgroundColor: segment.colour } as CSSProperties}
            />
          ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-ink-soft">Rows read</dt>
          <dd className="figures text-2xl font-bold tracking-tight">{formatNumber(run.rowsRead)}</dd>
        </div>
        {segments.map((segment) => (
          <div key={segment.label}>
            <dt className="flex items-center gap-1.5 text-sm text-ink-soft">
              <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ backgroundColor: segment.colour }} />
              {segment.label}
            </dt>
            <dd className={`figures text-2xl font-bold tracking-tight ${segment.value > 0 && segment.label !== "Loaded" ? segment.text : ""}`}>
              {formatNumber(segment.value)}
              <span className="ml-1.5 text-sm font-medium text-ink-soft">
                {((segment.value / total) * 100).toFixed(segment.value === total ? 0 : 1)}%
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SeverityKey() {
  return (
    <ul aria-label="Severity key" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {SEVERITIES.map((severity) => (
        <li key={severity} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ backgroundColor: severityStyle(severity).bar }} />
          {severityStyle(severity).label}
        </li>
      ))}
    </ul>
  );
}

interface BreakdownProps {
  issues: IssueRow[];
  groupBy: (issue: IssueRow) => string;
  label?: (key: string) => string;
}

// One bar per group, split by severity, on a scale shared by every group.
export function IssueBreakdown({ issues, groupBy, label = (key) => key }: BreakdownProps) {
  const groups = new Map<string, IssueRow[]>();
  for (const issue of issues) {
    const key = groupBy(issue);
    groups.set(key, [...(groups.get(key) ?? []), issue]);
  }
  const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const largest = Math.max(...rows.map(([, group]) => group.length), 1);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(([key, group], index) => (
        <li key={key} className="grid grid-cols-[minmax(0,13.5rem)_1fr_1.5rem] items-center gap-3 text-sm">
          <span className="truncate" title={label(key)}>
            {label(key)}
          </span>
          <span
            role="img"
            aria-label={`${label(key)}: ${SEVERITIES.map((s) => `${group.filter((i) => i.severity === s).length} ${s}`).join(", ")}`}
            className="bar-grow flex h-5 gap-px overflow-hidden rounded"
            style={{ "--row": index, width: `${(group.length / largest) * 100}%` } as CSSProperties}
          >
            {SEVERITIES.map((severity) => {
              const count = group.filter((issue) => issue.severity === severity).length;
              return count === 0 ? null : (
                <span key={severity} className="h-full" style={{ flexGrow: count, backgroundColor: severityStyle(severity).bar }} />
              );
            })}
          </span>
          <span className="figures text-right font-semibold">{group.length}</span>
        </li>
      ))}
    </ul>
  );
}
