import type pg from "pg";

export type SearchParams = Record<string, string | string[] | undefined>;

export interface Filters {
  startDate: string;
  endDate: string;
  brand: string | null;
  market: string | null;
  channel: string | null;
}

export interface FilterOptions {
  brands: string[];
  markets: string[];
  channels: string[];
  firstWeek: string;
  lastWeek: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Null when nothing has been ingested, which the pages show as an empty state.
export async function getFilterOptions(pool: pg.Pool): Promise<FilterOptions | null> {
  const dates = await pool.query<{ first_week: string | null; last_week: string | null }>(
    "SELECT min(week_start)::text AS first_week, max(week_start)::text AS last_week FROM v_business_weekly",
  );
  const { first_week: firstWeek, last_week: lastWeek } = dates.rows[0]!;
  if (!firstWeek || !lastWeek) {
    return null;
  }

  const brands = await pool.query<{ name: string }>("SELECT name FROM brand ORDER BY name");
  const markets = await pool.query<{ name: string }>("SELECT name FROM market ORDER BY name");
  const channels = await pool.query<{ name: string }>("SELECT name FROM channel ORDER BY id");

  return {
    brands: brands.rows.map((row) => row.name),
    markets: markets.rows.map((row) => row.name),
    channels: channels.rows.map((row) => row.name),
    firstWeek,
    lastWeek,
  };
}

// Anything invalid in the URL falls back to "all", so a hand-edited link still
// shows a sensible page. Values only ever reach SQL as bound parameters.
export function parseFilters(params: SearchParams, options: FilterOptions): Filters {
  const startDate = readDate(params.start) ?? options.firstWeek;
  const endDate = readDate(params.end) ?? options.lastWeek;
  const datesAreOrdered = startDate <= endDate;

  return {
    startDate: datesAreOrdered ? startDate : options.firstWeek,
    endDate: datesAreOrdered ? endDate : options.lastWeek,
    brand: readChoice(params.brand, options.brands),
    market: readChoice(params.market, options.markets),
    channel: readChoice(params.channel, options.channels),
  };
}

export function readDate(value: string | string[] | undefined): string | null {
  return typeof value === "string" && ISO_DATE.test(value) ? value : null;
}

function readChoice(value: string | string[] | undefined, allowed: string[]): string | null {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

export function toQueryString(filters: Filters): string {
  const query = new URLSearchParams({ start: filters.startDate, end: filters.endDate });
  if (filters.brand) {
    query.set("brand", filters.brand);
  }
  if (filters.market) {
    query.set("market", filters.market);
  }
  if (filters.channel) {
    query.set("channel", filters.channel);
  }
  return query.toString();
}
