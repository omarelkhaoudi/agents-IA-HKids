import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react') || id.includes('react-router-dom')) {
            return 'vendor-react';
          }

          if (id.includes('dompurify')) {
            return 'vendor-sanitize';
          }

          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
