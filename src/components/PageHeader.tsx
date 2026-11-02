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
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-ink-soft">Marketing Performance Explorer</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <nav className="flex flex-wrap gap-1 text-sm" aria-label="Pages">
        {PAGES.map((page) => (
          <Link
            key={page.href}
            href={query ? `${page.href}?${query}` : page.href}
            aria-current={page.href === currentPath ? "page" : undefined}
            className={
              page.href === currentPath
                ? "rounded-md bg-ink px-3 py-2 text-white"
                : "rounded-md px-3 py-2 text-ink-soft hover:bg-line"
            }
          >
            {page.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
