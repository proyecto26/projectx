import { defineConfig } from "vitest/config";

// Needs a running Postgres, see test/catalog.integration.test.ts
export default defineConfig({
  test: {
    include: ["test/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
  },
});
