import Phaser from 'phaser';
import { TEXTURE } from './registry';

export const TILE_SIZE = 32;
export const TILE_MARGIN = 1;
export const TILE_SPACING = 2;
export const TOTAL_TILES = 14;

export const TILE_INDEX = {
  GRASS_1: 0,
  GRASS_2: 1,
  GRASS_3: 2,
  DIRT_1: 3,
  DIRT_2: 4,
  RUIN_STONE: 5,
  DUNGEON_1: 6,
  DUNGEON_2: 7,
  DUNGEON_3: 8,
  DUNGEON_4: 9,
  MAGMA_1: 10,
  MAGMA_2: 11,
  WALL_DUNGEON: 12,
  WALL_RUIN: 13,
  // Backwards compatibility aliases
  WALL: 12,
  FLOOR_1: 6,
  FLOOR_2: 7,
  FLOOR_3: 8,
  FLOOR_4: 9,
} as const;

export const FLOOR_INDICES: number[] = [
  TILE_INDEX.GRASS_1,
  TILE_INDEX.GRASS_2,
  TILE_INDEX.GRASS_3,
  TILE_INDEX.DIRT_1,
  TILE_INDEX.DIRT_2,
  TILE_INDEX.RUIN_STONE,
  TILE_INDEX.DUNGEON_1,
  TILE_INDEX.DUNGEON_2,
  TILE_INDEX.DUNGEON_3,
  TILE_INDEX.DUNGEON_4,
  TILE_INDEX.MAGMA_1,
  TILE_INDEX.MAGMA_2,
];

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
