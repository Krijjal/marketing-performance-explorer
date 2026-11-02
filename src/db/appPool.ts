import type pg from "pg";
import { readEnv } from "../config/env";
import { createPool } from "./pool";

// Kept on globalThis because Next.js reloads modules in development, and a new
// pool on every reload would use up the database's connections.
const globalForPool = globalThis as typeof globalThis & { appPool?: pg.Pool };

export function getAppPool(): pg.Pool {
  globalForPool.appPool ??= createPool(readEnv().DATABASE_URL);
  return globalForPool.appPool;
}
