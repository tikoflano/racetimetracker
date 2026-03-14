import os from 'os';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use a writable cache dir (e.g. /tmp) so Vite works when node_modules is a read-only or root-owned volume (devcontainer)
  cacheDir: path.join(os.tmpdir(), 'vite-client2'),
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
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
