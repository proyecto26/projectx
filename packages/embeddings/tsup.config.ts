import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Native runtime (onnxruntime-node, sharp): resolved at run time, never bundled
  external: ["@huggingface/transformers"],
});
