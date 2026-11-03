import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
  server: {
    port: 4344,
    proxy: {
      "/events": "http://localhost:4343",
      "/prompt": "http://localhost:4343",
      "/prompts": "http://localhost:4343",
      "/respond": "http://localhost:4343",
      "/canvas-update": "http://localhost:4343",
      "/health": "http://localhost:4343",
      "/api": "http://localhost:4343",
    },
  },
});
