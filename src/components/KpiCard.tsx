import type { ReactNode } from "react";

const VALUE_TONE_CLASS = {
  good: "text-good",
  bad: "text-bad",
} as const;

const LEDGER_COLUMNS = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  6: "lg:grid-cols-6",
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
      className={`grid grid-cols-2 gap-px border-y border-line bg-line ${LEDGER_COLUMNS[columns]}`}
    >
      {children}
    </section>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  note?: string;
  imputedValues?: number;
  change?: ReactNode;
  valueTone?: keyof typeof VALUE_TONE_CLASS;
}

export function KpiCard({ label, value, note, imputedValues = 0, change, valueTone }: KpiCardProps) {
  return (
    <div className="bg-page px-1 py-4 sm:px-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${valueTone ? VALUE_TONE_CLASS[valueTone] : ""}`}
      >
        {value}
      </p>
      {change && <div className="mt-1.5">{change}</div>}
      {note && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
      {imputedValues > 0 && (
        <p className="mt-2 inline-block rounded bg-notice px-1.5 py-0.5 text-xs">
          {imputedValues} imputed value{imputedValues === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
