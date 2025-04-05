const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/order'),
  },
  devtool: 'source-map',
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets', './src/workflows'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true
    }),
  ],
};