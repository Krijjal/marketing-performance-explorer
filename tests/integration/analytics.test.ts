import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLatestRunReport } from "../../src/analytics/dataQuality";
import { getExportRows } from "../../src/analytics/exportRows";
import { getFilterOptions, type Filters } from "../../src/analytics/filters";
import { getKpis } from "../../src/analytics/kpis";
import { comparePeriods, getPeriodSummary } from "../../src/analytics/periodComparison";
import { getChannelSummaries, getSpendByChannel, getWeeklyTrend } from "../../src/analytics/trends";
import { runPipeline } from "../../src/ingestion/runPipeline";
import { createTestPool, resetDatabase } from "./testDatabase";

const DATASET_PATH = "docs/Technical_Assessment_Sample_Dataset.xlsx";

const allData: Filters = {
  startDate: "2025-01-06",
  endDate: "2025-02-24",
  brand: null,
  market: null,
  channel: null,
};

let pool: pg.Pool;

async function rawNumber(sql: string): Promise<number> {
  const result = await pool.query<{ value: string }>(sql);
  return Number(result.rows[0]!.value);
}

beforeAll(async () => {
  pool = createTestPool();
  await resetDatabase(pool);
  await runPipeline(pool, DATASET_PATH);
});

afterAll(async () => {
  await pool.end();
});

// Expected numbers were calculated separately from the raw spreadsheet, with the
// duplicate removed and the imputed spend applied. Each KPI is also checked against
// a raw SQL query on the fact tables, which bypasses the views and the query code.
describe("getKpis against raw SQL and the spreadsheet", () => {
  it("matches revenue", async () => {
    const kpis = await getKpis(pool, allData);

    expect(kpis.revenue).toBe(3259865);
    expect(kpis.revenue).toBe(await rawNumber("SELECT sum(revenue) AS value FROM fact_business_weekly"));
  });

  it("matches units", async () => {
    const kpis = await getKpis(pool, allData);

    expect(kpis.unitsSold).toBe(162517);
    expect(kpis.unitsSold).toBe(await rawNumber("SELECT sum(units_sold) AS value FROM fact_business_weekly"));
  });

  it("matches media spend, including the imputed value", async () => {
    const kpis = await getKpis(pool, allData);

    expect(kpis.mediaSpend).toBeCloseTo(308061.32, 2);
    expect(kpis.mediaSpend).toBeCloseTo(
      await rawNumber("SELECT sum(media_spend) AS value FROM fact_media_weekly"),
      2,
    );
  });

  it("matches ROAS, without the fan-out a direct join would cause", async () => {
    const kpis = await getKpis(pool, allData);

    expect(kpis.roas).toBeCloseTo(10.58187, 4);
    expect(kpis.roas).toBeCloseTo(
      await rawNumber(
        `SELECT (SELECT sum(revenue) FROM fact_business_weekly)
              / (SELECT sum(media_spend) FROM fact_media_weekly) AS value`,
      ),
      6,
    );
  });

  it("matches CPC on digital rows only", async () => {
    const kpis = await getKpis(pool, allData);

    expect(kpis.cpc).toBeCloseTo(0.845837, 5);
    expect(kpis.cpc).toBeCloseTo(
      await rawNumber(
        `SELECT sum(f.media_spend) / sum(f.clicks) AS value
         FROM fact_media_weekly f JOIN channel c ON c.id = f.channel_id
         WHERE c.channel_type = 'digital'`,
      ),
      6,
    );
  });

  it("matches CTR on digital rows only", async () => {
    const kpis = await getKpis(pool, allData);

    expect(kpis.ctr).toBeCloseTo(0.031681, 5);
    expect(kpis.ctr).toBeCloseTo(
      await rawNumber(
        `SELECT sum(f.clicks)::numeric / sum(f.impressions) AS value
         FROM fact_media_weekly f JOIN channel c ON c.id = f.channel_id
         WHERE c.channel_type = 'digital'`,
      ),
      6,
    );
  });

  it("counts the imputed values in scope", async () => {
    const kpis = await getKpis(pool, allData);

    expect(kpis.imputedSpendValues).toBe(1);
    expect(kpis.imputedDistributionValues).toBe(1);
  });
});

