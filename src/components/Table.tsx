import { useId, type ReactNode } from "react";

interface TableProps {
  caption: string;
  description?: string;
  children: ReactNode;
}

// The horizontal scroll stays inside the table on phones, never on the page. The
// caption sits outside the scroll area so it wraps instead of scrolling away, and
// "relative" keeps absolutely positioned screen-reader text inside the scroll box.
export function Table({ caption, description, children }: TableProps) {
  const id = useId();
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 id={`${id}-caption`} className="text-lg font-bold">
          {caption}
        </h2>
        {description && (
          <p id={`${id}-description`} className="mt-0.5 max-w-3xl text-sm text-ink-soft">
            {description}
          </p>
        )}
      </div>
      <div className="relative overflow-x-auto border-t-2 border-ink">
        <table
          aria-labelledby={`${id}-caption`}
          aria-describedby={description ? `${id}-description` : undefined}
          className="w-full text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-neutral-soft"
        >
          {children}
        </table>
      </div>
    </section>
  );
}

export function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="whitespace-nowrap border-b border-line px-3 py-2 text-xs font-semibold text-ink-soft first:pl-0">
      {children}
    </th>
  );
}

export function Cell({ children }: { children: ReactNode }) {
  return <td className="border-b border-line px-3 py-2.5 first:pl-0">{children}</td>;
}
