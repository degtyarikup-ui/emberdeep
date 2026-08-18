import { TILE_INDEX } from '../gfx/tiles';
import { PROP, PropKey } from '../gfx/props';
import { EnemyKind } from '../entities/Enemy';
import { prand } from '../gfx/shapes';
import { BiomeConfig, getBiomeForDepth } from './biomes';

export const COLS = 46;
export const ROWS = 28;
export const TILE_SIZE = 32;

export interface TreeObject {
  col: number;
  row: number;
  kind: 'pine' | 'oak';
}

export interface LevelData {
  biome: BiomeConfig;
  data: number[][];
  spawn: { col: number; row: number };
  torches: { col: number; row: number }[];
  bonfires?: { col: number; row: number }[];
  trees?: TreeObject[];
  decorations: { col: number; row: number; key: PropKey; solid: boolean }[];
  flasks: { col: number; row: number; key: PropKey }[];
  chests: { col: number; row: number }[];
  shrines: { col: number; row: number; kind: 'blood' | 'chance' }[];
  altar: { col: number; row: number };
  exit: { col: number; row: number };
  enemies: { col: number; row: number; kind: EnemyKind }[];
}

const FLOOR = 0;
const WALL = 1;
const PATH = 2;
const RUIN_FLOOR = 3;

function carveRect(grid: number[][], x0: number, y0: number, w: number, h: number, type = FLOOR): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
      grid[y][x] = type;
    }
  }
}

function carvePath(grid: number[][], x1: number, y1: number, x2: number, y2: number, width = 2): void {
  let cx = x1;
  let cy = y1;
  while (cx !== x2 || cy !== y2) {
    carveRect(grid, Math.round(cx) - Math.floor(width / 2), Math.round(cy) - Math.floor(width / 2), width, width, PATH);
    if (Math.abs(x2 - cx) > Math.abs(y2 - cy)) {
      cx += cx < x2 ? 1 : -1;
    } else {
      cy += cy < y2 ? 1 : -1;
    }
  }
  carveRect(grid, x2 - 1, y2 - 1, width, width, PATH);
}

