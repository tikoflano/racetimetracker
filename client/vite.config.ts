import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vercel from 'vite-plugin-vercel';

export default defineConfig({
  plugins: [react(), vercel()],
  vercel: {
    rewrites: [{ source: '/(.*)', destination: '/index.html' }],
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
    allowedHosts: ['.tikoflano.work'],
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