describe("getKpis with filters", () => {
  it("applies brand and market", async () => {
    const kpis = await getKpis(pool, { ...allData, brand: "Pulse", market: "UK" });

    expect(kpis.revenue).toBe(1010746);
    expect(kpis.unitsSold).toBe(45944);
    expect(kpis.mediaSpend).toBeCloseTo(90854.4, 2);
    expect(kpis.roas).toBeCloseTo(11.1249, 3);
    expect(kpis.imputedSpendValues).toBe(0);
  });

  it("keeps revenue whole and withholds ROAS under a channel filter", async () => {
    const kpis = await getKpis(pool, { ...allData, channel: "Social" });

    expect(kpis.revenue).toBe(3259865);
    expect(kpis.mediaSpend).toBeCloseTo(56872.85, 2);
    expect(kpis.roas).toBeNull();
    expect(kpis.cpc).toBeCloseTo(1.234595, 5);
    expect(kpis.ctr).toBeCloseTo(0.0179996, 6);
  });

  it("never computes CPC or CTR for TV", async () => {
    const kpis = await getKpis(pool, { ...allData, channel: "TV" });

    expect(kpis.mediaSpend).toBeCloseTo(169038.78, 2);
    expect(kpis.cpc).toBeNull();
    expect(kpis.ctr).toBeNull();
  });

  it("returns zeros and nulls for a range with no data", async () => {
    const kpis = await getKpis(pool, { ...allData, startDate: "2030-01-07", endDate: "2030-01-14" });

    expect(kpis).toMatchObject({ revenue: 0, mediaSpend: 0, roas: null, cpc: null, ctr: null });
  });
});

describe("trends", () => {
  it("returns one point per week whose totals match the KPIs", async () => {
    const trend = await getWeeklyTrend(pool, allData);

    expect(trend).toHaveLength(8);
    expect(trend.reduce((total, week) => total + week.revenue, 0)).toBe(3259865);
    expect(trend.reduce((total, week) => total + (week.mediaSpend ?? 0), 0)).toBeCloseTo(308061.32, 2);
  });

  it("marks only the week containing imputed spend", async () => {
    const trend = await getWeeklyTrend(pool, allData);

    expect(trend.filter((week) => week.spendIsImputed).map((week) => week.weekStart)).toEqual([
      "2025-02-17",
    ]);
  });

  it("splits spend by channel with no duplicate left over", async () => {
    const points = await getSpendByChannel(pool, allData);

    expect(points).toHaveLength(24);
    const pulseGermanySocial = await getSpendByChannel(pool, {
      ...allData,
      brand: "Pulse",
      market: "Germany",
      channel: "Social",
      startDate: "2025-01-13",
      endDate: "2025-01-13",
    });
    expect(pulseGermanySocial[0]?.mediaSpend).toBeCloseTo(1667.64, 2);
  });

  it("gives TV a cost per GRP and digital channels CPC and CTR, never the reverse", async () => {
    const summaries = await getChannelSummaries(pool, allData);
    const tv = summaries.find((summary) => summary.channel === "TV");
    const social = summaries.find((summary) => summary.channel === "Social");

    expect(tv).toMatchObject({ channelType: "tv", cpc: null, ctr: null });
    expect(tv?.costPerGrp).toBeGreaterThan(0);
    expect(social?.costPerGrp).toBeNull();
    expect(social?.cpc).toBeCloseTo(1.234595, 5);
    expect(summaries.reduce((total, summary) => total + summary.spendShare, 0)).toBeCloseTo(1, 9);
  });
});

