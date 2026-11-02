import { describe, expect, it } from "vitest";
import { excelSerialToIsoDate, parseBusinessRows, parseMediaRows } from "../../src/ingestion/schemas";

const MONDAY_2025_01_06 = 45663;

const validBusinessValues = {
  week_start: MONDAY_2025_01_06,
  brand: "Pulse",
  market: "UK",
  revenue: 1000,
  units_sold: 50,
  promotion_flag: 0,
  price_index: 100,
  distribution_pct: 90,
  competitor_price_index: 100,
  economic_index: 100,
};

const validMediaValues = {
  week_start: MONDAY_2025_01_06,
  brand: "Pulse",
  market: "UK",
  channel: "Social",
  media_spend: 100,
  impressions: 1000,
  clicks: 10,
  tv_grps: 0,
};

describe("excelSerialToIsoDate", () => {
  it("converts an Excel day count to an ISO date", () => {
    expect(excelSerialToIsoDate(MONDAY_2025_01_06)).toBe("2025-01-06");
  });
});

describe("parseBusinessRows", () => {
  it("keeps the source row number on a valid row", () => {
    const { rows, issues } = parseBusinessRows([{ rowNumber: 7, values: validBusinessValues }]);

    expect(issues).toEqual([]);
    expect(rows[0]).toMatchObject({ rowNumber: 7, weekStart: "2025-01-06", unitsSold: 50 });
  });

  it("keeps a null distribution for the imputation step", () => {
    const { rows } = parseBusinessRows([
      { rowNumber: 2, values: { ...validBusinessValues, distribution_pct: null } },
    ]);

    expect(rows[0]?.distributionPct).toBeNull();
  });

  it("rejects text in a numeric column and records the original value", () => {
    const { rows, issues } = parseBusinessRows([
      { rowNumber: 5, values: { ...validBusinessValues, revenue: "lots" } },
    ]);

    expect(rows).toEqual([]);
    expect(issues[0]).toMatchObject({
      rule: "invalid_value",
      rowNumber: 5,
      field: "revenue",
      originalValue: "lots",
      actionTaken: "rejected",
    });
  });

  it("rejects a missing required value", () => {
    const { rows, issues } = parseBusinessRows([
      { rowNumber: 5, values: { ...validBusinessValues, revenue: null } },
    ]);

    expect(rows).toEqual([]);
    expect(issues[0]?.field).toBe("revenue");
  });
});

describe("parseMediaRows", () => {
  it("keeps a null spend for the imputation step", () => {
    const { rows } = parseMediaRows([
      { rowNumber: 2, values: { ...validMediaValues, media_spend: null } },
    ]);

    expect(rows[0]?.mediaSpend).toBeNull();
  });

  it("rejects a week_start that is not a date", () => {
    const { rows, issues } = parseMediaRows([
      { rowNumber: 3, values: { ...validMediaValues, week_start: "last Monday" } },
    ]);

    expect(rows).toEqual([]);
    expect(issues[0]).toMatchObject({ rule: "invalid_value", field: "week_start" });
  });
});
