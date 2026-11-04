import Link from "next/link";

const PAGES = [
  { href: "/", label: "Overview" },
  { href: "/compare", label: "Compare periods" },
  { href: "/data-quality", label: "Data quality" },
];

interface PageHeaderProps {
  currentPath: string;
  title: string;
  query: string;
}

export function PageHeader({ currentPath, title, query }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-sm text-ink-soft">Marketing Performance Explorer</p>
      </div>
      <nav className="flex gap-6 border-b border-line text-sm" aria-label="Pages">
        {PAGES.map((page) => (
          <Link
            key={page.href}
            href={query ? `${page.href}?${query}` : page.href}
            aria-current={page.href === currentPath ? "page" : undefined}
            className={
              page.href === currentPath
                ? "tab-active relative pb-2 font-semibold text-ink"
                : "relative pb-2 text-ink-soft transition-colors duration-150 hover:text-ink"
            }
          >
            {page.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
