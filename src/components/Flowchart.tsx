import type { CSSProperties, ReactNode } from "react";
import type { ChannelWeekPoint, WeeklyTrendPoint } from "../analytics/trends";
import { ChangeBadge, toneFor } from "./ChangeBadge";
import { channelColour } from "./channelColours";
import { formatNumber, formatWeek } from "./format";
import { Legend, LegendItem } from "./Legend";

// Slate rather than full ink, so the revenue row reads as a reference line and
// does not outweigh the channels above it.
const REVENUE_COLOUR = "#5d6b85";

const HATCH = "repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0 3px, transparent 3px 7px)";

// The palest week still shows the channel's colour, so no week reads as empty.
const LIGHTEST_SHADE = 18;
const KEY_SHADES = [LIGHTEST_SHADE, 38, 59, 79, 100];

function shadeOf(colour: string, shade: number): string {
  return `color-mix(in srgb, ${colour} ${shade}%, white)`;
}

interface FlowchartRow {
  label: string;
  colour: string;
  values: (number | null)[];
  imputed: boolean[];
  higherIsBetter: boolean | null;
  shareOfSpend: number | null;
}

function formatShort(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}m`;
  }
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : formatNumber(value);
}

// Shading runs from the row's lowest week to its highest, so every row shows
// when its push came, however small the channel. Size between rows is left to
// the summary column, where numbers say it better than shades could.
function shadeFor(value: number | null, values: (number | null)[]): number {
  const known = values.filter((v): v is number => v !== null);
  if (value === null || known.length === 0) {
    return 0;
  }
  const low = Math.min(...known);
  const high = Math.max(...known);
  const position = high === low ? 0.5 : (value - low) / (high - low);
  return Math.round(LIGHTEST_SHADE + position * (100 - LIGHTEST_SHADE));
}

function firstToLast(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  const first = known[0];
  const last = known.at(-1);
  if (first === undefined || last === undefined || known.length < 2 || first === 0) {
    return null;
  }
  return (last - first) / first;
}

function KeyPill({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`rounded-full px-1.5 text-[10px] leading-4 ${className}`}>{children}</span>;
}

function ShadeCell({ value, shade, colour, week, isImputed }: {
  value: number | null;
  shade: number;
  colour: string;
  week: number;
  isImputed: boolean;
}) {
  return (
    <td className="border-b border-line px-px py-2 align-top">
      <div
        className="burst h-8 rounded-sm"
        style={
          {
            "--week": week,
            backgroundColor: value === null ? "transparent" : shadeOf(colour, shade),
            backgroundImage: isImputed ? HATCH : undefined,
          } as CSSProperties
        }
      />
      <p className="mt-1 text-center text-xs text-ink-soft">
        <span aria-hidden="true">{value === null ? "n/a" : formatShort(value)}</span>
        <span className="sr-only">
          {formatNumber(value)}
          {isImputed ? ", includes an imputed value" : ""}
        </span>
      </p>
    </td>
  );
}

function SummaryCell({ row }: { row: FlowchartRow }) {
  const change = firstToLast(row.values);
  const total = row.values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return (
    <td className="border-b border-line py-2 pl-4 align-top">
      <ChangeBadge
        change={change}
        format="percent"
        tone={toneFor(change, row.higherIsBetter)}
        label={`${row.label}, first to last week`}
      />
      <p className="mt-1 text-xs text-ink-soft">
        {formatShort(total)} total
        {row.shareOfSpend !== null && `, ${Math.round(row.shareOfSpend * 100)}% of spend`}
      </p>
    </td>
  );
}

// A media flowchart, the planner's view of a campaign: weeks across, channels
// down, and a block wherever money went out. Revenue runs underneath so the two
// can be read against each other week by week.
export function Flowchart({ spend, trend }: { spend: ChannelWeekPoint[]; trend: WeeklyTrendPoint[] }) {
  const weeks = trend.map((point) => point.weekStart);
  if (weeks.length === 0) {
    return null;
  }
  const spendFor = (channel: string, week: string) =>
    spend.find((point) => point.channel === channel && point.weekStart === week);
  const totalSpend = spend.reduce((sum, point) => sum + point.mediaSpend, 0);

  const channelRows: FlowchartRow[] = [...new Set(spend.map((point) => point.channel))].map((channel) => {
    const points = weeks.map((week) => spendFor(channel, week));
    const values = points.map((point) => point?.mediaSpend ?? null);
    return {
      label: channel,
      colour: channelColour(channel),
      values,
      imputed: points.map((point) => point?.spendIsImputed ?? false),
      // More spend is neither good nor bad on its own, so spend rows stay neutral.
      higherIsBetter: null,
      shareOfSpend: totalSpend > 0 ? values.reduce<number>((sum, v) => sum + (v ?? 0), 0) / totalSpend : null,
    };
  });
  const revenueRow: FlowchartRow = {
    label: "Revenue",
    colour: REVENUE_COLOUR,
    values: trend.map((point) => point.revenue),
    imputed: trend.map(() => false),
    higherIsBetter: true,
    shareOfSpend: null,
  };
  const hasImputed = spend.some((point) => point.spendIsImputed);

  const renderRow = (row: FlowchartRow, className?: string) => (
    <tr key={row.label} className={className}>
      <th scope="row" className="whitespace-nowrap border-b border-line py-2 pr-4 text-left align-top font-semibold">
        <span className="flex h-8 items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: row.colour }} />
          {row.label}
        </span>
      </th>
      {row.values.map((value, index) => (
        <ShadeCell
          key={weeks[index]}
          value={value}
          shade={shadeFor(value, row.values)}
          colour={row.colour}
          week={index}
          isImputed={row.imputed[index] ?? false}
        />
      ))}
      <SummaryCell row={row} />
    </tr>
  );

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 id="flowchart-title" className="text-lg font-bold">
          Media flowchart
        </h2>
        <p id="flowchart-description" className="mt-0.5 max-w-3xl text-sm text-ink-soft">
          Spend by channel each week, with revenue underneath. Shading shows when each row peaked,
          not how big it is; the last column compares size.
        </p>
      </div>
      <Legend label="How to read the flowchart">
        <LegendItem
          mark={
            <span className="flex">
              {KEY_SHADES.map((shade) => (
                <span key={shade} className="h-3 w-3.5" style={{ backgroundColor: shadeOf(REVENUE_COLOUR, shade) }} />
              ))}
            </span>
          }
        >
          Row&apos;s lowest week to its highest
        </LegendItem>
        {hasImputed && (
          <LegendItem
            mark={
              <span
                className="h-3 w-6 rounded-sm"
                style={{ backgroundColor: shadeOf(REVENUE_COLOUR, 70), backgroundImage: HATCH }}
              />
            }
          >
            Includes an imputed value
          </LegendItem>
        )}
        <LegendItem mark={<KeyPill className="bg-neutral-soft text-ink-soft">&#9650;</KeyPill>}>
          Spend change, neither good nor bad
        </LegendItem>
        <LegendItem
          mark={
            <span className="flex gap-1">
              <KeyPill className="bg-good-soft text-good">&#9650;</KeyPill>
              <KeyPill className="bg-bad-soft text-bad">&#9660;</KeyPill>
            </span>
          }
        >
          Revenue rose or fell
        </LegendItem>
      </Legend>
      <div className="relative overflow-x-auto border-t-2 border-ink">
        <table
          aria-labelledby="flowchart-title"
          aria-describedby="flowchart-description"
          className="w-full min-w-[760px] table-fixed text-sm"
        >
          <colgroup>
            <col className="w-32" />
            {weeks.map((week) => (
              <col key={week} />
            ))}
            <col className="w-44" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="border-b border-line py-2 text-left text-xs font-semibold text-ink-soft">
                Week of
              </th>
              {weeks.map((week) => (
                <th key={week} scope="col" className="border-b border-line py-2 text-center text-xs font-semibold text-ink-soft">
                  {formatWeek(week)}
                </th>
              ))}
              <th scope="col" className="border-b border-line py-2 pl-4 text-left text-xs font-semibold text-ink-soft">
                Change, {formatWeek(weeks[0]!)} to {formatWeek(weeks.at(-1)!)}
              </th>
            </tr>
          </thead>
          <tbody>
            {channelRows.map((row) => renderRow(row))}
            {renderRow(revenueRow, "border-t-2 border-ink")}
          </tbody>
        </table>
      </div>
    </section>
  );
}
