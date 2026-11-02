import { readEnv } from "../config/env";
import { createPool } from "../db/pool";
import { runPipeline } from "./runPipeline";

const DEFAULT_DATASET_PATH = "docs/Technical_Assessment_Sample_Dataset.xlsx";

const pool = createPool(readEnv().DATABASE_URL);

try {
  await runPipeline(pool, process.argv[2] ?? DEFAULT_DATASET_PATH);
} catch {
  // runPipeline has already logged the failure and recorded it on the run.
  process.exitCode = 1;
} finally {
  await pool.end();
}
