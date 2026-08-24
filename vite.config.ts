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

import { writeFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/**
 * Dev server plugin allowing one-click baking of levels from the map editor
 * directly into src/world/customLevelPreset.ts.
 */
function bakeLevelPlugin(): Plugin {
  return {
    name: 'emberdeep-bake-level-plugin',
    configureServer(server) {
      server.middlewares.use('/api/bake-level', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const level = parsed.level;
            if (!level || !level.cols || !level.rows || !level.data) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid level data' }));
              return;
            }

            const json = JSON.stringify(level, null, 2);
            const tsCode = `import type { LevelData } from './level1';

/**
 * Baked Level 1 preset for Emberdeep production build.
 * When this is non-null, the game will use this exact level data
 * as the official Depth 1 map instead of procedural generation.
 */
export const BAKED_LEVEL_1: LevelData | null = ${json};

export function hasBakedLevel1(): boolean {
  return BAKED_LEVEL_1 !== null;
}

export function getBakedLevel1(): LevelData | null {
  if (!BAKED_LEVEL_1) return null;
  return JSON.parse(JSON.stringify(BAKED_LEVEL_1)) as LevelData;
}
`;

            const targetPath = resolve(__dirname, 'src/world/customLevelPreset.ts');
            writeFileSync(targetPath, tsCode, 'utf8');

            let pushed = false;
            let gitMessage = '';
            try {
              execSync('git add src/world/customLevelPreset.ts', { cwd: __dirname, stdio: 'pipe' });
              const status = execSync('git status --porcelain src/world/customLevelPreset.ts', {
                cwd: __dirname,
                encoding: 'utf8',
              }).trim();

              if (status) {
                execSync('git commit -m "feat(level): update official Level 1 preset from map editor" --no-verify', {
                  cwd: __dirname,
                  stdio: 'pipe',
                });
              }
              execSync('git push origin main', { cwd: __dirname, stdio: 'pipe' });
              pushed = true;
              gitMessage = 'Изменения отправлены в GitHub! Сборка на GitHub Pages запущена.';
            } catch (gitErr) {
              gitMessage = `Локально сохранено, но git push не выполнен: ${gitErr instanceof Error ? gitErr.message : String(gitErr)}`;
            }

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                pushed,
                message: pushed
                  ? 'Уровень успешно вшит и отправлен в прод! Сборка на GitHub Pages уже собирается.'
                  : gitMessage,
              })
            );
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          }
        });
      });
    },
  };
}

// Use relative base ('./') so the build works in any environment:
// Yandex Games ZIP archive, local previews, GitHub Pages, or custom CDN paths.
export default defineConfig({
  plugins: [bakeLevelPlugin()],
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