describe("period comparison", () => {
  const periodA = { startDate: "2025-01-06", endDate: "2025-01-27" };
  const periodB = { startDate: "2025-02-03", endDate: "2025-02-24" };

  it("matches values calculated from the spreadsheet", async () => {
    const summaryA = await getPeriodSummary(pool, periodA, allData);
    const summaryB = await getPeriodSummary(pool, periodB, allData);

    expect(summaryA.weeks).toBe(4);
    expect(summaryA.revenuePerWeek).toBeCloseTo(1564451 / 4, 2);
    expect(summaryB.revenuePerWeek).toBeCloseTo(1695414 / 4, 2);
    expect(summaryA.spendPerWeek).toBeCloseTo(142364.43 / 4, 2);
    expect(summaryB.spendPerWeek).toBeCloseTo(165696.89 / 4, 2);
    expect(summaryA.roas).toBeCloseTo(10.98906, 4);
    expect(summaryB.roas).toBeCloseTo(10.23202, 4);
    expect(summaryA.imputedValues).toBe(0);
    expect(summaryB.imputedValues).toBe(2);
  });

  it("matches the promotion share from a raw SQL count", async () => {
    const summaryB = await getPeriodSummary(pool, periodB, allData);

    // 3 of 16 rows in the second period: the Yes row and both Pulse rows on 02-17.
    expect(summaryB.promotionShare).toBeCloseTo(3 / 16, 6);
    expect(summaryB.promotionShare).toBeCloseTo(
      await rawNumber(
        `SELECT avg(CASE WHEN is_promotion THEN 1 ELSE 0 END) AS value
         FROM fact_business_weekly WHERE week_start >= '2025-02-03'`,
      ),
      6,
    );
  });

  it("lists every channel as a driver", async () => {
    const comparison = comparePeriods(
      await getPeriodSummary(pool, periodA, allData),
      await getPeriodSummary(pool, periodB, allData),
    );

    expect(comparison.drivers.map((driver) => driver.label)).toEqual([
      "Weeks on promotion",
      "Price index minus competitor",
      "Distribution",
      "Paid Search spend per week",
      "Social spend per week",
      "TV spend per week",
    ]);
  });

  it("withholds ROAS under a channel filter", async () => {
    const summary = await getPeriodSummary(pool, periodA, { ...allData, channel: "TV" });

    expect(summary.roas).toBeNull();
  });
});

describe("getLatestRunReport", () => {
  it("returns the latest run with its issues", async () => {
    const report = await getLatestRunReport(pool);

    expect(report?.run).toMatchObject({ status: "succeeded", rowsRead: 129, rowsLoaded: 128 });
    expect(report?.issues).toHaveLength(6);
  });

  it("returns null before any run", async () => {
    await resetDatabase(pool);

    expect(await getLatestRunReport(pool)).toBeNull();
    expect(await getFilterOptions(pool)).toBeNull();

    await runPipeline(pool, DATASET_PATH);
  });
});

describe("getFilterOptions", () => {
  it("returns categories and the data's date range", async () => {
    expect(await getFilterOptions(pool)).toEqual({
      brands: ["Hearth", "Pulse"],
      markets: ["Germany", "UK"],
      channels: ["TV", "Paid Search", "Social"],
      firstWeek: "2025-01-06",
      lastWeek: "2025-02-24",
    });
  });
});

describe("getExportRows", () => {
  it("has one row per week, brand and market, so revenue totals stay correct", async () => {
    const rows = await getExportRows(pool, allData);

    expect(rows).toHaveLength(32);
    expect(rows.reduce((total, row) => total + Number(row.revenue), 0)).toBe(3259865);
    expect(rows.reduce((total, row) => total + Number(row.media_spend), 0)).toBeCloseTo(308061.32, 2);
  });

  it("applies filters and names the media scope", async () => {
    const rows = await getExportRows(pool, { ...allData, brand: "Hearth", market: "UK", channel: "Social" });

    expect(rows).toHaveLength(8);
    expect(rows[0]).toMatchObject({ brand: "Hearth", market: "UK", media_channel: "Social" });
    expect(rows.find((row) => row.week_start === "2025-02-17")).toMatchObject({
      media_spend: 1846.8,
      spend_is_imputed: true,
    });
  });
});
