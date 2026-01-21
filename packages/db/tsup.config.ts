import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: false,
  // Bundle the generated Prisma client - don't mark as external
  // External relative paths break after bundling due to different directory structure
  // The generated client MUST be bundled for paths to resolve correctly
  external: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  splitting: false,
  esbuildOptions(options) {
    // Suppress source map warnings for Prisma generated files
    options.logOverride = {
      ...options.logOverride,
      "failed-to-read-source-map": "silent",
    };
  },
});
