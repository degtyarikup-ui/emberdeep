#!/usr/bin/env node
/**
 * Autonomous Headless Screenshot & Visual Verification Tool for Emberdeep.
 * Connects directly to Google Chrome via Chrome DevTools Protocol (CDP) over WebSocket.
 * 
 * Usage:
 *   node --experimental-websocket scripts/capture_game.js [--out path/to/output.png] [--scene menu|game] [--port 5190]
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;
const args = process.argv.slice(2);

function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const outputPath = path.resolve(getArg('--out', 'artifacts/game_capture.png'));
const targetScene = getArg('--scene', 'menu'); // 'menu' or 'game'
const port = getArg('--port', '5190');
const url = `http://localhost:${port}/`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWebSocketDebuggerUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is starting up
    }
    await sleep(200);
  }
  throw new Error('Failed to connect to Chrome remote debugging port.');
}

let viteProcess = null;

async function ensureViteServer() {
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log(`[Capture] Vite server already running at ${url}`);
      return;
    }
  } catch {}

  console.log(`[Capture] Starting Vite server on port ${port}...`);
  viteProcess = spawn('npx', ['vite', '--port', port, '--strictPort'], {
    stdio: 'ignore',
  });

  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`[Capture] Vite server ready at ${url}`);
        return;
      }
    } catch {}
  }
  throw new Error(`Failed to start Vite dev server on port ${port}`);
}

async function run() {
  await ensureViteServer();
  console.log(`[Capture] Launching Chrome headless on port ${DEBUG_PORT}...`);
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu-sandbox',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--window-size=1280,720',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--autoplay-policy=no-user-gesture-required',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  const cleanup = () => {
    try {
      chromeProcess.kill('SIGTERM');
    } catch {}
    try {
      viteProcess?.kill('SIGTERM');
    } catch {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(); });

  try {
    const wsUrl = await getWebSocketDebuggerUrl();
    console.log(`[Capture] Connected to CDP: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        const { resolve, reject } = callbacks.get(data.id);
        callbacks.delete(data.id);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    };

    await new Promise((resolve) => ws.onopen = resolve);

    const send = (method, params = {}) => {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    // Create a new target/page
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

    const sendSession = (method, params = {}) => {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, sessionId, method, params }));
      });
    };

    await sendSession('Page.enable');
    await sendSession('Runtime.enable');
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`[Capture] Navigating to ${url}...`);
    await sendSession('Page.navigate', { url });

    // Wait for Phaser game instance to be ready and scene to load
    console.log('[Capture] Waiting for Phaser boot and scene initialization...');
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      await sleep(300);
      try {
        const evalRes = await sendSession('Runtime.evaluate', {
          expression: `(() => {
            if (!window.game || !window.game.scene) return { ready: false, activeScenes: [] };
            const activeScenes = window.game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
            return { ready: activeScenes.length > 0, activeScenes };
          })()`,
          returnByValue: true,
        });

        const info = evalRes?.result?.value;
        if (info && info.ready) {
          console.log(`[Capture] Current active scenes: ${info.activeScenes.join(', ')}`);
          
          if (targetScene === 'game') {
            if (info.activeScenes.includes('Game')) {
              // Game scene is loaded! Let it run for a moment so lighting and entities render
              ready = true;
              break;
            } else if (info.activeScenes.includes('Menu')) {
              console.log('[Capture] Menu detected, launching GameScene...');
              await sendSession('Runtime.evaluate', {
                expression: `(() => {
                  const menu = window.game.scene.getScene('Menu');
                  if (menu && menu.scene.isActive()) {
                    menu.scene.start('Game', { heroClass: 'knight', seed: 42, depth: 1, isCoop: false });
                  }
                })()`,
              });
              await sleep(1000);
            }
          } else {
            // Target is Menu
            if (info.activeScenes.includes('Menu')) {
              ready = true;
              break;
            }
          }
        }
      } catch (err) {
        // continue waiting
      }
    }

    if (!ready) {
      console.warn('[Capture] Warning: Scene readiness check timed out, attempting screenshot anyway...');
    } else {
      // Let animation frames settle
      console.log('[Capture] Settling frames...');
      await sleep(2000);
    }

    console.log('[Capture] Taking screenshot...');
    const screenshot = await sendSession('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });

    const buffer = Buffer.from(screenshot.data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`[Capture] Screenshot saved successfully: ${outputPath} (${buffer.length} bytes)`);

    ws.close();
  } finally {
    cleanup();
  }
}

run().catch((err) => {
  console.error('[Capture Error]:', err);
  process.exit(1);
});
