import { useId, type ReactNode } from "react";

interface PanelProps {
  title: string;
  description?: ReactNode;
  legend?: ReactNode;
  aside?: ReactNode;
  // Tables and the flowchart run to the panel's edge; charts keep the padding.
  flush?: boolean;
  children: ReactNode | ((ids: { titleId: string; descriptionId: string | undefined }) => ReactNode);
}

// A ruled sheet for one view of the data: title and key above, the marks below.
export function Panel({ title, description, legend, aside, flush = false, children }: PanelProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <section aria-labelledby={titleId} className="min-w-0 rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pt-5 sm:px-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="text-lg font-bold tracking-tight text-balance">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="max-w-2xl text-sm text-ink-soft text-pretty">
              {description}
            </p>
          )}
        </div>
        {aside && <div className="flex flex-wrap items-center gap-2">{aside}</div>}
      </div>
      {legend && <div className="px-5 pt-3 sm:px-6">{legend}</div>}
      <div className={flush ? "pt-4" : "px-3 pt-4 pb-4 sm:px-4"}>
        {typeof children === "function" ? children({ titleId, descriptionId }) : children}
      </div>
    </section>
  );
}
