import Phaser from 'phaser';
import { TEXTURE } from './registry';

const TILE_SIZE = 32;
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

/** Sets up the multi-biome tileset texture with indexed 32x32 frames. */
export function buildDungeonTileset(scene: Phaser.Scene, outKey: string): void {
  const source = scene.textures.get(TEXTURE.TILES_BIOME).getSourceImage() as CanvasImageSource;
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE * TOTAL_TILES;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);

  if (scene.textures.exists(outKey)) scene.textures.remove(outKey);
  const texture = scene.textures.addCanvas(outKey, canvas)!;
  for (let i = 0; i < TOTAL_TILES; i++) {
    texture.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  }
}
