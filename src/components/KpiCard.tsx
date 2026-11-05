import type { ReactNode } from "react";

const VALUE_TONE_CLASS = {
  good: "text-good",
  bad: "text-bad",
} as const;

const LEDGER_COLUMNS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  6: "sm:grid-cols-3 lg:grid-cols-6",
} as const;

// One ruled row of figures, like the totals line of a planning sheet. The gap
// shows the line colour behind the cells, so the rules follow any wrapping.
export function KpiLedger({
  label,
  columns,
  children,
}: {
  label: string;
  columns: keyof typeof LEDGER_COLUMNS;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={`grid flex-1 grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line ${LEDGER_COLUMNS[columns]}`}
    >
      {children}
    </section>
  );
}

// A titled ledger, so related figures read as one group.
export function KpiGroup({
  title,
  columns,
  children,
}: {
  title: string;
  columns: keyof typeof LEDGER_COLUMNS;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="text-sm font-semibold text-ink-soft">{title}</h2>
      <KpiLedger label={title} columns={columns}>
        {children}
      </KpiLedger>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  note?: string;
  imputedValues?: number;
  change?: ReactNode;
  valueTone?: keyof typeof VALUE_TONE_CLASS;
  chart?: ReactNode;
}

export function KpiCard({ label, value, note, imputedValues = 0, change, valueTone, chart }: KpiCardProps) {
  return (
    <div className="flex min-w-0 flex-col bg-surface p-4 sm:p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p
        className={`figures mt-1 truncate text-2xl font-bold tracking-tight sm:text-[1.75rem] ${valueTone ? VALUE_TONE_CLASS[valueTone] : ""}`}
      >
        {value}
      </p>
      {change && <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">{change}</div>}
      {note && <p className="mt-1.5 text-xs text-ink-soft">{note}</p>}
      {imputedValues > 0 && (
        <p className="mt-2 self-start rounded bg-notice px-1.5 py-0.5 text-xs text-notice-ink">
          {imputedValues} imputed value{imputedValues === 1 ? "" : "s"}
        </p>
      )}
      {chart && <div className="mt-auto pt-4">{chart}</div>}
    </div>
  );
}
