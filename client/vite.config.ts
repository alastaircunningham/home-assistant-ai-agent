import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: '../server/dist/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8099',
      '/ws': { target: 'ws://localhost:8099', ws: true },
    },
  },
});
