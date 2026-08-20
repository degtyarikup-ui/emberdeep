import { defineConfig } from 'vite';

// Use relative base ('./') so the build works in any environment:
// Yandex Games ZIP archive, local previews, GitHub Pages, or custom CDN paths.
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          // Phaser is ~3/4 of the bundle and changes only when we bump the
          // dependency. Splitting it out means a returning player re-downloads
          // just the game code after each deploy instead of the whole thing.
          phaser: ['phaser'],
        },
      },
    },
    // The engine chunk alone is legitimately ~1.4 MB; warn above that.
    chunkSizeWarningLimit: 1600,
  },
});
