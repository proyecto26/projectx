import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.spec.ts"],
    // The integration test bundles workflows and starts a local test server.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
