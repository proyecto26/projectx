import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/lib/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: [
    '../../../../apps/web/public',
    '../styles', // Add styles directory to static dirs
  ],
  viteFinal: async (config) => {
    return mergeConfig(config, {
      // Add paths plugin to support Nx aliases
      plugins: [nxViteTsPaths()],
      // Force CSS processing
      css: {
        devSourcemap: true
      },
      // Ensure dependencies are included
      optimizeDeps: {
        include: ['react', 'react-dom'],
      }
    });
  },
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs
