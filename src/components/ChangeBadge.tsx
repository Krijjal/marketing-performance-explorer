import type { DriverAlignment } from "../analytics/periodComparison";
import { formatDecimal } from "./format";

export type Tone = "good" | "bad" | "neutral";

// higherIsBetter is null for measures like media spend, where a rise is not good
// or bad on its own.
export function toneFor(change: number | null, higherIsBetter: boolean | null): Tone {
  if (change === null || change === 0 || higherIsBetter === null) {
    return "neutral";
  }
  return change > 0 === higherIsBetter ? "good" : "bad";
}

// A driver that moved "with" a revenue rise normally helps revenue, and one that
// moved "with" a fall normally hurts it.
export function driverTone(alignment: DriverAlignment, revenueChange: number | null): Tone {
  if ((alignment !== "with" && alignment !== "against") || !revenueChange) {
    return "neutral";
  }
  return (alignment === "with") === revenueChange > 0 ? "good" : "bad";
}

const TONE_CLASS: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-neutral-soft text-ink-soft",
};

const TONE_TEXT: Record<Tone, string> = {
  good: "favourable",
  bad: "unfavourable",
  neutral: "neutral",
};

export type ChangeFormat = "percent" | "points" | "number";

function formatMagnitude(value: number, format: ChangeFormat): string {
  if (format === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (format === "points") {
    return `${(value * 100).toFixed(2)} pts`;
  }
  return formatDecimal(value);
}

// The sign comes from the change and the colour from the tone, so colour is never
// the only cue.
export function formatChange(change: number, format: ChangeFormat): string {
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${sign}${formatMagnitude(Math.abs(change), format)}`;
}

function Arrow({ change }: { change: number }) {
  const path = change > 0 ? "M5 1 L9 8 H1 Z" : change < 0 ? "M5 9 L9 2 H1 Z" : "M1 4 H9 V6 H1 Z";
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" className="shrink-0 fill-current">
      <path d={path} />
    </svg>
  );
}

interface ChangeBadgeProps {
  change: number | null;
  format: ChangeFormat;
  tone: Tone;
  label: string;
}

export function ChangeBadge({ change, format, tone, label }: ChangeBadgeProps) {
  const text = change === null ? "n/a" : formatChange(change, format);
  return (
    <span
      role="img"
      aria-label={`${label}: ${text}, ${change === null ? "no comparison" : TONE_TEXT[tone]}`}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[change === null ? "neutral" : tone]}`}
    >
      {change !== null && <Arrow change={change} />}
      {text}
    </span>
  );
}
