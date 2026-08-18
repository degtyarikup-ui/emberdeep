import { TILE_INDEX } from '../gfx/tiles';
import { PROP, PropKey } from '../gfx/props';
import { EnemyKind } from '../entities/Enemy';
import { prand } from '../gfx/shapes';

export const COLS = 44;
export const ROWS = 24;
export const TILE_SIZE = 32;

export interface LevelData {
  data: number[][];
  spawn: { col: number; row: number };
  torches: { col: number; row: number }[];
  decorations: { col: number; row: number; key: PropKey; solid: boolean }[];
  flasks: { col: number; row: number; key: PropKey }[];
  chests: { col: number; row: number }[];
  altar: { col: number; row: number };
  exit: { col: number; row: number };
  enemies: { col: number; row: number; kind: EnemyKind }[];
}

const FLOOR = 0;
const WALL = 1;

function carveRect(grid: number[][], x0: number, y0: number, w: number, h: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
      grid[y][x] = FLOOR;
    }
  }
}

function classify(binary: number[][]): number[][] {
  const floorPick = prand(2026);
  const floorVariant = () => TILE_INDEX.FLOOR_1 + Math.floor(floorPick() * 4);
  return binary.map((row) => row.map((cell) => (cell === FLOOR ? floorVariant() : TILE_INDEX.WALL)));
}

// Extra enemy packs that only appear once the dungeon has been cleared
// enough times — depth 2 adds the first pack, depth 3 adds both, etc.
const DEPTH_BONUS_ENEMIES: { col: number; row: number; kind: EnemyKind }[][] = [
  [
    { col: 8, row: 4, kind: 'imp' },
    { col: 23, row: 6, kind: 'imp' },
  ],
  [
    { col: 18, row: 19, kind: 'skeleton' },
    { col: 37, row: 15, kind: 'imp' },
  ],
];

export function buildLevel1(depth = 1): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  // Entry Hall -> Guard Room -> Great Hall -> Exit Chamber, plus a reward
  // alcove tucked off the entry hall.
  carveRect(binary, 2, 2, 10, 8); // Room A (Entry Hall): x2-11, y2-9
  carveRect(binary, 4, 10, 3, 3); // reward alcove: x4-6, y10-12
  carveRect(binary, 11, 4, 8, 2); // corridor A->B: x11-18, y4-5
  carveRect(binary, 18, 1, 10, 8); // Room B (Guard Room): x18-27, y1-8
  carveRect(binary, 21, 8, 2, 6); // corridor B->C: x21-22, y8-13
  carveRect(binary, 14, 13, 16, 9); // Room C (Great Hall): x14-29, y13-21
  carveRect(binary, 29, 15, 6, 3); // corridor C->Exit: x29-34, y15-17
  carveRect(binary, 34, 13, 8, 7); // Exit Chamber: x34-41, y13-19

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 14, row: 4, kind: 'imp' }, // corridor A->B guard
    { col: 21, row: 4, kind: 'imp' },
    { col: 24, row: 6, kind: 'imp' },
    { col: 21, row: 10, kind: 'skeleton' }, // corridor B->C guard
    { col: 18, row: 17, kind: 'skeleton' },
    { col: 25, row: 16, kind: 'imp' },
    { col: 27, row: 19, kind: 'skeleton' },
  ];
  for (let i = 0; i < Math.min(depth - 1, DEPTH_BONUS_ENEMIES.length); i++) {
    enemies.push(...DEPTH_BONUS_ENEMIES[i]);
  }

  return {
    data: classify(binary),
    spawn: { col: 6, row: 6 },
    // positions sit on the WALL cell bordering a room, so the sprite's
    // built-in bracket lands right at the wall/floor seam.
    torches: [
      { col: 4, row: 1 },
      { col: 9, row: 1 },
      { col: 14, row: 3 }, // lights corridor A->B
      { col: 20, row: 0 },
      { col: 25, row: 0 },
      { col: 20, row: 10 }, // lights corridor B->C (side-mounted)
      { col: 17, row: 12 },
      { col: 26, row: 12 },
      { col: 31, row: 14 }, // lights corridor C->Exit
      { col: 36, row: 12 },
      { col: 39, row: 12 },
    ],
    decorations: [
      { col: 4, row: 7, key: PROP.BARREL, solid: true },
      { col: 5, row: 7, key: PROP.CRATE, solid: true },
      { col: 9, row: 4, key: PROP.TOMBSTONE, solid: true },
      { col: 9, row: 3, key: PROP.CRATE, solid: true },
      { col: 7, row: 1, key: PROP.BANNER_GREEN, solid: false },
      { col: 6, row: 11, key: PROP.CRATE, solid: true },
      { col: 15, row: 5, key: PROP.BARREL, solid: true },
      { col: 20, row: 3, key: PROP.BARREL, solid: true },
      { col: 21, row: 3, key: PROP.CRATE, solid: true },
      { col: 25, row: 7, key: PROP.BARREL, solid: true },
      { col: 26, row: 6, key: PROP.CRATE, solid: true },
      { col: 26, row: 3, key: PROP.TOMBSTONE, solid: true },
      { col: 22, row: 0, key: PROP.BANNER_BLUE, solid: false },
      { col: 16, row: 14, key: PROP.TOMBSTONE, solid: true },
      { col: 27, row: 20, key: PROP.TOMBSTONE, solid: true },
      { col: 16, row: 16, key: PROP.BARREL, solid: true },
      { col: 15, row: 16, key: PROP.CRATE, solid: true },
      { col: 27, row: 18, key: PROP.BARREL, solid: true },
      { col: 28, row: 18, key: PROP.CRATE, solid: true },
      { col: 20, row: 12, key: PROP.BANNER_RED, solid: false },
      { col: 37, row: 17, key: PROP.BARREL, solid: true },
      { col: 36, row: 17, key: PROP.CRATE, solid: true },
      { col: 38, row: 15, key: PROP.TOMBSTONE, solid: true },
    ],
    flasks: [
      { col: 8, row: 6, key: PROP.FLASK_RED },
      { col: 23, row: 5, key: PROP.FLASK_BLUE },
      { col: 17, row: 18, key: PROP.FLASK_GREEN },
      { col: 26, row: 16, key: PROP.FLASK_YELLOW },
      { col: 36, row: 16, key: PROP.FLASK_RED },
    ],
    chests: [
      { col: 5, row: 11 }, // reward alcove
      { col: 39, row: 17 }, // exit chamber, a last bonus before descending
    ],
    altar: { col: 22, row: 17 },
    exit: { col: 38, row: 16 },
    enemies,
  };
}
