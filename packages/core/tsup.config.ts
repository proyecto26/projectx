import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/workflows.ts",
    "src/logger.ts",
    "src/lib/logger/index.ts",
  ],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  splitting: false,
  // Suppress source map warnings/errors for external dependencies
  // Similar to db package, some dependencies may have missing source maps
  esbuildOptions(options) {
    options.logOverride = {
      ...options.logOverride,
      "failed-to-read-source-map": "silent",
    };
  },
});
