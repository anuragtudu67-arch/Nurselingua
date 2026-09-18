import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server binds 0.0.0.0 for sandboxed previews. /api is proxied to the
// backend (Spring Boot or api-mock) so browser code uses relative URLs only.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow sandboxed/proxied preview hosts.
    allowedHosts: true as unknown as string[],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: { host: '0.0.0.0', port: 5173 },
});
