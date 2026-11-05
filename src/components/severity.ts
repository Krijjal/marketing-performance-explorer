export const SEVERITIES = ["error", "warning", "info"] as const;

// Bars carry the colour; chips pair a soft fill with text dark enough to read.
export const SEVERITY_STYLE: Record<string, { bar: string; chip: string; label: string }> = {
  error: { bar: "#c92a2a", chip: "bg-bad-soft text-bad", label: "Error" },
  warning: { bar: "#e2b85c", chip: "bg-notice text-notice-ink", label: "Warning" },
  info: { bar: "#8a96ad", chip: "bg-neutral-soft text-ink-soft", label: "Info" },
};

export function severityStyle(severity: string) {
  return SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.info!;
}

// "missing_value_imputed" reads as "Missing value imputed".
export function humanize(code: string): string {
  const words = code.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
