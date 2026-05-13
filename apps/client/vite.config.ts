import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@modern-api-studio/types': path.resolve(__dirname, '../../packages/types/index.ts'),
      '@modern-api-studio/utils': path.resolve(__dirname, '../../packages/utils/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: ['js-yaml', 'uuid'],
  },
});
