import { describe, expect, it } from "vitest";
import { imputeBusinessRows, imputeMediaRows, interpolate } from "../../src/ingestion/impute";
import { normalizedBusinessRow, parsedMediaRow } from "../fixtures/rows";

describe("planted issue 2: missing distribution_pct", () => {
  it("interpolates within the same brand and market and flags the row", () => {
    const series = { brand: "Hearth", market: "Germany" };
    const rows = [
      normalizedBusinessRow({ ...series, rowNumber: 17, weekStart: "2025-01-27", distributionPct: 96 }),
      normalizedBusinessRow({ ...series, rowNumber: 21, weekStart: "2025-02-03", distributionPct: null }),
      normalizedBusinessRow({ ...series, rowNumber: 25, weekStart: "2025-02-10", distributionPct: 94 }),
      // Another market in the same week must not affect the result.
      normalizedBusinessRow({ brand: "Hearth", market: "UK", rowNumber: 20, weekStart: "2025-02-03", distributionPct: 10 }),
    ];

    const { rows: cleanRows, issues } = imputeBusinessRows(rows);

    expect(cleanRows.find((row) => row.rowNumber === 21)).toMatchObject({
      distributionPct: 95,
      distributionIsImputed: true,
    });
    expect(cleanRows.find((row) => row.rowNumber === 17)?.distributionIsImputed).toBe(false);
    expect(issues).toEqual([
      expect.objectContaining({
        rule: "missing_value_imputed",
        rowNumber: 21,
        field: "distribution_pct",
        actionTaken: "imputed",
        originalValue: null,
        correctedValue: "95",
      }),
    ]);
  });
});

describe("planted issue 5: missing media_spend", () => {
  const series = { brand: "Hearth", market: "UK", channel: "Social" };

  it("interpolates from neighbouring weeks rather than writing zero, and flags the row", () => {
    const rows = [
      parsedMediaRow({ ...series, rowNumber: 70, weekStart: "2025-02-10", mediaSpend: 1782 }),
      parsedMediaRow({ ...series, rowNumber: 82, weekStart: "2025-02-17", mediaSpend: null }),
      parsedMediaRow({ ...series, rowNumber: 94, weekStart: "2025-02-24", mediaSpend: 1911.6 }),
      // Another channel in the same week must not affect the result.
      parsedMediaRow({ ...series, channel: "TV", rowNumber: 80, weekStart: "2025-02-17", mediaSpend: 5335.2 }),
    ];

    const { rows: cleanRows, issues } = imputeMediaRows(rows);

    expect(cleanRows.find((row) => row.rowNumber === 82)).toMatchObject({
      mediaSpend: 1846.8,
      spendIsImputed: true,
    });
    expect(issues).toEqual([
      expect.objectContaining({
        rule: "missing_value_imputed",
        rowNumber: 82,
        field: "media_spend",
        actionTaken: "imputed",
        correctedValue: "1846.8",
      }),
    ]);
  });

  it("rejects the row at the edge of a series instead of writing zero", () => {
    const rows = [
      parsedMediaRow({ ...series, rowNumber: 70, weekStart: "2025-02-10", mediaSpend: 1782 }),
      parsedMediaRow({ ...series, rowNumber: 82, weekStart: "2025-02-17", mediaSpend: null }),
    ];

    const { rows: cleanRows, issues } = imputeMediaRows(rows);

    expect(cleanRows.map((row) => row.rowNumber)).toEqual([70]);
    expect(issues).toEqual([
      expect.objectContaining({ rule: "not_imputable", rowNumber: 82, actionTaken: "rejected" }),
    ]);
  });
});

describe("interpolate", () => {
  it("weights by time when the gap is more than one week", () => {
    const knownPoints = [
      { weekStart: "2025-01-06", value: 100 },
      { weekStart: "2025-01-27", value: 130 },
    ];

    expect(interpolate("2025-01-13", knownPoints)).toBe(110);
  });

  it("uses the nearest point on each side regardless of input order", () => {
    const knownPoints = [
      { weekStart: "2025-02-17", value: 999 },
      { weekStart: "2025-01-13", value: 20 },
      { weekStart: "2025-01-06", value: 999 },
      { weekStart: "2025-01-27", value: 40 },
    ];

    expect(interpolate("2025-01-20", knownPoints)).toBe(30);
  });

  it("returns null with no value before the gap", () => {
    expect(interpolate("2025-01-06", [{ weekStart: "2025-01-13", value: 1 }])).toBeNull();
  });
});
