import type { ReactNode } from "react";

// The horizontal scroll stays inside the table on phones, never on the page.
export function Table({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <caption className="px-4 pt-4 text-left text-sm font-medium">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="whitespace-nowrap border-b border-line px-4 py-2 text-xs font-medium text-ink-soft">
      {children}
    </th>
  );
}

export function Cell({ children }: { children: ReactNode }) {
  return <td className="border-b border-line px-4 py-2 tabular-nums">{children}</td>;
}
