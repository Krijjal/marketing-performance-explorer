import type { ReactNode } from "react";

export function Notice({ children }: { children: ReactNode }) {
  return <p className="max-w-3xl border-l-4 border-notice-line bg-notice px-4 py-3 text-sm">{children}</p>;
}

export function NoDataYet() {
  return (
    <section className="max-w-xl border-l-4 border-line py-2 pl-4">
      <h1 className="text-xl font-bold">No data has been loaded yet</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Run <code>pnpm migrate</code> and then <code>pnpm ingest</code>, and reload this page.
      </p>
    </section>
  );
}
