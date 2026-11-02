import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";
import { logger } from "../logging/logger";

const MIGRATIONS_DIRECTORY = path.join(process.cwd(), "db", "migrations");

export async function runMigrations(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      file_name  text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const appliedResult = await pool.query<{ file_name: string }>(
    "SELECT file_name FROM schema_migration",
  );
  const appliedFileNames = new Set(appliedResult.rows.map((row) => row.file_name));

  const fileNames = (await readdir(MIGRATIONS_DIRECTORY))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const fileName of fileNames) {
    if (appliedFileNames.has(fileName)) {
      continue;
    }
    const sql = await readFile(path.join(MIGRATIONS_DIRECTORY, fileName), "utf8");
    await applyMigration(pool, fileName, sql);
    logger.info({ fileName }, "migration applied");
  }
}

// One transaction per file, so a failing migration leaves no partial schema behind.
async function applyMigration(pool: pg.Pool, fileName: string, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migration (file_name) VALUES ($1)", [fileName]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
