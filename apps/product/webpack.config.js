const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = (options) => {
  // Check if we're in development mode
  const isDevelopment = options.mode === 'development' || process.env.NODE_ENV === 'development';

  // Base configuration
  const config = {
    output: {
      path: join(__dirname, '../../dist/apps/product'),
    },
    devtool: 'source-map',
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        assets: ['./src/assets'],
        optimization: false,
        outputHashing: 'none',
        generatePackageJson: true,
        sourceMap: true
      }),
    ],
  };

  // Add HMR configuration in development mode
  if (isDevelopment) {
    console.log('Enabling Hot Module Replacement for NestJS in development mode');
    
    // Modify configuration for development
    config.watch = true;
    config.entry = ['webpack/hot/poll?500', join(__dirname, './src/main.ts')];
    config.externals = [
      nodeExternals({
        allowlist: ['webpack/hot/poll?500'],
      }),
    ];
    
    // Add HMR plugin
    config.plugins.push(
      new RunScriptWebpackPlugin({
        name: 'main.js',
        autoRestart: true,
      })
    );
  }

  return config;
};
