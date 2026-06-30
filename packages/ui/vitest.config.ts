import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
  },
  resolve: {
    alias: {
      '@zira/utils': path.resolve(__dirname, '../utils/src/index.ts'),
    },
  },
});