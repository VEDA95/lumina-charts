import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@lumina-charts/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
