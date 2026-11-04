"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="max-w-xl border-l-4 border-bad py-2 pl-4">
      <h1 className="text-xl font-bold">The data could not be loaded</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Check that Postgres is running with <code>docker compose up -d --wait</code>, then try
        again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-[0.98]"
      >
        Try again
      </button>
    </section>
  );
}