/** Level 1: "Забытые Руины" — Outdoor forest clearings, paths, campsite and ancient stone dais */
function buildOutdoorRuins(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(FLOOR));

  // Outer boundary walls (dense forest boundary)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r <= 1 || r >= ROWS - 2 || c <= 1 || c >= COLS - 2) {
        binary[r][c] = WALL;
      }
    }
  }

  // Ancient Ruin Stone Platforms
  carveRect(binary, 5, 12, 6, 6, RUIN_FLOOR); // West campsite dais
  carveRect(binary, 20, 4, 8, 6, RUIN_FLOOR); // North shrine ruins
  carveRect(binary, 20, 18, 8, 6, RUIN_FLOOR); // South treasure ruins
  carveRect(binary, 34, 10, 9, 9, RUIN_FLOOR); // East Altar Grand Dais

  // Winding Dirt Roads connecting clearings
  carvePath(binary, 8, 15, 24, 7, 2);
  carvePath(binary, 8, 15, 24, 21, 2);
  carvePath(binary, 24, 7, 38, 14, 2);
  carvePath(binary, 24, 21, 38, 14, 2);
  carvePath(binary, 8, 15, 38, 14, 2);

  // Stone Ruin Walls (impassable ancient structures)
  // North ruin walls
  for (let c = 20; c <= 27; c++) binary[4][c] = WALL;
  binary[5][20] = WALL;
  binary[5][27] = WALL;
  binary[8][20] = WALL;
  binary[8][27] = WALL;

  // South ruin walls
  for (let c = 20; c <= 27; c++) binary[23][c] = WALL;
  binary[19][20] = WALL;
  binary[19][27] = WALL;
  binary[22][20] = WALL;
  binary[22][27] = WALL;

  // East dais boundary pillars / ruin walls
  binary[10][34] = WALL;
  binary[10][42] = WALL;
  binary[18][34] = WALL;
  binary[18][42] = WALL;

  const rand = prand(31415 + depth * 77);

  // Tile classification
  const data: number[][] = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_RUIN;
      if (cell === PATH) return rand() > 0.5 ? TILE_INDEX.DIRT_1 : TILE_INDEX.DIRT_2;
      if (cell === RUIN_FLOOR) return TILE_INDEX.RUIN_STONE;
      // Default grass variant
      const g = rand();
      return g < 0.45 ? TILE_INDEX.GRASS_1 : g < 0.8 ? TILE_INDEX.GRASS_2 : TILE_INDEX.GRASS_3;
    })
  );

  // Trees forming natural groves
  const trees: TreeObject[] = [
    // West forest cluster
    { col: 3, row: 5, kind: 'pine' },
    { col: 4, row: 8, kind: 'oak' },
    { col: 3, row: 20, kind: 'pine' },
    { col: 4, row: 23, kind: 'oak' },

    // Central forest divides
    { col: 14, row: 6, kind: 'pine' },
    { col: 16, row: 8, kind: 'oak' },
    { col: 14, row: 21, kind: 'oak' },
    { col: 16, row: 23, kind: 'pine' },

    // North-Central grove
    { col: 29, row: 4, kind: 'oak' },
    { col: 31, row: 6, kind: 'pine' },

    // South-Central grove
    { col: 29, row: 23, kind: 'pine' },
    { col: 31, row: 21, kind: 'oak' },

    // East edge trees
    { col: 43, row: 7, kind: 'pine' },
    { col: 43, row: 21, kind: 'pine' },
  ];

  // Bonfire campsite at spawn
  const bonfires = [{ col: 8, row: 14 }];

  // Torches on ruin pillars
  const torches = [
    { col: 21, row: 4 },
    { col: 26, row: 4 },
    { col: 21, row: 18 },
    { col: 26, row: 18 },
    { col: 35, row: 10 },
    { col: 41, row: 10 },
    { col: 35, row: 18 },
    { col: 41, row: 18 },
  ];

  // Destructible props & rocks
  const decorations = [
    // Campsite crates & barrels
    { col: 6, row: 13, key: PROP.CRATE, solid: true },
    { col: 6, row: 15, key: PROP.BARREL, solid: true },
    { col: 10, row: 13, key: PROP.BARREL, solid: true },

    // North ruin barrels
    { col: 21, row: 6, key: PROP.BARREL, solid: true },
    { col: 22, row: 6, key: PROP.CRATE, solid: true },
    { col: 26, row: 6, key: PROP.BARREL, solid: true },

    // South ruin crates & tombstones
    { col: 21, row: 20, key: PROP.TOMBSTONE, solid: true },
    { col: 25, row: 20, key: PROP.CRATE, solid: true },
    { col: 26, row: 21, key: PROP.BARREL, solid: true },

    // East Dais barrels
    { col: 36, row: 12, key: PROP.BARREL, solid: true },
    { col: 40, row: 12, key: PROP.CRATE, solid: true },
    { col: 36, row: 16, key: PROP.BARREL, solid: true },
    { col: 40, row: 16, key: PROP.CRATE, solid: true },
  ];

  const flasks = [
    { col: 10, row: 15, key: PROP.FLASK_RED },
    { col: 23, row: 5, key: PROP.FLASK_RED },
  ];

  const chests = [
    { col: 7, row: 13 },
    { col: 24, row: 20 },
    { col: 38, row: 12 },
  ];

  const shrines: { col: number; row: number; kind: 'blood' | 'chance' }[] = [
    { col: 24, row: 6, kind: 'blood' },
    { col: 23, row: 19, kind: 'chance' },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 15, row: 11, kind: 'imp' },
    { col: 15, row: 18, kind: 'imp' },
    { col: 22, row: 7, kind: 'skeleton' },
    { col: 25, row: 7, kind: 'imp' },
    { col: 22, row: 21, kind: 'skeleton' },
    { col: 25, row: 21, kind: 'skeleton' },
    { col: 31, row: 14, kind: 'imp' },
    { col: 36, row: 14, kind: 'imp' },
    { col: 40, row: 14, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 8, row: 15 },
    torches,
    bonfires,
    trees,
    decorations,
    flasks,
    chests,
    shrines,
    altar: { col: 38, row: 14 },
    exit: { col: 42, row: 14 },
    enemies,
  };
}

