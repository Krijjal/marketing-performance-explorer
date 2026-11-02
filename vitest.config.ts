import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Integration test files reset the same database, so they must not overlap.
    fileParallelism: false,
    env: { ...loadEnv("test", process.cwd(), ""), LOG_LEVEL: "silent" },
  },
});
