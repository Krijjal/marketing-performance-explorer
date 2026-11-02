import { describe, expect, it } from "vitest";
import { validateBusinessRows, validateMediaRows } from "../../src/ingestion/validate";
import { normalizedBusinessRow, parsedMediaRow, reference } from "../fixtures/rows";

describe("validateBusinessRows", () => {
  it("passes a valid row with no issues", () => {
    const row = normalizedBusinessRow();

    expect(validateBusinessRows([row], reference)).toEqual({ rows: [row], issues: [] });
  });

  it.each([
    ["unknown brand", { brand: "Ember" }, "unknown_category", "brand"],
    ["unknown market", { market: "France" }, "unknown_category", "market"],
    ["negative revenue", { revenue: -1 }, "negative_value", "revenue"],
    ["negative units", { unitsSold: -1 }, "negative_value", "units_sold"],
    ["low price index", { priceIndex: 49 }, "index_out_of_range", "price_index"],
    ["high competitor index", { competitorPriceIndex: 201 }, "index_out_of_range", "competitor_price_index"],
    ["low economic index", { economicIndex: 0 }, "index_out_of_range", "economic_index"],
    ["high distribution", { distributionPct: 101 }, "percentage_out_of_range", "distribution_pct"],
    ["a Tuesday week", { weekStart: "2025-01-07" }, "week_not_monday", "week_start"],
  ])("rejects %s", (_description, overrides, rule, field) => {
    const { rows, issues } = validateBusinessRows([normalizedBusinessRow(overrides)], reference);

    expect(rows).toEqual([]);
    expect(issues[0]).toMatchObject({ rule, field, severity: "error", actionTaken: "rejected" });
  });

  it("logs every failed rule on a row", () => {
    const row = normalizedBusinessRow({ revenue: -1, priceIndex: 500 });

    const { issues } = validateBusinessRows([row], reference);

    expect(issues.map((issue) => issue.rule)).toEqual(["negative_value", "index_out_of_range"]);
  });

  it("lets a null distribution through to imputation", () => {
    const row = normalizedBusinessRow({ distributionPct: null });

    expect(validateBusinessRows([row], reference).rows).toEqual([row]);
  });
});

describe("promotion_without_price_drop", () => {
  const previousWeek = normalizedBusinessRow({ rowNumber: 2, priceIndex: 100 });

  it("reports a promotion whose price index did not fall, and keeps the row", () => {
    const promotion = normalizedBusinessRow({
      rowNumber: 22,
      weekStart: "2025-01-13",
      isPromotion: true,
      priceIndex: 100.5,
    });

    const { rows, issues } = validateBusinessRows([previousWeek, promotion], reference);

    expect(rows).toHaveLength(2);
    expect(issues).toEqual([
      expect.objectContaining({
        rule: "promotion_without_price_drop",
        rowNumber: 22,
        severity: "warning",
        actionTaken: "reported",
      }),
    ]);
  });

  it("accepts a promotion with a price cut", () => {
    const promotion = normalizedBusinessRow({
      rowNumber: 3,
      weekStart: "2025-01-13",
      isPromotion: true,
      priceIndex: 99,
    });

    expect(validateBusinessRows([previousWeek, promotion], reference).issues).toEqual([]);
  });

  it("compares a promotion only with its own series", () => {
    const promotion = normalizedBusinessRow({
      rowNumber: 3,
      weekStart: "2025-01-13",
      market: "Germany",
      isPromotion: true,
      priceIndex: 100.5,
    });

    expect(validateBusinessRows([previousWeek, promotion], reference).issues).toEqual([]);
  });
});

describe("validateMediaRows", () => {
  it("passes valid TV and digital rows", () => {
    const tv = parsedMediaRow({ channel: "TV", impressions: 0, clicks: 0, tvGrps: 120 });
    const social = parsedMediaRow({ rowNumber: 3 });

    expect(validateMediaRows([tv, social], reference)).toEqual({ rows: [tv, social], issues: [] });
  });

  it.each([
    ["unknown channel", { channel: "Radio" }, "unknown_category", "channel"],
    ["negative spend", { mediaSpend: -1 }, "negative_value", "media_spend"],
    ["negative impressions", { impressions: -1, clicks: 0 }, "negative_value", "impressions"],
    ["more clicks than impressions", { impressions: 5, clicks: 6 }, "clicks_exceed_impressions", "clicks"],
    ["GRPs on a digital row", { tvGrps: 10 }, "channel_metric_mismatch", "tv_grps"],
    ["impressions on a TV row", { channel: "TV" }, "channel_metric_mismatch", "impressions"],
  ])("rejects %s", (_description, overrides, rule, field) => {
    const { rows, issues } = validateMediaRows([parsedMediaRow(overrides)], reference);

    expect(rows).toEqual([]);
    expect(issues[0]).toMatchObject({ rule, field, actionTaken: "rejected" });
  });

  it("lets a null spend through to imputation", () => {
    const row = parsedMediaRow({ mediaSpend: null });

    expect(validateMediaRows([row], reference).rows).toEqual([row]);
  });
});
