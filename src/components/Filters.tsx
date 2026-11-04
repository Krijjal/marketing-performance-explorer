import type { FilterOptions, Filters } from "../analytics/filters";

// The filters read as one sentence, so each control carries its own label for
// screen readers and the words around it carry the meaning for everyone else.
const FIELD_CLASS =
  "rounded-md border border-line bg-surface px-2 py-1 font-semibold text-ink transition-colors hover:border-ink-soft";

interface SelectFieldProps {
  label: string;
  name: string;
  value: string | null;
  choices: string[];
  allLabel: string;
}

function SelectField({ label, name, value, choices, allLabel }: SelectFieldProps) {
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={label} className={FIELD_CLASS}>
      <option value="">{allLabel}</option>
      {choices.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
}

interface DateFieldProps {
  label: string;
  name: string;
  value: string;
  options: FilterOptions;
}

export function DateField({ label, name, value, options }: DateFieldProps) {
  return (
    <input
      type="date"
      name={name}
      aria-label={label}
      defaultValue={value}
      min={options.firstWeek}
      max={options.lastWeek}
      className={FIELD_CLASS}
    />
  );
}

// A phrase wraps as a unit, so the sentence breaks between phrases, not inside one.
export function Phrase({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-3">{children}</span>;
}

export function CategoryFields({
  lead,
  filters,
  options,
}: {
  lead: string;
  filters: Filters;
  options: FilterOptions;
}) {
  return (
    <Phrase>
      <span>{lead}</span>
      <SelectField label="Brand" name="brand" value={filters.brand} choices={options.brands} allLabel="all brands" />
      <span>in</span>
      <SelectField label="Market" name="market" value={filters.market} choices={options.markets} allLabel="all markets" />
      <span>across</span>
      <SelectField label="Channel" name="channel" value={filters.channel} choices={options.channels} allLabel="all channels" />
    </Phrase>
  );
}

export function ApplyButton() {
  return (
    <button
      type="submit"
      className="ml-1 rounded-md bg-accent px-4 py-1.5 text-base font-semibold text-white transition hover:bg-accent-strong active:scale-[0.98]"
    >
      Apply
    </button>
  );
}

export const FILTER_FORM_CLASS = "flex flex-wrap items-center gap-x-3 gap-y-3 text-lg text-ink-soft";
