"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { channelColour, INK } from "./channelColours";
import { formatAxis, formatDecimal, formatNumber, formatWeek } from "./format";
import { useReducedMotion } from "./useReducedMotion";

const AXIS = "#5a6578";
const GRID = "#e6ecf4";
const CHART_HEIGHT = 340;

export interface PerformanceWeek {
  weekStart: string;
  revenue: number;
  totalSpend: number | null;
  // Null under a channel filter: one channel's spend cannot claim all revenue.
  roas: number | null;
  spendIsImputed: boolean;
  channels: Record<string, { spend: number; imputed: boolean }>;
}

function hatchId(channel: string): string {
  return `hatch-${channel.replace(/\W+/g, "-")}`;
}

function SwatchKey({ colour }: { colour: string }) {
  return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: colour }} />;
}

interface TooltipProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  channels: string[];
}

// One card per week with everything the bars and line say about it, so no one
// has to read two axes to compare revenue with spend.
function WeekTooltip({ active, payload, channels }: TooltipProps) {
  const week = payload?.[0]?.payload as PerformanceWeek | undefined;
  if (!active || !week) {
    return null;
  }
  return (
    <div className="figures min-w-56 rounded-lg border border-line bg-surface p-3 text-xs shadow-lg shadow-ink/10">
      <p className="font-semibold text-ink">Week of {formatWeek(week.weekStart)}</p>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
        <dt className="flex items-center gap-2 font-semibold text-ink">
          <span aria-hidden="true" className="h-0.5 w-3 bg-ink" />
          Revenue
        </dt>
        <dd className="text-right font-semibold text-ink">{formatNumber(week.revenue)}</dd>
        {channels.map((channel) => {
          const point = week.channels[channel];
          return (
            <div key={channel} className="contents">
              <dt className="flex items-center gap-2 text-ink-soft">
                <SwatchKey colour={channelColour(channel)} />
                {channel}
                {point?.imputed && <span className="rounded bg-notice px-1 text-[10px] text-notice-ink">imputed</span>}
              </dt>
              <dd className="text-right text-ink">{formatNumber(point?.spend ?? null)}</dd>
            </div>
          );
        })}
        <dt className="mt-1 border-t border-line pt-1 text-ink-soft">Media spend</dt>
        <dd className="mt-1 border-t border-line pt-1 text-right text-ink">{formatNumber(week.totalSpend)}</dd>
        <dt className="text-ink-soft">ROAS</dt>
        <dd className="text-right font-semibold text-accent">{formatDecimal(week.roas)}</dd>
      </dl>
    </div>
  );
}

export function PerformanceChart({ weeks, channels }: { weeks: PerformanceWeek[]; channels: string[] }) {
  const reducedMotion = useReducedMotion();
  const topChannel = channels.at(-1);
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <ComposedChart data={weeks} margin={{ top: 12, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
        <defs>
          {channels.map((channel) => (
            <pattern
              key={channel}
              id={hatchId(channel)}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill={channelColour(channel)} fillOpacity={0.45} />
              <line x1="0" y1="0" x2="0" y2="6" stroke={channelColour(channel)} strokeWidth="3" />
            </pattern>
          ))}
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatWeek}
          tick={{ fontSize: 12, fill: AXIS }}
          stroke={GRID}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          yAxisId="spend"
          tickFormatter={formatAxis}
          tick={{ fontSize: 12, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <YAxis
          yAxisId="revenue"
          orientation="right"
          tickFormatter={formatAxis}
          tick={{ fontSize: 12, fill: INK, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "#17233b", fillOpacity: 0.05 }}
          content={({ active, payload }) => <WeekTooltip active={active} payload={payload} channels={channels} />}
        />
        {channels.map((channel) => (
          <Bar
            key={channel}
            yAxisId="spend"
            stackId="spend"
            name={channel}
            dataKey={(week: PerformanceWeek) => week.channels[channel]?.spend ?? 0}
            fill={channelColour(channel)}
            radius={channel === topChannel ? [4, 4, 0, 0] : 0}
            isAnimationActive={!reducedMotion}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {weeks.map((week) => (
              <Cell
                key={week.weekStart}
                fill={week.channels[channel]?.imputed ? `url(#${hatchId(channel)})` : channelColour(channel)}
              />
            ))}
          </Bar>
        ))}
        <Line
          yAxisId="revenue"
          dataKey="revenue"
          name="Revenue"
          stroke={INK}
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#ffffff", stroke: INK, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: INK, stroke: "#ffffff", strokeWidth: 2 }}
          isAnimationActive={!reducedMotion}
          animationDuration={900}
          animationBegin={300}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
