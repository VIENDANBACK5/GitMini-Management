import path from 'path'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
      '/repos': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
      '/issues': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
      '/pulls': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
      '/analytics': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
      '/search': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
    },
  },
});
