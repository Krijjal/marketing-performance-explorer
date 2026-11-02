import { describe, expect, it } from "vitest";
import { findMissingBusinessWeeks, findMissingMediaWeeks } from "../../src/ingestion/completeness";
import { reference } from "../fixtures/rows";

const WEEKS = ["2025-01-06", "2025-01-13", "2025-01-20"];
const BRANDS = ["Pulse", "Hearth"];
const MARKETS = ["UK", "Germany"];
const CHANNELS = ["TV", "Paid Search", "Social"];

const allBusinessRows = WEEKS.flatMap((weekStart) =>
  BRANDS.flatMap((brand) => MARKETS.map((market) => ({ weekStart, brand, market }))),
);
const allMediaRows = allBusinessRows.flatMap((row) =>
  CHANNELS.map((channel) => ({ ...row, channel })),
);

describe("findMissingBusinessWeeks", () => {
  it("finds nothing in a complete grid", () => {
    expect(findMissingBusinessWeeks(allBusinessRows, reference)).toEqual([]);
  });

  it("reports a week missing from one series, with no source row", () => {
    const rows = allBusinessRows.filter(
      (row) => !(row.weekStart === "2025-01-13" && row.brand === "Hearth" && row.market === "UK"),
    );

    const issues = findMissingBusinessWeeks(rows, reference);

    expect(issues).toEqual([
      expect.objectContaining({
        rule: "missing_week",
        rowNumber: null,
        severity: "warning",
        actionTaken: "reported",
        message: "No row for Hearth UK in week 2025-01-13",
      }),
    ]);
  });

  it("reports a week missing from every series", () => {
    const rows = allBusinessRows.filter((row) => row.weekStart !== "2025-01-13");

    expect(findMissingBusinessWeeks(rows, reference)).toHaveLength(4);
  });

  it("returns nothing when there are no rows at all", () => {
    expect(findMissingBusinessWeeks([], reference)).toEqual([]);
  });
});

describe("findMissingMediaWeeks", () => {
  it("finds nothing in a complete grid", () => {
    expect(findMissingMediaWeeks(allMediaRows, reference)).toEqual([]);
  });

  it("reports a missing channel week", () => {
    const rows = allMediaRows.filter(
      (row) =>
        !(
          row.weekStart === "2025-01-06" &&
          row.brand === "Pulse" &&
          row.market === "Germany" &&
          row.channel === "TV"
        ),
    );

    const issues = findMissingMediaWeeks(rows, reference);

    expect(issues[0]?.message).toBe("No row for Pulse Germany TV in week 2025-01-06");
  });
});
