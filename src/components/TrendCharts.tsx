"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChannelWeekPoint, WeeklyTrendPoint } from "../analytics/trends";
import { formatNumber, formatWeek } from "./format";

const INK = "#52514e";
const GRID = "#e2e1dc";
const CHART_HEIGHT = 240;

// Colour follows the channel, so filtering never repaints the channels that remain.
const CHANNEL_COLOURS: Record<string, string> = {
  TV: "#2a78d6",
  "Paid Search": "#eb6834",
  Social: "#1baf7a",
};

function formatAxis(value: number): string {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

function ChartFrame({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <figure className="rounded-lg border border-line bg-surface p-4">
      <figcaption className="mb-3 text-sm font-medium">{title}</figcaption>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        {children}
      </ResponsiveContainer>
    </figure>
  );
}

function weekLabel(week: unknown): string {
  return typeof week === "string" ? `Week of ${formatWeek(week)}` : "";
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
      fill={isImputed ? "#fcfcfb" : INK}
      stroke={INK}
      strokeWidth={2}
    />
  );
}

export function RevenueChart({ points }: { points: WeeklyTrendPoint[] }) {
  return (
    <ChartFrame title="Revenue per week">
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="weekStart" tickFormatter={formatWeek} tick={{ fontSize: 12 }} stroke={INK} />
        <YAxis tickFormatter={formatAxis} tick={{ fontSize: 12 }} stroke={INK} width={44} />
        <Tooltip labelFormatter={weekLabel} formatter={(value) => [formatNumber(Number(value)), "Revenue"]} />
        <Line dataKey="revenue" stroke={INK} strokeWidth={2} dot={{ r: 3, fill: INK }} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
  );
}

export function SpendChart({ points }: { points: WeeklyTrendPoint[] }) {
  return (
    <ChartFrame title="Media spend per week (hollow point includes an imputed value)">
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="weekStart" tickFormatter={formatWeek} tick={{ fontSize: 12 }} stroke={INK} />
        <YAxis tickFormatter={formatAxis} tick={{ fontSize: 12 }} stroke={INK} width={44} />
        <Tooltip
          labelFormatter={weekLabel}
          formatter={(value, _name, item) => [
            formatNumber(Number(value)),
            (item.payload as WeeklyTrendPoint).spendIsImputed ? "Spend (includes imputed)" : "Spend",
          ]}
        />
        <Line dataKey="mediaSpend" stroke={INK} strokeWidth={2} dot={renderSpendDot} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
  );
}

export function SpendByChannelChart({ points }: { points: ChannelWeekPoint[] }) {
  const channels = [...new Set(points.map((point) => point.channel))];
  const weeks = [...new Set(points.map((point) => point.weekStart))];
  const rows = weeks.map((weekStart) => ({
    weekStart,
    ...Object.fromEntries(
      points
        .filter((point) => point.weekStart === weekStart)
        .map((point) => [point.channel, point.mediaSpend]),
    ),
  }));

  return (
    <ChartFrame title="Media spend by channel">
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="weekStart" tickFormatter={formatWeek} tick={{ fontSize: 12 }} stroke={INK} />
        <YAxis tickFormatter={formatAxis} tick={{ fontSize: 12 }} stroke={INK} width={44} />
        <Tooltip
          labelFormatter={weekLabel}
          formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(channel) => <span style={{ color: INK }}>{channel}</span>}
        />
        {channels.map((channel) => (
          <Bar
            key={channel}
            dataKey={channel}
            stackId="spend"
            fill={CHANNEL_COLOURS[channel] ?? INK}
            stroke="#fcfcfb"
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}
