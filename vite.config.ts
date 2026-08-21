import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Stamps the build with the commit it came from.
 *
 * GitHub Pages serves index.html with max-age=600, so for up to ten minutes
 * after a deploy a browser can still be running the previous bundle. That has
 * repeatedly looked like "my push did not deploy". With this stamp the answer
 * is checkable at a glance instead of guessed.
 */
function buildStamp(): { sha: string; time: string } {
  // GitHub Actions provides the SHA; locally fall back to git, and to 'dev'
  // when neither is available (e.g. a source tarball).
  let sha = process.env.GITHUB_SHA ?? '';
  if (!sha) {
    try {
      sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      sha = 'dev';
    }
  }
  return { sha: sha.slice(0, 7), time: new Date().toISOString().slice(0, 16).replace('T', ' ') };
}

const stamp = buildStamp();

// Use relative base ('./') so the build works in any environment:
// Yandex Games ZIP archive, local previews, GitHub Pages, or custom CDN paths.
export default defineConfig({
  base: './',
  define: {
    __BUILD_SHA__: JSON.stringify(stamp.sha),
    __BUILD_TIME__: JSON.stringify(stamp.time),
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
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