/** Level 2: "Тёмные Катакомбы" — Classic stone dungeon rooms, corridors, columns and torch halls */
function buildCatacombs(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  carveRect(binary, 2, 2, 10, 8); // Room A (Entry Hall): x2-11, y2-9
  carveRect(binary, 4, 10, 4, 4); // reward alcove: x4-7, y10-13
  carveRect(binary, 11, 4, 8, 3); // corridor A->B: x11-18, y4-6
  carveRect(binary, 18, 1, 11, 9); // Room B (Guard Room): x18-28, y1-9
  carveRect(binary, 22, 9, 3, 7); // corridor B->C: x22-24, y9-15
  carveRect(binary, 14, 15, 18, 10); // Room C (Great Hall): x14-31, y15-24
  carveRect(binary, 31, 17, 7, 4); // corridor C->Exit: x31-37, y17-20
  carveRect(binary, 37, 14, 7, 9); // Exit Chamber: x37-43, y14-22

  const rand = prand(9999 + depth * 31);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_DUNGEON;
      const v = rand();
      return v < 0.3 ? TILE_INDEX.DUNGEON_1 : v < 0.6 ? TILE_INDEX.DUNGEON_2 : v < 0.85 ? TILE_INDEX.DUNGEON_3 : TILE_INDEX.DUNGEON_4;
    })
  );

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 14, row: 5, kind: 'imp' },
    { col: 22, row: 4, kind: 'imp' },
    { col: 25, row: 6, kind: 'imp' },
    { col: 23, row: 12, kind: 'skeleton' },
    { col: 18, row: 19, kind: 'skeleton' },
    { col: 26, row: 18, kind: 'imp' },
    { col: 28, row: 21, kind: 'skeleton' },
    { col: 34, row: 18, kind: 'imp' },
  ];

  return {
    biome,
    data,
    spawn: { col: 6, row: 6 },
    torches: [
      { col: 4, row: 1 },
      { col: 9, row: 1 },
      { col: 14, row: 3 },
      { col: 20, row: 0 },
      { col: 26, row: 0 },
      { col: 21, row: 12 },
      { col: 17, row: 14 },
      { col: 28, row: 14 },
      { col: 33, row: 16 },
      { col: 39, row: 13 },
    ],
    decorations: [
      { col: 4, row: 7, key: PROP.BARREL, solid: true },
      { col: 5, row: 7, key: PROP.CRATE, solid: true },
      { col: 5, row: 12, key: PROP.TOMBSTONE, solid: true },
      { col: 21, row: 3, key: PROP.BARREL, solid: true },
      { col: 26, row: 3, key: PROP.CRATE, solid: true },
      { col: 18, row: 17, key: PROP.BARREL, solid: true },
      { col: 28, row: 17, key: PROP.CRATE, solid: true },
      { col: 23, row: 22, key: PROP.BANNER_RED, solid: false },
    ],
    flasks: [
      { col: 6, row: 12, key: PROP.FLASK_RED },
      { col: 24, row: 5, key: PROP.FLASK_BLUE },
    ],
    chests: [
      { col: 5, row: 11 },
      { col: 26, row: 5 },
      { col: 23, row: 16 },
    ],
    shrines: [
      { col: 20, row: 5, kind: 'blood' },
      { col: 26, row: 21, kind: 'chance' },
    ],
    altar: { col: 23, row: 19 },
    exit: { col: 40, row: 18 },
    enemies,
  };
}

/** Level 3: "Пылающие Недра" — Magma caverns with basalt rock and intense enemy pressure */
function buildMagmaLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  carveRect(binary, 3, 3, 12, 10); // Magma Entry Chamber
  carveRect(binary, 13, 7, 8, 3); // Basalt Bridge 1
  carveRect(binary, 19, 2, 14, 12); // Obsidian Hall
  carveRect(binary, 24, 13, 4, 6); // Molten Bridge 2
  carveRect(binary, 16, 17, 20, 9); // Core Sanctum
  carveRect(binary, 35, 19, 8, 4); // Exit tunnel

  const rand = prand(8888 + depth * 43);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_DUNGEON;
      return rand() < 0.6 ? TILE_INDEX.MAGMA_1 : TILE_INDEX.MAGMA_2;
    })
  );

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 10, row: 7, kind: 'imp' },
    { col: 16, row: 8, kind: 'imp' },
    { col: 23, row: 6, kind: 'imp' },
    { col: 28, row: 8, kind: 'skeleton' },
    { col: 25, row: 15, kind: 'imp' },
    { col: 20, row: 20, kind: 'imp' },
    { col: 27, row: 20, kind: 'imp' },
    { col: 30, row: 22, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 7, row: 7 },
    torches: [
      { col: 5, row: 2 },
      { col: 11, row: 2 },
      { col: 21, row: 1 },
      { col: 30, row: 1 },
      { col: 19, row: 16 },
      { col: 33, row: 16 },
      { col: 38, row: 18 },
    ],
    decorations: [
      { col: 6, row: 8, key: PROP.CRATE, solid: true },
      { col: 7, row: 8, key: PROP.BARREL, solid: true },
      { col: 22, row: 7, key: PROP.BARREL, solid: true },
      { col: 28, row: 7, key: PROP.CRATE, solid: true },
      { col: 22, row: 22, key: PROP.BARREL, solid: true },
    ],
    flasks: [{ col: 8, row: 8, key: PROP.FLASK_RED }],
    chests: [
      { col: 25, row: 6 },
      { col: 26, row: 21 },
    ],
    shrines: [
      { col: 28, row: 6, kind: 'blood' },
      { col: 21, row: 21, kind: 'chance' },
    ],
    altar: { col: 26, row: 20 },
    exit: { col: 40, row: 20 },
    enemies,
  };
}

export function buildLevel1(depth = 1): LevelData {
  const biome = getBiomeForDepth(depth);
  if (biome.id === 'ruins') {
    return buildOutdoorRuins(biome, depth);
  } else if (biome.id === 'catacombs') {
    return buildCatacombs(biome, depth);
  } else {
    return buildMagmaLevel(biome, depth);
  }
}
