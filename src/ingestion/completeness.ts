import { BUSINESS_SHEET, MEDIA_SHEET, type DataQualityIssue, type ReferenceData, type SheetName } from "./types";

const MILLISECONDS_PER_WEEK = 7 * 86_400_000;

interface BusinessKeyFields {
  weekStart: string;
  brand: string;
  market: string;
}

type MediaKeyFields = BusinessKeyFields & { channel: string };

// A missing week is only reported. Inventing a row would present a guess as data.
export function findMissingBusinessWeeks(
  rows: BusinessKeyFields[],
  reference: ReferenceData,
): DataQualityIssue[] {
  const existingKeys = new Set(rows.map((row) => [row.weekStart, row.brand, row.market].join("|")));
  const issues: DataQualityIssue[] = [];

  for (const weekStart of expectedWeeks(rows)) {
    for (const brand of reference.brandIds.keys()) {
      for (const market of reference.marketIds.keys()) {
        if (!existingKeys.has([weekStart, brand, market].join("|"))) {
          issues.push(missingWeekIssue(BUSINESS_SHEET, weekStart, `${brand} ${market}`));
        }
      }
    }
  }
  return issues;
}

export function findMissingMediaWeeks(
  rows: MediaKeyFields[],
  reference: ReferenceData,
): DataQualityIssue[] {
  const existingKeys = new Set(
    rows.map((row) => [row.weekStart, row.brand, row.market, row.channel].join("|")),
  );
  const issues: DataQualityIssue[] = [];

  for (const weekStart of expectedWeeks(rows)) {
    for (const brand of reference.brandIds.keys()) {
      for (const market of reference.marketIds.keys()) {
        for (const channel of reference.channels.keys()) {
          if (!existingKeys.has([weekStart, brand, market, channel].join("|"))) {
            issues.push(missingWeekIssue(MEDIA_SHEET, weekStart, `${brand} ${market} ${channel}`));
          }
        }
      }
    }
  }
  return issues;
}

function expectedWeeks(rows: { weekStart: string }[]): string[] {
  const weekStarts = rows.map((row) => row.weekStart).sort();
  const firstWeek = weekStarts[0];
  const lastWeek = weekStarts.at(-1);
  if (!firstWeek || !lastWeek) {
    return [];
  }

  const weeks: string[] = [];
  const lastTime = Date.parse(lastWeek);
  for (let time = Date.parse(firstWeek); time <= lastTime; time += MILLISECONDS_PER_WEEK) {
    weeks.push(new Date(time).toISOString().slice(0, 10));
  }
  return weeks;
}

function missingWeekIssue(sheet: SheetName, weekStart: string, series: string): DataQualityIssue {
  return {
    sheet,
    rowNumber: null,
    rule: "missing_week",
    severity: "warning",
    actionTaken: "reported",
    field: "week_start",
    originalValue: null,
    correctedValue: null,
    message: `No row for ${series} in week ${weekStart}`,
  };
}
