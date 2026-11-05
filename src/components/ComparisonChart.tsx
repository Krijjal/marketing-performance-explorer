"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INK } from "./channelColours";
import { formatAxis, formatNumber, formatWeek } from "./format";
import { useReducedMotion } from "./useReducedMotion";

const AXIS = "#5a6578";
const GRID = "#e6ecf4";
const PERIOD_A = "#64728c";
const PERIOD_B = "#2f5bd3";

export interface ChartPeriod {
  firstWeek: string;
  lastWeek: string;
  revenuePerWeek: number | null;
}

interface ComparisonChartProps {
  weeks: { weekStart: string; revenue: number }[];
  periodA: ChartPeriod | null;
  periodB: ChartPeriod | null;
}

function periodLayers(period: ChartPeriod | null, colour: string, name: string) {
  if (!period) {
    return null;
  }
  return [
    <ReferenceArea
      key={`${name}-area`}
      x1={period.firstWeek}
      x2={period.lastWeek}
      fill={colour}
      fillOpacity={0.08}
      stroke="none"
      label={{ value: name, position: "insideTop", fill: colour, fontSize: 12, fontWeight: 700 }}
    />,
    period.revenuePerWeek !== null && (
      <ReferenceLine
        key={`${name}-average`}
        segment={[
          { x: period.firstWeek, y: period.revenuePerWeek },
          { x: period.lastWeek, y: period.revenuePerWeek },
        ]}
        stroke={colour}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
    ),
  ];
}

// Weekly revenue across both periods, each shaded, with its weekly average drawn
// across it, so the gap between the two dashed lines is the headline change.
export function ComparisonChart({ weeks, periodA, periodB }: ComparisonChartProps) {
  const reducedMotion = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={weeks} margin={{ top: 24, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        {periodLayers(periodA, PERIOD_A, "A")}
        {periodLayers(periodB, PERIOD_B, "B")}
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatWeek}
          tick={{ fontSize: 12, fill: AXIS }}
          stroke={GRID}
          tickLine={false}
          tickMargin={8}
        />
        {/* Not from zero: the story is the gap between the periods, and the
            labelled axis keeps the cropped scale honest. */}
        <YAxis
          domain={[(min: number) => Math.floor((min * 0.9) / 10_000) * 10_000, (max: number) => Math.ceil((max * 1.04) / 10_000) * 10_000]}
          tickFormatter={formatAxis}
          tick={{ fontSize: 12, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ stroke: INK, strokeOpacity: 0.2 }}
          content={({ active, payload }) => {
            const week = payload?.[0]?.payload as { weekStart: string; revenue: number } | undefined;
            if (!active || !week) {
              return null;
            }
            return (
              <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg shadow-ink/10">
                <p className="font-semibold">Week of {formatWeek(week.weekStart)}</p>
                <p className="mt-1 text-ink-soft">
                  Revenue <span className="ml-3 font-semibold text-ink">{formatNumber(week.revenue)}</span>
                </p>
              </div>
            );
          }}
        />
        <Area
          dataKey="revenue"
          stroke={INK}
          strokeWidth={2.5}
          fill={INK}
          fillOpacity={0.05}
          dot={{ r: 3.5, fill: "#ffffff", stroke: INK, strokeWidth: 2 }}
          activeDot={{ r: 5.5, fill: INK, stroke: "#ffffff", strokeWidth: 2 }}
          isAnimationActive={!reducedMotion}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
