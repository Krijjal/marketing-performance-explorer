import type { ReactNode } from "react";

// A key sits directly under a chart's title, so it is read before the marks are.
export function Legend({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-soft">
      {children}
    </ul>
  );
}

export function LegendItem({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className="flex items-center">
        {mark}
      </span>
      {children}
    </li>
  );
}
