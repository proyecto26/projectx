import { fileURLToPath, URL } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => ({
  envDir: "../../",
  plugins: [
    tailwindcss(),
    // Enable reactRouter when not running tests for vitest
    process.env.VITEST ? undefined : reactRouter(),
    tsconfigPaths(),
  ].filter(Boolean),
  server: {
    host: true,
    port: 3000,
  },
  resolve: {
    alias: [
      {
        find: /^(?:@projectx\/ui\/styles\/base\.css)$/,
        replacement: fileURLToPath(
          new URL("../../packages/ui/styles/base.css", import.meta.url),
        ),
      },
      {
        find: /^(?:@projectx\/ui\/styles\/dark\.css)$/,
        replacement: fileURLToPath(
          new URL("../../packages/ui/styles/dark.css", import.meta.url),
        ),
      },
      {
        find: /^(?:@projectx\/ui\/styles\/theme\.css)$/,
        replacement: fileURLToPath(
          new URL("../../packages/ui/styles/theme.css", import.meta.url),
        ),
      },
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
      {
        find: /^(?:@projectx\/models)(?:$)/,
        replacement: fileURLToPath(
          new URL("../../packages/models/src/index.ts", import.meta.url),
        ),
      },
      {
        find: /^(?:@projectx\/core)(?:$)/,
        replacement: fileURLToPath(
          new URL("../../packages/core/src/index.ts", import.meta.url),
        ),
      },
      {
        find: /^(?:@projectx\/email)(?:$)/,
        replacement: fileURLToPath(
          new URL("../../packages/email/src/index.ts", import.meta.url),
        ),
      },
    ],
  },
  ssr: {
    noExternal: ["@projectx/ui", "@projectx/models"],
  },
  optimizeDeps: {
    exclude: [
      "@projectx/ui",
      "@nestjs/common",
      "@nestjs/core",
      "@nestjs/mapped-types",
      "@nestjs/swagger",
      "class-transformer",
      "class-validator",
    ],
  },
}));
