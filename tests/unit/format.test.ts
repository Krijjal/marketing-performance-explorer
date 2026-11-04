import { describe, expect, it } from "vitest";
import { formatAxis, pluralize } from "../../src/components/format";

describe("pluralize", () => {
  it("uses the singular word for exactly one", () => {
    expect(pluralize(1, "distribution value", "distribution values")).toBe("1 distribution value");
  });

  it("uses the plural word for zero and for more than one", () => {
    expect(pluralize(0, "value", "values")).toBe("0 values");
    expect(pluralize(2, "value", "values")).toBe("2 values");
  });
});

describe("formatAxis", () => {
  it("shows small values as they are", () => {
    expect(formatAxis(0)).toBe("0");
    expect(formatAxis(750)).toBe("750");
  });

  it("shows whole thousands without a decimal", () => {
    expect(formatAxis(5000)).toBe("5k");
  });

  it("keeps one decimal instead of rounding to the next thousand", () => {
    expect(formatAxis(2500)).toBe("2.5k");
    expect(formatAxis(7500)).toBe("7.5k");
  });
});
