"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h1 className="text-lg font-semibold">The data could not be loaded</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Check that Postgres is running with <code>docker compose up -d --wait</code>, then try
        again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </section>
  );
}
