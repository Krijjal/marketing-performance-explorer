import { describe, expect, it } from "vitest";
import { driverTone, formatChange, toneFor } from "../../src/components/ChangeBadge";

describe("toneFor", () => {
  it("marks a rise good and a fall bad when higher is better", () => {
    expect(toneFor(0.084, true)).toBe("good");
    expect(toneFor(-0.069, true)).toBe("bad");
  });

  it("reverses the tones when lower is better", () => {
    expect(toneFor(0.1, false)).toBe("bad");
    expect(toneFor(-0.1, false)).toBe("good");
  });

  it("stays neutral for media spend, where higherIsBetter is null", () => {
    expect(toneFor(0.164, null)).toBe("neutral");
    expect(toneFor(-0.164, null)).toBe("neutral");
  });

  it("stays neutral for no change and for a missing change", () => {
    expect(toneFor(0, true)).toBe("neutral");
    expect(toneFor(null, true)).toBe("neutral");
  });
});

describe("driverTone", () => {
  it("is favourable when a driver moved with a revenue rise", () => {
    expect(driverTone("with", 0.08)).toBe("good");
    expect(driverTone("against", 0.08)).toBe("bad");
  });

  it("is unfavourable when a driver moved with a revenue fall", () => {
    expect(driverTone("with", -0.08)).toBe("bad");
    expect(driverTone("against", -0.08)).toBe("good");
  });

  it("stays neutral for flat, unknown or no revenue change", () => {
    expect(driverTone("flat", 0.08)).toBe("neutral");
    expect(driverTone("unknown", 0.08)).toBe("neutral");
    expect(driverTone("with", null)).toBe("neutral");
  });
});

describe("formatChange", () => {
  it("always shows a sign alongside the value", () => {
    expect(formatChange(0.084, "percent")).toBe("+8.4%");
    expect(formatChange(-0.069, "percent")).toBe("−6.9%");
    expect(formatChange(0.125, "points")).toBe("+12.50 pts");
    expect(formatChange(-1.5, "number")).toBe("−1.50");
  });
});
