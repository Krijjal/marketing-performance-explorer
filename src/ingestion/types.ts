export const BUSINESS_SHEET = "Business_Performance";
export const MEDIA_SHEET = "Media_Investment";

export type SheetName = typeof BUSINESS_SHEET | typeof MEDIA_SHEET;

export type Severity = "info" | "warning" | "error";
export type ActionTaken = "normalized" | "imputed" | "dropped" | "rejected" | "reported";

export interface DataQualityIssue {
  sheet: SheetName;
  rowNumber: number | null;
  rule: string;
  severity: Severity;
  actionTaken: ActionTaken;
  field: string | null;
  originalValue: string | null;
  correctedValue: string | null;
  message: string;
}

export interface StepResult<Row> {
  rows: Row[];
  issues: DataQualityIssue[];
}

export interface ChannelReference {
  id: number;
  channelType: "tv" | "digital";
}

// The seeded dimension tables, which act as the allowlist of categories.
export interface ReferenceData {
  brandIds: Map<string, number>;
  marketIds: Map<string, number>;
  channels: Map<string, ChannelReference>;
}

export interface SourceRow {
  rowNumber: number;
  values: Record<string, unknown>;
}

export interface ParsedBusinessRow {
  rowNumber: number;
  weekStart: string;
  brand: string;
  market: string;
  revenue: number;
  unitsSold: number;
  promotionFlag: number | string;
  priceIndex: number;
  distributionPct: number | null;
  competitorPriceIndex: number;
  economicIndex: number;
}

export interface ParsedMediaRow {
  rowNumber: number;
  weekStart: string;
  brand: string;
  market: string;
  channel: string;
  mediaSpend: number | null;
  impressions: number;
  clicks: number;
  tvGrps: number;
}

export type NormalizedBusinessRow = Omit<ParsedBusinessRow, "promotionFlag"> & {
  isPromotion: boolean;
};

export type CleanBusinessRow = Omit<NormalizedBusinessRow, "distributionPct"> & {
  distributionPct: number;
  distributionIsImputed: boolean;
};

export type CleanMediaRow = Omit<ParsedMediaRow, "mediaSpend"> & {
  mediaSpend: number;
  spendIsImputed: boolean;
};
