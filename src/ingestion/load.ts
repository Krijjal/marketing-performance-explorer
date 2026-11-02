import type pg from "pg";
import type {
  ChannelReference,
  CleanBusinessRow,
  CleanMediaRow,
  DataQualityIssue,
  ReferenceData,
} from "./types";

export interface RunCounts {
  rowsRead: number;
  rowsLoaded: number;
  rowsRejected: number;
}

export async function readReferenceData(pool: pg.Pool): Promise<ReferenceData> {
  const brands = await pool.query<{ id: number; name: string }>("SELECT id, name FROM brand");
  const markets = await pool.query<{ id: number; name: string }>("SELECT id, name FROM market");
  const channels = await pool.query<{
    id: number;
    name: string;
    channel_type: ChannelReference["channelType"];
  }>("SELECT id, name, channel_type FROM channel");

  return {
    brandIds: new Map(brands.rows.map((row) => [row.name, row.id])),
    marketIds: new Map(markets.rows.map((row) => [row.name, row.id])),
    channels: new Map(
      channels.rows.map((row) => [row.name, { id: row.id, channelType: row.channel_type }]),
    ),
  };
}

export async function startRun(
  pool: pg.Pool,
  sourceFile: string,
  sourceSha256: string,
): Promise<number> {
  const result = await pool.query<{ id: number }>(
    "INSERT INTO ingestion_run (source_file, source_sha256) VALUES ($1, $2) RETURNING id",
    [sourceFile, sourceSha256],
  );
  return result.rows[0]!.id;
}

export async function finishRun(pool: pg.Pool, runId: number, counts: RunCounts): Promise<void> {
  await pool.query(
    `UPDATE ingestion_run
     SET status = 'succeeded', finished_at = now(),
         rows_read = $2, rows_loaded = $3, rows_rejected = $4
     WHERE id = $1`,
    [runId, counts.rowsRead, counts.rowsLoaded, counts.rowsRejected],
  );
}

export async function failRun(pool: pg.Pool, runId: number, errorMessage: string): Promise<void> {
  await pool.query(
    `UPDATE ingestion_run
     SET status = 'failed', finished_at = now(), error_message = $2
     WHERE id = $1`,
    [runId, errorMessage],
  );
}

export async function saveIssues(
  pool: pg.Pool,
  runId: number,
  issues: DataQualityIssue[],
): Promise<void> {
  for (const issue of issues) {
    await pool.query(
      `INSERT INTO data_quality_issue
         (ingestion_run_id, sheet, row_number, rule, severity, action_taken,
          field, original_value, corrected_value, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        runId,
        issue.sheet,
        issue.rowNumber,
        issue.rule,
        issue.severity,
        issue.actionTaken,
        issue.field,
        issue.originalValue,
        issue.correctedValue,
        issue.message,
      ],
    );
  }
}

// One transaction: a failure leaves the previous good data fully in place.
export async function loadFacts(
  pool: pg.Pool,
  runId: number,
  reference: ReferenceData,
  businessRows: CleanBusinessRow[],
  mediaRows: CleanMediaRow[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of businessRows) {
      await upsertBusinessRow(client, runId, reference, row);
    }
    for (const row of mediaRows) {
      await upsertMediaRow(client, runId, reference, row);
    }
    // Every row in this file now carries this run's id. Anything else is no longer
    // in the source, so removing it keeps the tables a true copy of the latest file.
    await client.query("DELETE FROM fact_business_weekly WHERE ingestion_run_id <> $1", [runId]);
    await client.query("DELETE FROM fact_media_weekly WHERE ingestion_run_id <> $1", [runId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertBusinessRow(
  client: pg.PoolClient,
  runId: number,
  reference: ReferenceData,
  row: CleanBusinessRow,
): Promise<void> {
  await client.query(
    `INSERT INTO fact_business_weekly
       (week_start, brand_id, market_id, revenue, units_sold, is_promotion, price_index,
        distribution_pct, distribution_is_imputed, competitor_price_index, economic_index,
        ingestion_run_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (week_start, brand_id, market_id) DO UPDATE SET
       revenue = EXCLUDED.revenue,
       units_sold = EXCLUDED.units_sold,
       is_promotion = EXCLUDED.is_promotion,
       price_index = EXCLUDED.price_index,
       distribution_pct = EXCLUDED.distribution_pct,
       distribution_is_imputed = EXCLUDED.distribution_is_imputed,
       competitor_price_index = EXCLUDED.competitor_price_index,
       economic_index = EXCLUDED.economic_index,
       ingestion_run_id = EXCLUDED.ingestion_run_id`,
    [
      row.weekStart,
      reference.brandIds.get(row.brand),
      reference.marketIds.get(row.market),
      row.revenue,
      row.unitsSold,
      row.isPromotion,
      row.priceIndex,
      row.distributionPct,
      row.distributionIsImputed,
      row.competitorPriceIndex,
      row.economicIndex,
      runId,
    ],
  );
}

async function upsertMediaRow(
  client: pg.PoolClient,
  runId: number,
  reference: ReferenceData,
  row: CleanMediaRow,
): Promise<void> {
  await client.query(
    `INSERT INTO fact_media_weekly
       (week_start, brand_id, market_id, channel_id, media_spend, spend_is_imputed,
        impressions, clicks, tv_grps, ingestion_run_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (week_start, brand_id, market_id, channel_id) DO UPDATE SET
       media_spend = EXCLUDED.media_spend,
       spend_is_imputed = EXCLUDED.spend_is_imputed,
       impressions = EXCLUDED.impressions,
       clicks = EXCLUDED.clicks,
       tv_grps = EXCLUDED.tv_grps,
       ingestion_run_id = EXCLUDED.ingestion_run_id`,
    [
      row.weekStart,
      reference.brandIds.get(row.brand),
      reference.marketIds.get(row.market),
      reference.channels.get(row.channel)?.id,
      row.mediaSpend,
      row.spendIsImputed,
      row.impressions,
      row.clicks,
      row.tvGrps,
      runId,
    ],
  );
}
