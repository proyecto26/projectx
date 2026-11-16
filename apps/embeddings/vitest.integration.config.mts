import { defineConfig } from "vitest/config";

// Needs PostgreSQL (DATABASE_URL); run by the CI `database` job
export default defineConfig({
  test: {
    include: ["test/**/*.integration.spec.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
