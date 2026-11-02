import type {
  NormalizedBusinessRow,
  ParsedBusinessRow,
  ParsedMediaRow,
  ReferenceData,
} from "../../src/ingestion/types";

export const reference: ReferenceData = {
  brandIds: new Map([
    ["Pulse", 1],
    ["Hearth", 2],
  ]),
  marketIds: new Map([
    ["UK", 1],
    ["Germany", 2],
  ]),
  channels: new Map([
    ["TV", { id: 1, channelType: "tv" }],
    ["Paid Search", { id: 2, channelType: "digital" }],
    ["Social", { id: 3, channelType: "digital" }],
  ]),
};

export function parsedBusinessRow(overrides: Partial<ParsedBusinessRow> = {}): ParsedBusinessRow {
  return {
    rowNumber: 2,
    weekStart: "2025-01-06",
    brand: "Pulse",
    market: "UK",
    revenue: 1000,
    unitsSold: 50,
    promotionFlag: 0,
    priceIndex: 100,
    distributionPct: 90,
    competitorPriceIndex: 100,
    economicIndex: 100,
    ...overrides,
  };
}

export function normalizedBusinessRow(
  overrides: Partial<NormalizedBusinessRow> = {},
): NormalizedBusinessRow {
  const { promotionFlag, ...fields } = parsedBusinessRow();
  return { ...fields, isPromotion: false, ...overrides };
}

export function parsedMediaRow(overrides: Partial<ParsedMediaRow> = {}): ParsedMediaRow {
  return {
    rowNumber: 2,
    weekStart: "2025-01-06",
    brand: "Pulse",
    market: "UK",
    channel: "Social",
    mediaSpend: 100,
    impressions: 1000,
    clicks: 10,
    tvGrps: 0,
    ...overrides,
  };
}
