import type { ReactNode } from "react";
import { CONTAINER_CLASS } from "./PageHeader";

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" className="mt-px shrink-0 fill-current">
      <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm1.3 9h-2.6v-1.4h.6V10h-.6V8.6h2v4.5h.6v1.4Z" />
    </svg>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-3xl gap-3 rounded-lg border border-notice-line/60 bg-notice px-4 py-3 text-sm">
      <span className="text-notice-ink">
        <InfoIcon />
      </span>
      <p className="text-pretty">{children}</p>
    </div>
  );
}

export function NoticeStack({ children }: { children: ReactNode }) {
  return <div className="-mt-4 flex flex-col gap-2">{children}</div>;
}

export function NoDataYet() {
  return (
    <main className={`${CONTAINER_CLASS} py-16`}>
      <section className="max-w-xl rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-bold">No data has been loaded yet</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Run <code className="rounded bg-neutral-soft px-1.5 py-0.5">pnpm migrate</code> and then{" "}
          <code className="rounded bg-neutral-soft px-1.5 py-0.5">pnpm ingest</code>, and reload this page.
        </p>
      </section>
    </main>
  );
}
