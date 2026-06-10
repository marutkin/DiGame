import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true
  },
  // Simple: user_assets served from root or public
});
