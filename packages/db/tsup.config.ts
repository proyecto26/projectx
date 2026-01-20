import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // We're using tsc for dts to handle the generated prisma types better
  sourcemap: true,
  clean: true,
  external: ["../../generated/prisma", "@prisma/client"],
  bundle: false,
});
