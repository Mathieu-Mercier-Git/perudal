import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // uncomment the line with the base attribute to use the context path /admin/
  // base: '/admin/',
  build: {
    outDir: 'build',
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
      // the game WebSocket is mounted on /socket by the backend, outside of the /api context path
      '/socket': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
