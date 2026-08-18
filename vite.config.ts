import { defineConfig } from 'vite';

// base only needs to change for the GitHub Pages build — locally the app
// still serves from the root so `npm run dev` behaves exactly as before.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/emberdeep/' : '/',
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'esnext',
  },
}));
