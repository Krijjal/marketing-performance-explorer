const NOT_APPLICABLE = "n/a";

// No currency symbol: the dataset has no currency column, so a symbol would be a guess.
export function formatNumber(value: number | null): string {
  if (value === null) {
    return NOT_APPLICABLE;
  }
  return value.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

export function formatDecimal(value: number | null, digits = 2): string {
  if (value === null) {
    return NOT_APPLICABLE;
  }
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return NOT_APPLICABLE;
  }
  return `${(value * 100).toFixed(2)}%`;
}

export function formatWeek(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Chooses the word for one count, so "1 value" and "2 values" read correctly.
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// One decimal place for thousands, so 2,500 reads "2.5k" rather than rounding to "3k".
export function formatAxis(value: number): string {
  if (value < 1000) {
    return String(value);
  }
  const thousands = value / 1000;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
}
