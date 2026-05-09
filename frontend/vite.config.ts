import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8081';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  define: {
    global: 'globalThis',
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});