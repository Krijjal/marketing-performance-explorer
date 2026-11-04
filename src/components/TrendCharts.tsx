"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyTrendPoint } from "../analytics/trends";
import { ChangeBadge, toneFor } from "./ChangeBadge";
import { INK } from "./channelColours";
import { formatAxis, formatNumber, formatWeek } from "./format";
import { Legend, LegendItem } from "./Legend";
import { useReducedMotion } from "./useReducedMotion";

const AXIS = "#5a6578";
const GRID = "#dce4ef";
const CHART_HEIGHT = 240;
const ANIMATION = { animationDuration: 900, animationEasing: "ease-out" } as const;


interface ChartFrameProps {
  title: string;
  legend?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactElement;
}

function ChartFrame({ title, legend, badge, children }: ChartFrameProps) {
  return (
    <figure className="border-t-2 border-ink pt-3">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <span className="flex flex-col gap-1">
          <span className="text-lg font-bold">{title}</span>
          {legend}
        </span>
        {badge}
      </figcaption>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        {children}
      </ResponsiveContainer>
    </figure>
  );
}

function weekLabel(week: unknown): string {
  return typeof week === "string" ? `Week of ${formatWeek(week)}` : "";
}

interface PeriodChangeProps {
  label: string;
  points: WeeklyTrendPoint[];
  value: (point: WeeklyTrendPoint) => number | null;
  higherIsBetter: boolean | null;
}

// The change from the first to the last week in view, so the header says which
// way the line went before anyone reads the axis.
function PeriodChange({ label, points, value, higherIsBetter }: PeriodChangeProps) {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || first === last) {
    return null;
  }
  const start = value(first);
  const end = value(last);
  const change = start === null || end === null || start === 0 ? null : (end - start) / start;
  return (
    <span className="flex flex-col items-end gap-0.5">
      <ChangeBadge change={change} format="percent" tone={toneFor(change, higherIsBetter)} label={label} />
      <span className="text-xs font-normal text-ink-soft">
        {formatWeek(first.weekStart)} to {formatWeek(last.weekStart)}
      </span>
    </span>
  );
}

// Drawn exactly as the chart draws its points, so the key matches the marks.
function PointMark({ hollow }: { hollow: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14">
      <circle cx="8" cy="8" r={hollow ? 6 : 3} fill={hollow ? "#ffffff" : INK} stroke={INK} strokeWidth={2} />
    </svg>
  );
}

interface SpendDotProps {
  key?: React.Key | null;
  cx?: number;
  cy?: number;
  payload?: WeeklyTrendPoint;
}

// A hollow point marks a week containing an estimate, so it is visible on the chart.
function renderSpendDot({ key, cx, cy, payload }: SpendDotProps) {
  const isImputed = payload?.spendIsImputed ?? false;
  return (
    <circle
      key={key ?? undefined}
      cx={cx}
      cy={cy}
      r={isImputed ? 6 : 3}
      fill={isImputed ? "#ffffff" : INK}
      stroke={INK}
      strokeWidth={2}
    />
  );
}

export function RevenueChart({ points }: { points: WeeklyTrendPoint[] }) {
  const reducedMotion = useReducedMotion();
  const badge = (
    <PeriodChange label="Revenue, first to last week" points={points} value={(point) => point.revenue} higherIsBetter />
  );
  const legend = (
    <Legend label="Chart key">
      <LegendItem mark={<PointMark hollow={false} />}>Weekly total</LegendItem>
    </Legend>
  );
  return (
    <ChartFrame title="Revenue per week" legend={legend} badge={badge}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="weekStart" tickFormatter={formatWeek} tick={{ fontSize: 12 }} stroke={AXIS} />
        <YAxis tickFormatter={formatAxis} tick={{ fontSize: 12 }} stroke={AXIS} width={44} />
        <Tooltip labelFormatter={weekLabel} formatter={(value) => [formatNumber(Number(value)), "Revenue"]} />
        <Line
          dataKey="revenue"
          stroke={INK}
          strokeWidth={2}
          dot={{ r: 3, fill: INK }}
          activeDot={{ r: 6 }}
          isAnimationActive={!reducedMotion}
          {...ANIMATION}
        />
      </LineChart>
    </ChartFrame>
  );
}

export function SpendChart({ points }: { points: WeeklyTrendPoint[] }) {
  const reducedMotion = useReducedMotion();
  const badge = (
    <PeriodChange
      label="Media spend, first to last week"
      points={points}
      value={(point) => point.mediaSpend}
      higherIsBetter={null}
    />
  );
  const legend = (
    <Legend label="Chart key">
      <LegendItem mark={<PointMark hollow={false} />}>Weekly total</LegendItem>
      {points.some((point) => point.spendIsImputed) && (
        <LegendItem mark={<PointMark hollow />}>Includes an imputed value</LegendItem>
      )}
    </Legend>
  );
  return (
    <ChartFrame title="Media spend per week" legend={legend} badge={badge}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="weekStart" tickFormatter={formatWeek} tick={{ fontSize: 12 }} stroke={AXIS} />
        <YAxis tickFormatter={formatAxis} tick={{ fontSize: 12 }} stroke={AXIS} width={44} />
        <Tooltip
          labelFormatter={weekLabel}
          formatter={(value, _name, item) => [
            formatNumber(Number(value)),
            (item.payload as WeeklyTrendPoint).spendIsImputed ? "Spend (includes imputed)" : "Spend",
          ]}
        />
        <Line
          dataKey="mediaSpend"
          stroke={INK}
          strokeWidth={2}
          dot={renderSpendDot}
          activeDot={{ r: 6 }}
          isAnimationActive={!reducedMotion}
          {...ANIMATION}
        />
      </LineChart>
    </ChartFrame>
  );
}
