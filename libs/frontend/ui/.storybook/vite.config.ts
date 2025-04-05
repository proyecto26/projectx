import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// This is a minimal Vite config for Storybook
// It doesn't include the React plugin to avoid HMR issues
export default defineConfig({
  plugins: [
    nxViteTsPaths()
  ],
  // CSS processing configuration
  css: {
    devSourcemap: true,
    // Ensure CSS modules are handled properly
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  },
  // Avoid transform issues
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  // Add environment variables
  define: {
    'process.env': {}
  }
});
