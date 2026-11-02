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

export function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return NOT_APPLICABLE;
  }
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

export function formatWeek(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
