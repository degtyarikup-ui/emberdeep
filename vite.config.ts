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
  },
});
