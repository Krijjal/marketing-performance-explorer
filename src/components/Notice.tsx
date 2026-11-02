import type { ReactNode } from "react";

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-notice-line bg-notice px-4 py-3 text-sm">{children}</p>
  );
}

export function NoDataYet() {
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h1 className="text-lg font-semibold">No data has been loaded yet</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Run <code>pnpm migrate</code> and then <code>pnpm ingest</code>, and reload this page.
      </p>
    </section>
  );
}
