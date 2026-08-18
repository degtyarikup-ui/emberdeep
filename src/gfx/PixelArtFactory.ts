import Phaser from 'phaser';
import { PALETTE, PaletteKey } from './palette';

// A row of characters; each character is a key into a Legend, '.' is transparent.
export type PixelGrid = string[];
export type Legend = Record<string, PaletteKey>;

function drawGrid(ctx: CanvasRenderingContext2D, grid: PixelGrid, legend: Legend, ox: number, oy: number): void {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const key = legend[ch];
      if (!key) continue;
      ctx.fillStyle = PALETTE[key];
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function gridSize(grid: PixelGrid): { w: number; h: number } {
  const h = grid.length;
  const w = grid.reduce((m, row) => Math.max(m, row.length), 0);
  return { w, h };
}

/**
 * Registers a horizontal strip of same-size frames as a Phaser texture with
 * numeric frame indices 0..n-1, ready for scene.anims.generateFrameNumbers().
 */
export function defineSpritesheet(
  scene: Phaser.Scene,
  key: string,
  frames: PixelGrid[],
  legend: Legend
): { frameWidth: number; frameHeight: number; frameCount: number } {
  const sizes = frames.map(gridSize);
  const frameWidth = sizes.reduce((m, s) => Math.max(m, s.w), 0);
  const frameHeight = sizes.reduce((m, s) => Math.max(m, s.h), 0);

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frames.length;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;
  frames.forEach((grid, i) => drawGrid(ctx, grid, legend, i * frameWidth, 0));

  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, canvas)!;
  frames.forEach((_, i) => {
    texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
  });

  return { frameWidth, frameHeight, frameCount: frames.length };
}
