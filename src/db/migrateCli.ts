import { readEnv } from "../config/env";
import { logger } from "../logging/logger";
import { runMigrations } from "./migrate";
import { createPool } from "./pool";

const pool = createPool(readEnv().DATABASE_URL);

try {
  await runMigrations(pool);
} catch (error) {
  logger.error({ err: error }, "migration failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
