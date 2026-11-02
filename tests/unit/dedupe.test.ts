import { describe, expect, it } from "vitest";
import { businessKey, dedupeRows, mediaKey } from "../../src/ingestion/dedupe";
import { BUSINESS_SHEET, MEDIA_SHEET } from "../../src/ingestion/types";
import { normalizedBusinessRow, parsedMediaRow } from "../fixtures/rows";

describe("planted issue 3: exact duplicate media row", () => {
  it("keeps the first row, drops the later one and reports both row numbers", () => {
    const original = parsedMediaRow({ rowNumber: 19 });
    const unrelated = parsedMediaRow({ rowNumber: 20, channel: "TV" });
    const duplicate = parsedMediaRow({ rowNumber: 98 });

    const { rows, issues } = dedupeRows([original, unrelated, duplicate], MEDIA_SHEET, mediaKey);

    expect(rows.map((row) => row.rowNumber)).toEqual([19, 20]);
    expect(issues).toEqual([
      expect.objectContaining({
        rule: "duplicate_row",
        rowNumber: 98,
        actionTaken: "dropped",
        message: expect.stringContaining("row 19") as string,
      }),
    ]);
  });
});

describe("dedupeRows", () => {
  it("logs an error when the same key has different values", () => {
    const first = parsedMediaRow({ rowNumber: 2, mediaSpend: 100 });
    const conflicting = parsedMediaRow({ rowNumber: 3, mediaSpend: 200 });

    const { rows, issues } = dedupeRows([first, conflicting], MEDIA_SHEET, mediaKey);

    expect(rows).toEqual([first]);
    expect(issues[0]).toMatchObject({
      rule: "conflicting_duplicate_key",
      severity: "error",
      rowNumber: 3,
    });
  });

  it("treats the same week and series on another channel as a different key", () => {
    const social = parsedMediaRow({ rowNumber: 2 });
    const search = parsedMediaRow({ rowNumber: 3, channel: "Paid Search" });

    const { rows, issues } = dedupeRows([social, search], MEDIA_SHEET, mediaKey);

    expect(rows).toHaveLength(2);
    expect(issues).toEqual([]);
  });

  it("finds duplicate keys in business rows", () => {
    const first = normalizedBusinessRow({ rowNumber: 2 });
    const duplicate = normalizedBusinessRow({ rowNumber: 3 });

    const { rows } = dedupeRows([first, duplicate], BUSINESS_SHEET, businessKey);

    expect(rows).toEqual([first]);
  });
});
