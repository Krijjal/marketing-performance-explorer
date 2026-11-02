import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/db/migrate";
import { createTestPool, resetDatabase } from "./testDatabase";

const CHECK_VIOLATION = "23514";
const NOT_NULL_VIOLATION = "23502";
const UNIQUE_VIOLATION = "23505";
const MONDAY = "2025-01-06";
const TUESDAY = "2025-01-07";

let pool: pg.Pool;
let runId: number;

async function idOf(table: "brand" | "market" | "channel", name: string): Promise<number> {
  const result = await pool.query<{ id: number }>(`SELECT id FROM ${table} WHERE name = $1`, [name]);
  const row = result.rows[0];
  if (!row) {
    throw new Error(`${table} ${name} is not seeded`);
  }
  return row.id;
}

async function insertBusinessRow(overrides: Record<string, unknown> = {}): Promise<void> {
  const row = {
    week_start: MONDAY,
    brand_id: await idOf("brand", "Pulse"),
    market_id: await idOf("market", "UK"),
    revenue: 100,
    units_sold: 10,
    is_promotion: false,
    price_index: 100,
    distribution_pct: 90,
    competitor_price_index: 100,
    economic_index: 100,
    ingestion_run_id: runId,
    ...overrides,
  };
  await insertRow("fact_business_weekly", row);
}

async function insertMediaRow(overrides: Record<string, unknown> = {}): Promise<void> {
  const row = {
    week_start: MONDAY,
    brand_id: await idOf("brand", "Pulse"),
    market_id: await idOf("market", "UK"),
    channel_id: await idOf("channel", "Social"),
    media_spend: 100,
    impressions: 1000,
    clicks: 10,
    tv_grps: 0,
    ingestion_run_id: runId,
    ...overrides,
  };
  await insertRow("fact_media_weekly", row);
}

async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  const columns = Object.keys(row);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  await pool.query(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    Object.values(row),
  );
}

beforeAll(() => {
  pool = createTestPool();
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetDatabase(pool);
  const result = await pool.query<{ id: number }>(
    "INSERT INTO ingestion_run (source_file, source_sha256) VALUES ('test.xlsx', 'abc') RETURNING id",
  );
  runId = result.rows[0]!.id;
});

describe("migrations", () => {
  it("does nothing when run a second time", async () => {
    await expect(runMigrations(pool)).resolves.toBeUndefined();

    const result = await pool.query("SELECT 1 FROM channel");
    expect(result.rowCount).toBe(3);
  });

  it("seeds each channel with its channel type", async () => {
    const result = await pool.query("SELECT name, channel_type FROM channel ORDER BY name");

    expect(result.rows).toEqual([
      { name: "Paid Search", channel_type: "digital" },
      { name: "Social", channel_type: "digital" },
      { name: "TV", channel_type: "tv" },
    ]);
  });
});

describe("dimension constraints", () => {
  it("rejects a duplicate brand name", async () => {
    await expect(pool.query("INSERT INTO brand (name) VALUES ('Pulse')")).rejects.toMatchObject({
      code: UNIQUE_VIOLATION,
    });
  });

  it("rejects an unknown channel type", async () => {
    await expect(
      pool.query("INSERT INTO channel (name, channel_type) VALUES ('Radio', 'audio')"),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION });
  });
});

describe("fact_business_weekly constraints", () => {
  it("accepts a valid row", async () => {
    await expect(insertBusinessRow()).resolves.toBeUndefined();
  });

  it("rejects a second row with the same natural key", async () => {
    await insertBusinessRow();

    await expect(insertBusinessRow()).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
  });

  it.each([
    ["a week that does not start on Monday", { week_start: TUESDAY }],
    ["negative revenue", { revenue: -1 }],
    ["negative units", { units_sold: -1 }],
    ["distribution above 100", { distribution_pct: 100.5 }],
    ["a price index below range", { price_index: 49 }],
    ["a competitor index above range", { competitor_price_index: 201 }],
    ["an economic index below range", { economic_index: 0 }],
  ])("rejects %s", async (_description, overrides) => {
    await expect(insertBusinessRow(overrides)).rejects.toMatchObject({ code: CHECK_VIOLATION });
  });
});

describe("fact_media_weekly constraints", () => {
  it("accepts a valid row", async () => {
    await expect(insertMediaRow()).resolves.toBeUndefined();
  });

  it("allows the same week and series on another channel", async () => {
    await insertMediaRow();

    await expect(
      insertMediaRow({ channel_id: await idOf("channel", "Paid Search") }),
    ).resolves.toBeUndefined();
  });

  it("rejects a second row with the same natural key", async () => {
    await insertMediaRow();

    await expect(insertMediaRow()).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
  });

  it("rejects a null spend so missing spend can never be stored", async () => {
    await expect(insertMediaRow({ media_spend: null })).rejects.toMatchObject({
      code: NOT_NULL_VIOLATION,
    });
  });

  it.each([
    ["negative spend", { media_spend: -1 }],
    ["negative impressions", { impressions: -1 }],
    ["negative GRPs", { tv_grps: -1 }],
    ["more clicks than impressions", { impressions: 10, clicks: 11 }],
    ["a week that does not start on Monday", { week_start: TUESDAY }],
  ])("rejects %s", async (_description, overrides) => {
    await expect(insertMediaRow(overrides)).rejects.toMatchObject({ code: CHECK_VIOLATION });
  });
});

describe("audit table constraints", () => {
  it("rejects an unknown run status", async () => {
    await expect(
      pool.query("UPDATE ingestion_run SET status = 'paused' WHERE id = $1", [runId]),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION });
  });

  it("allows an issue with no source row, such as a missing week", async () => {
    await expect(
      pool.query(
        `INSERT INTO data_quality_issue (ingestion_run_id, sheet, rule, severity, action_taken, message)
         VALUES ($1, 'Media_Investment', 'missing_week', 'warning', 'reported', 'No row for this week')`,
        [runId],
      ),
    ).resolves.toBeDefined();
  });

  it("rejects an unknown action", async () => {
    await expect(
      pool.query(
        `INSERT INTO data_quality_issue (ingestion_run_id, sheet, rule, severity, action_taken, message)
         VALUES ($1, 'Media_Investment', 'some_rule', 'info', 'ignored', 'Not an allowed action')`,
        [runId],
      ),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION });
  });
});
