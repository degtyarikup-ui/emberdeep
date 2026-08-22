import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Phaser's WebGL renderer requires this debug-only package at import
      // time; it is not a real dependency and nothing under test renders.
      phaser3spectorjs: fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
    },
  },
  test: {
    // Phaser touches window/document at import time, and several modules under
    // test pull it in transitively (world/level1 → gfx/tiles → phaser).
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
    server: { deps: { inline: ['phaser'] } },
    deps: {
      inline: ['phaser'],
      optimizer: {
        web: {
          include: ['phaser'],
        },
      },
    },
  },
});
