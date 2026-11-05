import type { ReactNode } from "react";

type Align = "left" | "right";

// The first and last cells carry the panel's side padding, so a table can run
// edge to edge inside a panel and still line up with its title.
const EDGE = "first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6";

export function HeaderCell({ children, align = "left" }: { children: ReactNode; align?: Align }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-line bg-page px-3 py-2.5 text-xs font-semibold text-ink-soft ${EDGE} ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

export function Cell({ children, align = "left" }: { children: ReactNode; align?: Align }) {
  return (
    <td className={`border-b border-line px-3 py-3 ${EDGE} ${align === "right" ? "figures text-right" : ""}`}>
      {children}
    </td>
  );
}
