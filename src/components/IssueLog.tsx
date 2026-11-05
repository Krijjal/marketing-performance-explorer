"use client";

import { useState } from "react";
import type { IssueRow } from "../analytics/dataQuality";
import { humanize, SEVERITIES, severityStyle } from "./severity";

type Filter = "all" | (typeof SEVERITIES)[number];

function Value({ value, struck }: { value: string | null; struck?: boolean }) {
  if (value === null) {
    return <span className="text-ink-soft italic">empty</span>;
  }
  return (
    <code
      className={`rounded bg-neutral-soft px-1.5 py-0.5 text-[13px] break-all ${struck ? "text-ink-soft line-through decoration-ink-soft/60" : "font-semibold text-ink"}`}
    >
      {value}
    </code>
  );
}

// Each issue reads as a sentence: where it was, what rule caught it, and what the
// pipeline did, with the value before and after side by side.
export function IssueLog({ issues }: { issues: IssueRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, issues.filter((i) => i.severity === s).length]));
  const shown = filter === "all" ? issues : issues.filter((issue) => issue.severity === filter);
  const choices: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: issues.length },
    ...SEVERITIES.filter((s) => counts[s]! > 0).map((s) => ({ value: s, label: severityStyle(s).label, count: counts[s]! })),
  ];

  return (
    <div>
      <div role="group" aria-label="Filter by severity" className="flex flex-wrap gap-2 px-5 pb-4 sm:px-6">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-pressed={filter === choice.value}
            onClick={() => setFilter(choice.value)}
            className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${
              filter === choice.value
                ? "border-ink bg-ink text-white"
                : "border-line-strong bg-surface text-ink-soft hover:border-ink-soft hover:text-ink"
            }`}
          >
            {choice.value !== "all" && (
              <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: severityStyle(choice.value).bar }} />
            )}
            {choice.label}
            <span className={`figures text-xs ${filter === choice.value ? "text-white/70" : "text-ink-soft"}`}>{choice.count}</span>
          </button>
        ))}
      </div>
      <ol className="divide-y divide-line border-t border-line">
        {shown.map((issue) => {
          const style = severityStyle(issue.severity);
          return (
            <li
              key={issue.id}
              className="grid gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-page sm:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.chip}`}>{style.label}</span>
                  <span className="font-semibold">{humanize(issue.rule)}</span>
                </span>
                <span className="text-xs text-ink-soft">
                  {issue.sheet}
                  {issue.rowNumber !== null && <> · row {issue.rowNumber}</>}
                  {issue.field && <> · {issue.field}</>}
                </span>
                <p className="mt-1 max-w-prose text-sm text-ink-soft text-pretty">{issue.message}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-center text-sm">
                <Value value={issue.originalValue} struck={issue.correctedValue !== null} />
                {issue.correctedValue !== null && (
                  <>
                    <span aria-hidden="true" className="text-ink-soft">
                      →
                    </span>
                    <span className="sr-only">corrected to</span>
                    <Value value={issue.correctedValue} />
                  </>
                )}
              </div>
              <span className="self-center justify-self-start rounded-md border border-line-strong px-2 py-1 text-xs font-semibold text-ink md:justify-self-end">
                {humanize(issue.actionTaken)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
