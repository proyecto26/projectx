/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [
    tailwindcss(),
    !process.env.VITEST && reactRouter(),
    nxViteTsPaths(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      // Añadir otros alias útiles basados en el tsconfig
      '@projectx/models': resolve(__dirname, '../../libs/models/src/index.ts'),
      '@projectx/ui': resolve(__dirname, '../../libs/frontend/ui/src/index.ts'),
      '@projectx/core': resolve(__dirname, '../../libs/backend/core/src/index.ts'),
      '@projectx/email': resolve(__dirname, '../../libs/backend/email/src/index.ts'),
      '@projectx/db': resolve(__dirname, '../../libs/backend/db/src/index.ts')
    },
    // Ignorar las resoluciones de manifest de React Router
    conditions: ['import', 'module', 'browser', 'default']
  },
  optimizeDeps: {
    exclude: ['class-transformer/storage', '@nestjs/mapped-types']
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    rollupOptions: {
      external: ['class-transformer/storage', '@nestjs/mapped-types']
    }
  },
  ssr: {
    noExternal: ['react-toastify', '@remix-utils/**']
  },
  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
});
