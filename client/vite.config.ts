import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '..',
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['.gitpod.dev', '.tikoflano.work'],
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
