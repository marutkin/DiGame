import { defineConfig } from 'vite';

// Конфиг специально заточен под мобильный Safari + Phaser
export default defineConfig({
  base: './',
  server: {
    port: 5174,           // отдельный порт от основного проекта DiGame
    host: true,           // чтобы можно было открыть по локальному IP
    strictPort: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    // Оптимизации для мобильных
    minify: 'esbuild',
    sourcemap: false
  },
  optimizeDeps: {
    // Phaser иногда требует специальной обработки
    include: ['phaser']
  }
});
