import Phaser from 'phaser';
import { TEXTURE } from './registry';

export const TILE_SIZE = 32;
export const TILE_MARGIN = 1;
export const TILE_SPACING = 2;
export const TOTAL_TILES = 75;

// Re-exported so existing importers keep working; the data itself lives in a
// Phaser-free module so level generation can be unit-tested.
export { TILE_INDEX, FLOOR_INDICES } from './tileIndex';

/** Sets up the multi-biome tileset texture with 1px extruded borders to eliminate WebGL tile bleed seams. */
export function buildDungeonTileset(scene: Phaser.Scene, outKey: string): void {
  const source = scene.textures.get(TEXTURE.TILES_BIOME).getSourceImage() as CanvasImageSource;
  const canvas = document.createElement('canvas');
  const extrudedWidth = TOTAL_TILES * (TILE_SIZE + TILE_SPACING);
  const extrudedHeight = TILE_SIZE + 2 * TILE_MARGIN;
  canvas.width = extrudedWidth;
  canvas.height = extrudedHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < TOTAL_TILES; i++) {
    const sx = i * TILE_SIZE;
    const dx = TILE_MARGIN + i * (TILE_SIZE + TILE_SPACING);
    const dy = TILE_MARGIN;

    // Draw central 32x32 tile
    ctx.drawImage(source, sx, 0, TILE_SIZE, TILE_SIZE, dx, dy, TILE_SIZE, TILE_SIZE);

    // 4 borders
    ctx.drawImage(source, sx, 0, 1, TILE_SIZE, dx - 1, dy, 1, TILE_SIZE);
    ctx.drawImage(source, sx + TILE_SIZE - 1, 0, 1, TILE_SIZE, dx + TILE_SIZE, dy, 1, TILE_SIZE);
    ctx.drawImage(source, sx, 0, TILE_SIZE, 1, dx, dy - 1, TILE_SIZE, 1);
    ctx.drawImage(source, sx, TILE_SIZE - 1, TILE_SIZE, 1, dx, dy + TILE_SIZE, TILE_SIZE, 1);

    // 4 corners
    ctx.drawImage(source, sx, 0, 1, 1, dx - 1, dy - 1, 1, 1);
    ctx.drawImage(source, sx + TILE_SIZE - 1, 0, 1, 1, dx + TILE_SIZE, dy - 1, 1, 1);
    ctx.drawImage(source, sx, TILE_SIZE - 1, 1, 1, dx - 1, dy + TILE_SIZE, 1, 1);
    ctx.drawImage(source, sx + TILE_SIZE - 1, TILE_SIZE - 1, 1, 1, dx + TILE_SIZE, dy + TILE_SIZE, 1, 1);
  }

  if (scene.textures.exists(outKey)) scene.textures.remove(outKey);
  const texture = scene.textures.addCanvas(outKey, canvas)!;
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  for (let i = 0; i < TOTAL_TILES; i++) {
    const x = TILE_MARGIN + i * (TILE_SIZE + TILE_SPACING);
    const y = TILE_MARGIN;
    texture.add(i, 0, x, y, TILE_SIZE, TILE_SIZE);
  }
}
