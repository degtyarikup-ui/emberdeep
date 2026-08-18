import Phaser from 'phaser';

// No chest sprite in the current pack — hand-drawn to match its warm wood
// palette, closed and open variants side by side in one small texture.
const SIZE = 32;

const WOOD_DARK = '#5a3a22';
const WOOD_MID = '#7a4f2b';
const WOOD_LIGHT = '#9c6a3a';
const METAL = '#c9a227';
const METAL_DARK = '#8a6a1a';
const OUTLINE = '#2a1a10';
const INTERIOR = '#1a1008';
const GOLD = '#ffd75e';

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawClosed(ctx: CanvasRenderingContext2D, ox: number): void {
  box(ctx, ox + 5, 10, 22, 17, OUTLINE);
  box(ctx, ox + 6, 11, 20, 15, WOOD_MID);
  box(ctx, ox + 6, 11, 20, 5, WOOD_LIGHT);
  box(ctx, ox + 6, 15, 20, 2, WOOD_DARK);
  box(ctx, ox + 5, 8, 22, 4, METAL_DARK);
  box(ctx, ox + 5, 8, 22, 2, METAL);
  box(ctx, ox + 14, 14, 4, 6, METAL_DARK);
  box(ctx, ox + 15, 15, 2, 4, METAL);
}

function drawOpen(ctx: CanvasRenderingContext2D, ox: number): void {
  box(ctx, ox + 5, 14, 22, 13, OUTLINE);
  box(ctx, ox + 6, 15, 20, 11, WOOD_MID);
  box(ctx, ox + 7, 16, 18, 6, INTERIOR);
  box(ctx, ox + 11, 18, 4, 3, GOLD);
  box(ctx, ox + 17, 19, 3, 2, GOLD);
  box(ctx, ox + 6, 24, 20, 2, WOOD_DARK);
  // lid, flipped open toward the back — hinged flush against the body's
  // back edge (y=14) so it reads as attached rather than a separate floating piece
  box(ctx, ox + 5, 6, 22, 9, METAL_DARK);
  box(ctx, ox + 6, 7, 20, 7, WOOD_LIGHT);
  box(ctx, ox + 6, 7, 20, 2, METAL);
}

export function buildChestTexture(scene: Phaser.Scene, outKey: string): { closed: number; open: number } {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE * 2;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  drawClosed(ctx, 0);
  drawOpen(ctx, SIZE);

  if (scene.textures.exists(outKey)) scene.textures.remove(outKey);
  const texture = scene.textures.addCanvas(outKey, canvas)!;
  texture.add(0, 0, 0, 0, SIZE, SIZE);
  texture.add(1, 0, SIZE, 0, SIZE, SIZE);

  return { closed: 0, open: 1 };
}
