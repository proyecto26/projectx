import { fileURLToPath, URL } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => ({
  plugins: [
    tailwindcss(),
    // Enable reactRouter when not running tests for vitest
    process.env.VITEST ? undefined : reactRouter(),
    tsconfigPaths(),
  ].filter(Boolean),
  resolve: {
    alias: [
      {
        find: /^(?:@projectx\/ui\/styles)$/,
        replacement: fileURLToPath(
          new URL("../../packages/ui/styles/index.css", import.meta.url),
        ),
      },
      {
        find: /^(?:@projectx\/ui)(?:$)/,
        replacement: fileURLToPath(
          new URL("../../packages/ui/src/index.ts", import.meta.url),
        ),
      },
    ],
  },
  ssr: {
    noExternal: ["@projectx/ui"],
  },
}));
