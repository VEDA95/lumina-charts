import { defineConfig } from 'tsup';
import { ReactCompilerEsbuildPlugin } from './esbuild-react-compiler-plugin.js';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
  },
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', '@lumina-charts/core'],
  esbuildPlugins: [
    ReactCompilerEsbuildPlugin({
      filter: /\.tsx$/,
      sourceMaps: true,
    }),
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
