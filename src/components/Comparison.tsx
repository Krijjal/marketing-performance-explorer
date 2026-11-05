import type { CSSProperties } from "react";
import type { DriverAlignment, DriverChange } from "../analytics/periodComparison";
import { ChangeBadge, type Tone } from "./ChangeBadge";
import { formatDecimal, formatPercent } from "./format";

const PERIOD_A = "#64728c";

const TONE_COLOUR: Record<Tone, string> = {
  good: "#237032",
  bad: "#c92a2a",
  neutral: "#2f5bd3",
};

export function PeriodTag({ period }: { period: "A" | "B" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${period === "A" ? "bg-period-a" : "bg-accent"}`}
    >
      {period}
    </span>
  );
}

// Two bars on one scale, so the size of a change is seen before it is read.
export function PairBars({ valueA, valueB, format }: { valueA: number | null; valueB: number | null; format: (value: number | null) => string }) {
  const high = Math.max(valueA ?? 0, valueB ?? 0);
  const width = (value: number | null) => (value === null || high <= 0 ? 0 : (Math.max(value, 0) / high) * 100);
  const rows = [
    { period: "A" as const, value: valueA, colour: PERIOD_A },
    { period: "B" as const, value: valueB, colour: "#2f5bd3" },
  ];
  return (
    <div className="flex flex-col gap-1.5" aria-hidden="true">
      {rows.map((row, index) => (
        <div key={row.period} className="flex items-center gap-2 text-[11px] text-ink-soft">
          <span className="w-2.5 font-bold" style={{ color: row.colour }}>
            {row.period}
          </span>
          <span className="h-2 flex-1 rounded-full bg-neutral-soft">
            <span
              className="bar-grow block h-full rounded-full"
              style={{ "--row": index, width: `${width(row.value)}%`, backgroundColor: row.colour } as CSSProperties}
            />
          </span>
          <span className="figures w-16 text-right">{format(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

const ALIGNMENT_TEXT: Record<DriverAlignment, string> = {
  with: "Consistent with the revenue change",
  against: "Runs against the revenue change",
  flat: "No change",
  unknown: "Cannot say",
};

function formatDriverValue(driver: DriverChange, value: number | null): string {
  return driver.unit === "percent" ? formatPercent(value) : formatDecimal(value);
}

// The drivers come in different units, so the bars compare each one's change
// relative to its own period A value. The figures beside them keep the amounts.
function relativeChange(driver: DriverChange): number | null {
  const { periodA: a, periodB: b } = driver;
  return a === null || b === null || a === 0 ? null : (b - a) / Math.abs(a);
}

function DivergingBar({ change, scale, tone, index }: { change: number | null; scale: number; tone: Tone; index: number }) {
  const width = change === null || scale === 0 ? 0 : (Math.abs(change) / scale) * 50;
  const rises = (change ?? 0) >= 0;
  const label = change === null ? "n/a" : `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change * 100).toFixed(1)}%`;
  return (
    <div aria-hidden="true" className="relative h-7">
      <span className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
      <span
        className="bar-grow absolute top-1/2 h-3.5 -translate-y-1/2"
        style={
          {
            "--row": index,
            left: rises ? "50%" : `${50 - width}%`,
            width: `${Math.max(width, change ? 0.6 : 0)}%`,
            backgroundColor: TONE_COLOUR[tone],
            borderRadius: rises ? "0 4px 4px 0" : "4px 0 0 4px",
            transformOrigin: rises ? "left" : "right",
          } as CSSProperties
        }
      />
      <span
        className="figures absolute top-1/2 -translate-y-1/2 text-xs font-semibold whitespace-nowrap"
        style={
          rises
            ? { left: `calc(${50 + width}% + 6px)`, color: TONE_COLOUR[tone] }
            : { right: `calc(${50 + width}% + 6px)`, color: TONE_COLOUR[tone] }
        }
      >
        {label}
      </span>
    </div>
  );
}

export function DriverList({ drivers, toneOf }: { drivers: DriverChange[]; toneOf: (driver: DriverChange) => Tone }) {
  // Leaves room at each end for the label beside the longest bar.
  const scale = Math.max(...drivers.map((driver) => Math.abs(relativeChange(driver) ?? 0)), 0) * 1.35;
  return (
    <ul className="divide-y divide-line border-t border-line">
      {drivers.map((driver, index) => {
        const tone = toneOf(driver);
        return (
          <li
            key={driver.label}
            className="grid grid-cols-1 items-center gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-page sm:px-6 md:grid-cols-[minmax(12rem,1fr)_minmax(10rem,1.4fr)_minmax(12rem,1fr)]"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{driver.label}</span>
              <span className="figures text-xs text-ink-soft">
                <span className="font-semibold text-period-a">A</span> {formatDriverValue(driver, driver.periodA)}
                <span className="mx-1.5" aria-hidden="true">
                  →
                </span>
                <span className="sr-only">to</span>
                <span className="font-semibold text-accent">B</span> {formatDriverValue(driver, driver.periodB)}
              </span>
            </div>
            <DivergingBar change={relativeChange(driver)} scale={scale} tone={tone} index={index} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <ChangeBadge
                change={driver.change}
                format={driver.unit === "percent" ? "points" : "number"}
                tone={tone}
                label={driver.label}
              />
              <span className="text-sm text-ink-soft">{ALIGNMENT_TEXT[driver.alignment]}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
