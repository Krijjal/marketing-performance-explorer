import type { CSSProperties } from "react";
import type { ChannelSummary } from "../analytics/trends";
import { channelColour } from "./channelColours";
import { formatDecimal, formatNumber, formatPercent } from "./format";
import { Panel } from "./Panel";
import { Cell, HeaderCell } from "./Table";

type Best = "low" | "high";

// The best figure is marked only when there is something to beat, so a single
// TV row never claims "best cost per GRP".
function bestOf(summaries: ChannelSummary[], value: (summary: ChannelSummary) => number | null, best: Best) {
  const known = summaries.map(value).filter((v): v is number => v !== null);
  if (known.length < 2) {
    return null;
  }
  return best === "low" ? Math.min(...known) : Math.max(...known);
}

function Figure({ value, text, best }: { value: number | null; text: string; best: number | null }) {
  const isBest = value !== null && value === best;
  if (value === null) {
    return <span className="text-ink-soft/70">n/a</span>;
  }
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      {isBest && (
        <span className="rounded-full bg-good-soft px-1.5 text-[10px] leading-4 font-semibold text-good">best</span>
      )}
      <span className={isBest ? "font-semibold" : ""}>{text}</span>
    </span>
  );
}

export function ChannelMix({ summaries }: { summaries: ChannelSummary[] }) {
  const largest = Math.max(...summaries.map((summary) => summary.mediaSpend), 0);
  const bestCpc = bestOf(summaries, (summary) => summary.cpc, "low");
  const bestCtr = bestOf(summaries, (summary) => summary.ctr, "high");
  const bestGrp = bestOf(summaries, (summary) => summary.costPerGrp, "low");
  const total = summaries.reduce((sum, summary) => sum + summary.mediaSpend, 0);

  return (
    <Panel
      title="Channel mix and efficiency"
      description="Where the media budget went, and what each channel bought. Digital channels report CPC and CTR; TV reports cost per GRP."
      aside={
        <p className="figures text-right text-sm text-ink-soft">
          <span className="block text-xl font-bold text-ink">{formatNumber(total)}</span>
          total media spend
        </p>
      }
      flush
    >
      {({ titleId, descriptionId }) => (
        <>
          <div className="px-5 pb-6 sm:px-6">
            <div
              role="img"
              aria-label={`Share of spend: ${summaries.map((s) => `${s.channel} ${formatPercent(s.spendShare)}`).join(", ")}`}
              className="flex h-11 gap-0.5 overflow-hidden rounded-lg"
            >
              {summaries.map((summary, index) => (
                <div
                  key={summary.channel}
                  className="bar-grow flex min-w-0 items-center px-3 text-sm font-semibold text-white"
                  style={
                    {
                      "--row": index,
                      flexBasis: `${summary.spendShare * 100}%`,
                      flexGrow: 0,
                      backgroundColor: channelColour(summary.channel),
                    } as CSSProperties
                  }
                >
                  <span className="figures truncate">{Math.round(summary.spendShare * 100)}%</span>
                </div>
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft" aria-hidden="true">
              {summaries.map((summary) => (
                <li key={summary.channel} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: channelColour(summary.channel) }} />
                  {summary.channel}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-x-auto border-t border-line">
            <table
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              className="w-full min-w-[640px] text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-page [&_tbody_tr:last-child>td]:border-b-0"
            >
              <thead>
                <tr>
                  <HeaderCell>Channel</HeaderCell>
                  <HeaderCell>Media spend</HeaderCell>
                  <HeaderCell align="right">Share</HeaderCell>
                  <HeaderCell align="right">CPC</HeaderCell>
                  <HeaderCell align="right">CTR</HeaderCell>
                  <HeaderCell align="right">Cost per GRP</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary, index) => (
                  <tr key={summary.channel}>
                    <Cell>
                      <span className="flex items-center gap-2 font-semibold">
                        <span
                          aria-hidden="true"
                          className="size-2.5 rounded-[3px]"
                          style={{ backgroundColor: channelColour(summary.channel) }}
                        />
                        {summary.channel}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="flex items-center gap-3">
                        <span className="figures w-16 shrink-0 text-right">{formatNumber(summary.mediaSpend)}</span>
                        <span aria-hidden="true" className="h-2 w-full min-w-20 max-w-48 rounded-full bg-neutral-soft">
                          <span
                            className="bar-grow block h-full rounded-full"
                            style={
                              {
                                "--row": index,
                                width: `${largest > 0 ? (summary.mediaSpend / largest) * 100 : 0}%`,
                                backgroundColor: channelColour(summary.channel),
                              } as CSSProperties
                            }
                          />
                        </span>
                      </span>
                    </Cell>
                    <Cell align="right">{formatPercent(summary.spendShare)}</Cell>
                    <Cell align="right">
                      <Figure value={summary.cpc} text={formatDecimal(summary.cpc)} best={bestCpc} />
                    </Cell>
                    <Cell align="right">
                      <Figure value={summary.ctr} text={formatPercent(summary.ctr)} best={bestCtr} />
                    </Cell>
                    <Cell align="right">
                      <Figure value={summary.costPerGrp} text={formatDecimal(summary.costPerGrp)} best={bestGrp} />
                    </Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
