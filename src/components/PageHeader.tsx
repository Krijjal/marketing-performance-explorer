import Link from "next/link";
import type { ReactNode } from "react";

const PAGES = [
  { href: "/", label: "Overview" },
  { href: "/compare", label: "Compare periods" },
  { href: "/data-quality", label: "Data quality" },
];

export const CONTAINER_CLASS = "mx-auto w-full max-w-6xl px-4 sm:px-6";

// A small ruled grid with one filled week: the planning sheet the app is modelled on.
function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#2f5bd3" />
      <path d="M6 16.5h3V12H6zM10.5 16.5h3V7.5h-3zM15 16.5h3V10h-3z" fill="#ffffff" />
    </svg>
  );
}

function Masthead({ currentPath, query }: { currentPath: string; query: string }) {
  return (
    <div className="bg-masthead text-white">
      <div className={`${CONTAINER_CLASS} flex flex-wrap items-center justify-between gap-x-8 gap-y-2 pt-3 sm:pt-0`}>
        <Link
          href={query ? `/?${query}` : "/"}
          className="flex items-center gap-2.5 py-1 text-sm font-semibold tracking-tight"
        >
          <Mark />
          Marketing Performance Explorer
        </Link>
        <nav className="-mb-px flex gap-6 overflow-x-auto text-sm" aria-label="Pages">
          {PAGES.map((page) => (
            <Link
              key={page.href}
              href={query ? `${page.href}?${query}` : page.href}
              aria-current={page.href === currentPath ? "page" : undefined}
              className={
                page.href === currentPath
                  ? "tab-active relative whitespace-nowrap py-4 font-semibold text-white"
                  : "relative whitespace-nowrap py-4 text-masthead-soft transition-colors duration-150 hover:text-white"
              }
            >
              {page.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

interface PageShellProps {
  currentPath: string;
  title: string;
  description?: ReactNode;
  query: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ currentPath, title, description, query, actions, children }: PageShellProps) {
  return (
    <>
      <header>
        <Masthead currentPath={currentPath} query={query} />
        <div className="border-b border-line bg-surface">
          <div className={`${CONTAINER_CLASS} flex flex-wrap items-end justify-between gap-x-8 gap-y-4 py-7`}>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
              {description && <p className="max-w-2xl text-sm text-ink-soft text-pretty">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
        </div>
      </header>
      <main className={`${CONTAINER_CLASS} flex flex-col gap-10 py-8`}>{children}</main>
    </>
  );
}
