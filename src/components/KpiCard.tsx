interface KpiCardProps {
  label: string;
  value: string;
  note?: string;
  imputedValues?: number;
}

export function KpiCard({ label, value, note, imputedValues = 0 }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
      {imputedValues > 0 && (
        <p className="mt-2 inline-block rounded border border-notice-line bg-notice px-2 py-0.5 text-xs">
          Includes {imputedValues} imputed value{imputedValues === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
