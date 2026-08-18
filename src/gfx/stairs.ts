import Phaser from 'phaser';

// No "stairs down" sprite in the current pack — hand-drawn to match its
// cool stone palette.
const SIZE = 32;

const OUTLINE = '#141a20';
const STONE_LIGHT = '#7c8ea0';
const STONE_MID = '#586a7a';
const STONE_DARK = '#3a4652';
const VOID = '#0a0c10';
const GLOW = '#ffce6b';

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function buildStairsTexture(scene: Phaser.Scene, outKey: string): void {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  box(ctx, 3, 3, 26, 26, OUTLINE);
  box(ctx, 4, 4, 24, 24, STONE_DARK);

  // receding steps, each band narrower and darker toward the void at back
  const bands: [number, number, number, number, string][] = [
    [5, 6, 22, 4, STONE_LIGHT],
    [6, 10, 20, 4, STONE_MID],
    [7, 14, 18, 4, STONE_DARK],
    [9, 18, 14, 4, '#222a32'],
    [11, 22, 10, 5, VOID],
  ];
  for (const [x, y, w, h, color] of bands) box(ctx, x, y, w, h, color);

  // a faint warm glow rising from the depths
  ctx.fillStyle = GLOW;
  ctx.globalAlpha = 0.25;
  box(ctx, 13, 21, 6, 4, GLOW);
  ctx.globalAlpha = 1;

  if (scene.textures.exists(outKey)) scene.textures.remove(outKey);
  scene.textures.addCanvas(outKey, canvas);
}
