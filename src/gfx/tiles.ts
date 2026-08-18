import Phaser from 'phaser';
import { getPackSource, PACK } from './pack';

// Environment tiles are cropped from "Pixel Crawler" by Anokolisa (see
// vendor/pixel-crawler/CREDIT.md), Dungeon_Tiles.png.
const TILE_SIZE = 32;

const SRC: Record<string, [number, number]> = {
  wall: [0, 0],
  floor1: [96, 32],
  floor2: [64, 0],
  floor3: [64, 32],
  floor4: [96, 0],
};

export const TILE_INDEX = {
  FLOOR_1: 0,
  FLOOR_2: 1,
  FLOOR_3: 2,
  FLOOR_4: 3,
  WALL: 4,
} as const;

export const FLOOR_INDICES: number[] = [
  TILE_INDEX.FLOOR_1,
  TILE_INDEX.FLOOR_2,
  TILE_INDEX.FLOOR_3,
  TILE_INDEX.FLOOR_4,
];

// order matters — position here IS the tile index used by the level grid
const ORDER: (keyof typeof SRC)[] = ['floor1', 'floor2', 'floor3', 'floor4', 'wall'];

/** Crops the named tiles out of the loaded pack image into a fresh, tightly-packed tileset texture. */
export function buildDungeonTileset(scene: Phaser.Scene, outKey: string): void {
  const source = getPackSource(scene, PACK.DUNGEON_TILES.key);
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE * ORDER.length;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ORDER.forEach((name, i) => {
    const [sx, sy] = SRC[name];
    ctx.drawImage(source, sx, sy, TILE_SIZE, TILE_SIZE, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  });

  if (scene.textures.exists(outKey)) scene.textures.remove(outKey);
  const texture = scene.textures.addCanvas(outKey, canvas)!;
  ORDER.forEach((_, i) => texture.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE));
}
