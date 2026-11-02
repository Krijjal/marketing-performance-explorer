import { describe, expect, it } from "vitest";
import { normalizeBusinessRows, normalizeMediaRows } from "../../src/ingestion/normalize";
import { parsedBusinessRow, parsedMediaRow, reference } from "../fixtures/rows";

describe("planted issue 1: promotion_flag mixes numbers and text", () => {
  it('converts "Yes" to true and reports the original value', () => {
    const row = parsedBusinessRow({ rowNumber: 22, promotionFlag: "Yes" });

    const { rows, issues } = normalizeBusinessRows([row], reference);

    expect(rows[0]?.isPromotion).toBe(true);
    expect(issues).toEqual([
      expect.objectContaining({
        rule: "promotion_flag_normalized",
        rowNumber: 22,
        actionTaken: "normalized",
        originalValue: "Yes",
        correctedValue: "true",
      }),
    ]);
  });
});

describe("planted issue 4: channel in the wrong case", () => {
  it('converts "paid search" to "Paid Search" and reports it', () => {
    const row = parsedMediaRow({ rowNumber: 42, channel: "paid search" });

    const { rows, issues } = normalizeMediaRows([row], reference);

    expect(rows[0]?.channel).toBe("Paid Search");
    expect(issues).toEqual([
      expect.objectContaining({
        rule: "category_normalized",
        rowNumber: 42,
        field: "channel",
        actionTaken: "normalized",
        originalValue: "paid search",
        correctedValue: "Paid Search",
      }),
    ]);
  });
});

describe("normalizeBusinessRows", () => {
  it.each([
    [1, true],
    [0, false],
  ])("reads numeric flag %s without raising an issue", (promotionFlag, expected) => {
    const { rows, issues } = normalizeBusinessRows([parsedBusinessRow({ promotionFlag })], reference);

    expect(rows[0]?.isPromotion).toBe(expected);
    expect(issues).toEqual([]);
  });

  it("reads text flags in any case", () => {
    const { rows } = normalizeBusinessRows([parsedBusinessRow({ promotionFlag: " NO " })], reference);

    expect(rows[0]?.isPromotion).toBe(false);
  });

  it.each(["maybe", 2])("rejects the unreadable flag %s", (promotionFlag) => {
    const { rows, issues } = normalizeBusinessRows([parsedBusinessRow({ promotionFlag })], reference);

    expect(rows).toEqual([]);
    expect(issues[0]).toMatchObject({ rule: "invalid_promotion_flag", actionTaken: "rejected" });
  });

  it("normalizes brand and market names too", () => {
    const { rows } = normalizeBusinessRows(
      [parsedBusinessRow({ brand: "PULSE", market: " germany " })],
      reference,
    );

    expect(rows[0]).toMatchObject({ brand: "Pulse", market: "Germany" });
  });
});

describe("normalizeMediaRows", () => {
  it("leaves an unknown channel unchanged for validation to reject", () => {
    const { rows, issues } = normalizeMediaRows([parsedMediaRow({ channel: "Radio" })], reference);

    expect(rows[0]?.channel).toBe("Radio");
    expect(issues).toEqual([]);
  });
});
