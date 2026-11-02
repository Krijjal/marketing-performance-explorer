import type { FilterOptions, Filters } from "../analytics/filters";

const FIELD_CLASS = "rounded-md border border-line bg-white px-3 py-2 text-sm";

interface SelectFieldProps {
  label: string;
  name: string;
  value: string | null;
  choices: string[];
  allLabel: string;
}

function SelectField({ label, name, value, choices, allLabel }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
      {label}
      <select name={name} defaultValue={value ?? ""} className={FIELD_CLASS}>
        <option value="">{allLabel}</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </label>
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
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
      {label}
      <input
        type="date"
        name={name}
        defaultValue={value}
        min={options.firstWeek}
        max={options.lastWeek}
        className={FIELD_CLASS}
      />
    </label>
  );
}

export function CategoryFields({ filters, options }: { filters: Filters; options: FilterOptions }) {
  return (
    <>
      <SelectField label="Brand" name="brand" value={filters.brand} choices={options.brands} allLabel="All brands" />
      <SelectField label="Market" name="market" value={filters.market} choices={options.markets} allLabel="All markets" />
      <SelectField label="Channel" name="channel" value={filters.channel} choices={options.channels} allLabel="All channels" />
    </>
  );
}

export function ApplyButton() {
  return (
    <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
      Apply
    </button>
  );
}

export const FILTER_FORM_CLASS =
  "grid grid-cols-1 items-end gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6";
