import { describe, expect, it } from "vitest";
import { toCsv } from "../../src/analytics/exportRows";
import { parseFilters, toQueryString, type FilterOptions } from "../../src/analytics/filters";
import {
  comparePeriods,
  parseComparisonPeriods,
  type PeriodSummary,
} from "../../src/analytics/periodComparison";

const options: FilterOptions = {
  brands: ["Hearth", "Pulse"],
  markets: ["Germany", "UK"],
  channels: ["TV", "Paid Search", "Social"],
  firstWeek: "2025-01-06",
  lastWeek: "2025-02-24",
};

function summary(overrides: Partial<PeriodSummary> = {}): PeriodSummary {
  return {
    weeks: 4,
    revenuePerWeek: 100,
    unitsPerWeek: 10,
    spendPerWeek: 20,
    roas: 5,
    promotionShare: 0.25,
    priceGap: 1,
    distributionPct: 90,
    imputedValues: 0,
    spendPerWeekByChannel: new Map([["TV", 20]]),
    ...overrides,
  };
}

describe("parseFilters", () => {
  it("defaults to all data", () => {
    expect(parseFilters({}, options)).toEqual({
      startDate: "2025-01-06",
      endDate: "2025-02-24",
      brand: null,
      market: null,
      channel: null,
    });
  });

  it("reads valid values", () => {
    const filters = parseFilters(
      { start: "2025-01-13", end: "2025-01-20", brand: "Pulse", market: "UK", channel: "TV" },
      options,
    );

    expect(filters).toEqual({
      startDate: "2025-01-13",
      endDate: "2025-01-20",
      brand: "Pulse",
      market: "UK",
      channel: "TV",
    });
  });

  it("ignores unknown categories and malformed dates", () => {
    const filters = parseFilters({ brand: "'; DROP TABLE brand", start: "yesterday" }, options);

    expect(filters.brand).toBeNull();
    expect(filters.startDate).toBe("2025-01-06");
  });

  it("falls back to the full range when dates are reversed", () => {
    const filters = parseFilters({ start: "2025-02-24", end: "2025-01-06" }, options);

    expect(filters).toMatchObject({ startDate: "2025-01-06", endDate: "2025-02-24" });
  });
});

describe("toQueryString", () => {
  it("leaves out filters that are not set", () => {
    const query = toQueryString({
      startDate: "2025-01-06",
      endDate: "2025-02-24",
      brand: "Pulse",
      market: null,
      channel: "Paid Search",
    });

    expect(query).toBe("start=2025-01-06&end=2025-02-24&brand=Pulse&channel=Paid+Search");
  });
});

describe("parseComparisonPeriods", () => {
  it("splits the data in half by default", () => {
    expect(parseComparisonPeriods({}, options)).toEqual({
      periodA: { startDate: "2025-01-06", endDate: "2025-01-27" },
      periodB: { startDate: "2025-02-03", endDate: "2025-02-24" },
    });
  });

  it("falls back for a reversed period", () => {
    const { periodA } = parseComparisonPeriods({ aStart: "2025-02-01", aEnd: "2025-01-01" }, options);

    expect(periodA).toEqual({ startDate: "2025-01-06", endDate: "2025-01-27" });
  });
});

describe("comparePeriods", () => {
  it("calculates percentage change", () => {
    const { metrics } = comparePeriods(summary(), summary({ revenuePerWeek: 110 }));

    expect(metrics[0]).toMatchObject({ label: "Revenue per week", percentChange: expect.closeTo(0.1, 9) as number });
  });

  it("gives no percentage change from zero, or for a withheld ROAS", () => {
    const { metrics } = comparePeriods(
      summary({ spendPerWeek: 0, roas: null }),
      summary({ roas: null }),
    );

    expect(metrics.find((metric) => metric.label === "Media spend per week")?.percentChange).toBeNull();
    expect(metrics.find((metric) => metric.label === "ROAS")?.percentChange).toBeNull();
  });

  it("marks a promotion increase as moving with a revenue rise", () => {
    const { drivers } = comparePeriods(
      summary(),
      summary({ revenuePerWeek: 120, promotionShare: 0.5 }),
    );

    expect(drivers[0]).toMatchObject({ label: "Weeks on promotion", change: 0.25, alignment: "with" });
  });

  it("marks a promotion increase as against a revenue fall", () => {
    const { drivers } = comparePeriods(
      summary(),
      summary({ revenuePerWeek: 80, promotionShare: 0.5 }),
    );

    expect(drivers[0]?.alignment).toBe("against");
  });

  it("treats a higher price gap as pushing revenue down", () => {
    const { drivers } = comparePeriods(summary(), summary({ revenuePerWeek: 80, priceGap: 3 }));

    expect(drivers[1]).toMatchObject({ label: "Price index minus competitor", alignment: "with" });
  });

  it("marks an unchanged driver as flat", () => {
    const { drivers } = comparePeriods(summary(), summary({ revenuePerWeek: 120 }));

    expect(drivers[2]?.alignment).toBe("flat");
  });

  it("marks drivers unknown when revenue did not change", () => {
    const { drivers } = comparePeriods(summary(), summary({ distributionPct: 95 }));

    expect(drivers[2]?.alignment).toBe("unknown");
  });

  it("includes a channel present in only one period", () => {
    const { drivers } = comparePeriods(
      summary({ spendPerWeekByChannel: new Map() }),
      summary({ spendPerWeekByChannel: new Map([["Social", 7]]) }),
    );

    expect(drivers.at(-1)).toMatchObject({ label: "Social spend per week", periodA: 0, periodB: 7 });
  });
});

describe("toCsv", () => {
  it("writes headers and values, with null as empty", () => {
    expect(toCsv([{ brand: "Pulse", revenue: 10, media_spend: null, imputed: true }])).toBe(
      "brand,revenue,media_spend,imputed\nPulse,10,,true",
    );
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(toCsv([{ note: 'a,"b"\nc' }])).toBe('note\n"a,""b""\nc"');
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});
