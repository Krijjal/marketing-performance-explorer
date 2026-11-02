import type pg from "pg";
import { runMigrations } from "../../src/db/migrate";
import { createPool } from "../../src/db/pool";

export function createTestPool(): pg.Pool {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error("TEST_DATABASE_URL is not set. Copy .env.example to .env.");
  }
  return createPool(connectionString);
}

export async function resetDatabase(pool: pg.Pool): Promise<void> {
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await runMigrations(pool);
}
