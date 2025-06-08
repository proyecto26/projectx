/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from the root of the monorepo
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
      nxViteTsPaths({
        debug: false, // Keep debug option if helpful
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        // Keep '~' alias for now, just in case
        '~': resolve(__dirname, 'app'),
      },
      // Improve module resolution
      conditions: ['import', 'module', 'browser', 'default'],
      mainFields: ['browser', 'module', 'main'],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
    },
    define: {
      // Define env variables for server-side code
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || mode),
      'process.env.SESSION_SECRET': JSON.stringify(env.SESSION_SECRET),
      'process.env.STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.STRIPE_PUBLISHABLE_KEY),
      'process.env.AUTH_API_URL': JSON.stringify(env.AUTH_API_URL),
      'process.env.ORDER_API_URL': JSON.stringify(env.ORDER_API_URL),
      'process.env.PRODUCT_API_URL': JSON.stringify(env.PRODUCT_API_URL),
      // Vite uses import.meta.env for client-side variables (prefixed with VITE_)
      'import.meta.env': JSON.stringify({ ...env /* Filter VITE_ vars if needed */ })
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['class-transformer/storage', '@nestjs/mapped-types', 'bcrypt']
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
  };
});
