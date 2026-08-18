import { TILE_INDEX } from '../gfx/tiles';
import { PROP, PropKey } from '../gfx/props';
import { EnemyKind } from '../entities/Enemy';
import { prand } from '../gfx/shapes';
import { BiomeConfig, getBiomeForDepth } from './biomes';

export const COLS = 60;
export const ROWS = 38;
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
    for (let dy = -Math.floor(width / 2); dy <= Math.floor(width / 2); dy++) {
      for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (py >= 2 && py < ROWS - 2 && px >= 2 && px < COLS - 2) {
          if (grid[py][px] === FLOOR) {
            grid[py][px] = PATH;
          }
        }
      }
    }
    if (Math.abs(x2 - cx) > Math.abs(y2 - cy)) {
      cx += cx < x2 ? 1 : -1;
    } else {
      cy += cy < y2 ? 1 : -1;
    }
  }
}

/** Level 1: "Забытые Руины" (Expanded 60x38 open forest, multi-wing clearings & ancient dais) */
function buildOutdoorRuins(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(FLOOR));

  // Dense impassable outer forest boundaries
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r <= 1 || r >= ROWS - 2 || c <= 1 || c >= COLS - 2) {
        binary[r][c] = WALL;
      }
    }
  }

  // Ancient Ruin Stone Platforms
  carveRect(binary, 36, 5, 10, 8, RUIN_FLOOR);  // North-East Chapel ruins
  carveRect(binary, 16, 26, 10, 8, RUIN_FLOOR); // South-West Graveyard ruins
  carveRect(binary, 38, 25, 9, 8, RUIN_FLOOR);  // South-East Outpost ruins
  carveRect(binary, 46, 13, 11, 12, RUIN_FLOOR); // East Altar Grand Dais

  // Winding Dirt Roads connecting all points of interest
  carvePath(binary, 8, 19, 20, 8, 2);   // Campsite -> Elder Grove
  carvePath(binary, 8, 19, 21, 30, 2);  // Campsite -> South-West Graveyard
  carvePath(binary, 8, 19, 51, 19, 2);  // Campsite -> Grand Dais Main Highway
  carvePath(binary, 20, 8, 41, 9, 2);   // Elder Grove -> Chapel
  carvePath(binary, 41, 9, 51, 19, 2);  // Chapel -> Grand Dais
  carvePath(binary, 21, 30, 42, 29, 2); // Graveyard -> South Outpost
  carvePath(binary, 42, 29, 51, 19, 2); // South Outpost -> Grand Dais

  // Ancient Ruin Stone Walls & Pillars
  // North Chapel Walls
  for (let c = 36; c <= 45; c++) binary[5][c] = WALL;
  binary[6][36] = WALL;
  binary[6][45] = WALL;
  binary[10][36] = WALL;
  binary[10][45] = WALL;
  binary[12][36] = WALL;
  binary[12][45] = WALL;

  // South-West Graveyard Walls
  for (let c = 16; c <= 25; c++) binary[33][c] = WALL;
  binary[27][16] = WALL;
  binary[27][25] = WALL;
  binary[30][16] = WALL;
  binary[30][25] = WALL;

  // South-East Outpost Walls
  for (let c = 38; c <= 46; c++) binary[32][c] = WALL;
  binary[26][38] = WALL;
  binary[26][46] = WALL;

  // East Dais Boundary Pillars
  binary[13][46] = WALL;
  binary[13][56] = WALL;
  binary[24][46] = WALL;
  binary[24][56] = WALL;

  const rand = prand(31415 + depth * 77);

  // 100% Solid, seamless tile mapping
  const data: number[][] = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_RUIN;
      if (cell === PATH) return rand() > 0.5 ? TILE_INDEX.DIRT_1 : TILE_INDEX.DIRT_2;
      if (cell === RUIN_FLOOR) return TILE_INDEX.RUIN_STONE;
      // Lush grass variants
      const g = rand();
      return g < 0.6 ? TILE_INDEX.GRASS_1 : g < 0.85 ? TILE_INDEX.GRASS_2 : TILE_INDEX.GRASS_3;
    })
  );

  // Atmospheric Pine & Oak Tree Groves
  const trees: TreeObject[] = [
    // West Forest Perimeter & Campsite Surrounds
    { col: 4, row: 5, kind: 'pine' },
    { col: 5, row: 9, kind: 'oak' },
    { col: 4, row: 13, kind: 'pine' },
    { col: 4, row: 24, kind: 'oak' },
    { col: 5, row: 29, kind: 'pine' },
    { col: 4, row: 33, kind: 'oak' },

    // Elder Grove (North-West)
    { col: 17, row: 6, kind: 'oak' },
    { col: 20, row: 5, kind: 'oak' },
    { col: 23, row: 7, kind: 'pine' },
    { col: 18, row: 11, kind: 'pine' },
    { col: 22, row: 12, kind: 'oak' },

    // Central Forest Dividers
    { col: 15, row: 18, kind: 'pine' },
    { col: 17, row: 20, kind: 'oak' },
    { col: 27, row: 14, kind: 'oak' },
    { col: 29, row: 16, kind: 'pine' },
    { col: 28, row: 22, kind: 'pine' },
    { col: 30, row: 24, kind: 'oak' },

    // North Forest Edge
    { col: 30, row: 4, kind: 'pine' },
    { col: 33, row: 5, kind: 'oak' },
    { col: 49, row: 5, kind: 'pine' },
    { col: 52, row: 7, kind: 'oak' },

    // South Forest Edge
    { col: 10, row: 34, kind: 'pine' },
    { col: 29, row: 34, kind: 'oak' },
    { col: 32, row: 33, kind: 'pine' },
    { col: 48, row: 33, kind: 'oak' },
    { col: 51, row: 31, kind: 'pine' },

    // East Edge Trees
    { col: 57, row: 9, kind: 'pine' },
    { col: 57, row: 15, kind: 'oak' },
    { col: 57, row: 23, kind: 'pine' },
    { col: 57, row: 29, kind: 'oak' },
  ];

  // Bonfires (Main Campsite + Hidden Hunter Camp)
  const bonfires = [
    { col: 8, row: 18 },
    { col: 20, row: 8 },
  ];

  // Warm Torches across clearings and ruins
  const torches = [
    { col: 37, row: 5 },
    { col: 44, row: 5 },
    { col: 37, row: 12 },
    { col: 44, row: 12 },
    { col: 17, row: 26 },
    { col: 24, row: 26 },
    { col: 39, row: 25 },
    { col: 45, row: 25 },
    { col: 47, row: 13 },
    { col: 55, row: 13 },
    { col: 47, row: 24 },
    { col: 55, row: 24 },
  ];

  // Destructible Props & Environment Decor
  const decorations = [
    // Campsite
    { col: 6, row: 17, key: PROP.CRATE, solid: true },
    { col: 6, row: 19, key: PROP.BARREL, solid: true },
    { col: 10, row: 17, key: PROP.BARREL, solid: true },
    { col: 10, row: 19, key: PROP.CRATE, solid: true },

    // Elder Grove
    { col: 19, row: 7, key: PROP.BARREL, solid: true },
    { col: 21, row: 7, key: PROP.CRATE, solid: true },

    // Chapel Ruins
    { col: 38, row: 7, key: PROP.BARREL, solid: true },
    { col: 43, row: 7, key: PROP.CRATE, solid: true },
    { col: 38, row: 11, key: PROP.BARREL, solid: true },
    { col: 43, row: 11, key: PROP.CRATE, solid: true },

    // Graveyard Ruins
    { col: 18, row: 28, key: PROP.TOMBSTONE, solid: true },
    { col: 20, row: 28, key: PROP.TOMBSTONE, solid: true },
    { col: 23, row: 28, key: PROP.CRATE, solid: true },
    { col: 18, row: 31, key: PROP.BARREL, solid: true },
    { col: 23, row: 31, key: PROP.TOMBSTONE, solid: true },

    // South Outpost
    { col: 40, row: 27, key: PROP.BARREL, solid: true },
    { col: 44, row: 27, key: PROP.CRATE, solid: true },
    { col: 40, row: 30, key: PROP.BARREL, solid: true },
    { col: 44, row: 30, key: PROP.CRATE, solid: true },

    // Grand Dais
    { col: 48, row: 15, key: PROP.BARREL, solid: true },
    { col: 54, row: 15, key: PROP.CRATE, solid: true },
    { col: 48, row: 22, key: PROP.BARREL, solid: true },
    { col: 54, row: 22, key: PROP.CRATE, solid: true },
  ];

  const flasks = [
    { col: 10, row: 18, key: PROP.FLASK_RED },
    { col: 22, row: 8, key: PROP.FLASK_RED },
    { col: 41, row: 6, key: PROP.FLASK_BLUE },
    { col: 21, row: 31, key: PROP.FLASK_RED },
  ];

  const chests = [
    { col: 7, row: 17 },
    { col: 21, row: 6 },
    { col: 41, row: 11 },
    { col: 23, row: 30 },
    { col: 43, row: 29 },
  ];

  const shrines: { col: number; row: number; kind: 'blood' | 'chance' }[] = [
    { col: 41, row: 8, kind: 'blood' },
    { col: 21, row: 29, kind: 'chance' },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    // Elder Grove Patrol
    { col: 18, row: 9, kind: 'imp' },
    { col: 22, row: 10, kind: 'imp' },

    // Central Crossroads
    { col: 28, row: 18, kind: 'imp' },
    { col: 30, row: 20, kind: 'skeleton' },

    // Chapel Guards
    { col: 38, row: 8, kind: 'skeleton' },
    { col: 43, row: 8, kind: 'skeleton' },
    { col: 40, row: 10, kind: 'imp' },

    // Graveyard Undead
    { col: 18, row: 29, kind: 'skeleton' },
    { col: 22, row: 29, kind: 'skeleton' },
    { col: 20, row: 32, kind: 'imp' },

    // South Outpost Squad
    { col: 41, row: 28, kind: 'imp' },
    { col: 44, row: 28, kind: 'imp' },
    { col: 42, row: 31, kind: 'skeleton' },

    // Grand Dais Sentinels
    { col: 49, row: 17, kind: 'imp' },
    { col: 53, row: 17, kind: 'skeleton' },
    { col: 49, row: 21, kind: 'imp' },
    { col: 53, row: 21, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 8, row: 19 },
    torches,
    bonfires,
    trees,
    decorations,
    flasks,
    chests,
    shrines,
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

/** Level 2: "Тёмные Катакомбы" (Expanded 60x38 multi-room ancient dungeon) */
function buildCatacombs(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  carveRect(binary, 3, 14, 12, 10); // Room 1: Entry Great Hall (x3-14, y14-23)
  carveRect(binary, 15, 17, 8, 4);  // Corridor 1->2
  carveRect(binary, 23, 8, 14, 12); // Room 2: Garrison & Shrines (x23-36, y8-19)
  carveRect(binary, 23, 22, 14, 12); // Room 3: Crypt of the Forgotten (x23-36, y22-33)
  carveRect(binary, 28, 19, 4, 4);  // Corridor 2->3
  carveRect(binary, 37, 12, 7, 4);  // Corridor 2->4
  carveRect(binary, 37, 26, 7, 4);  // Corridor 3->4
  carveRect(binary, 44, 10, 13, 18); // Room 4: Boss Grand Sanctum (x44-56, y10-27)

  const rand = prand(9999 + depth * 31);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_DUNGEON;
      const v = rand();
      return v < 0.3 ? TILE_INDEX.DUNGEON_1 : v < 0.6 ? TILE_INDEX.DUNGEON_2 : v < 0.85 ? TILE_INDEX.DUNGEON_3 : TILE_INDEX.DUNGEON_4;
    })
  );

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 10, row: 17, kind: 'imp' },
    { col: 18, row: 18, kind: 'imp' },
    { col: 26, row: 12, kind: 'skeleton' },
    { col: 33, row: 12, kind: 'imp' },
    { col: 26, row: 26, kind: 'skeleton' },
    { col: 33, row: 26, kind: 'skeleton' },
    { col: 30, row: 29, kind: 'imp' },
    { col: 40, row: 13, kind: 'imp' },
    { col: 40, row: 27, kind: 'imp' },
    { col: 48, row: 15, kind: 'skeleton' },
    { col: 52, row: 15, kind: 'skeleton' },
    { col: 48, row: 23, kind: 'imp' },
    { col: 52, row: 23, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 8, row: 18 },
    torches: [
      { col: 5, row: 13 },
      { col: 12, row: 13 },
      { col: 25, row: 7 },
      { col: 34, row: 7 },
      { col: 25, row: 21 },
      { col: 34, row: 21 },
      { col: 46, row: 9 },
      { col: 54, row: 9 },
      { col: 46, row: 27 },
      { col: 54, row: 27 },
    ],
    decorations: [
      { col: 5, row: 16, key: PROP.BARREL, solid: true },
      { col: 6, row: 16, key: PROP.CRATE, solid: true },
      { col: 25, row: 10, key: PROP.TOMBSTONE, solid: true },
      { col: 34, row: 10, key: PROP.BANNER_RED, solid: false },
      { col: 25, row: 24, key: PROP.TOMBSTONE, solid: true },
      { col: 34, row: 24, key: PROP.TOMBSTONE, solid: true },
      { col: 47, row: 13, key: PROP.BARREL, solid: true },
      { col: 53, row: 13, key: PROP.CRATE, solid: true },
      { col: 47, row: 24, key: PROP.BARREL, solid: true },
      { col: 53, row: 24, key: PROP.CRATE, solid: true },
    ],
    flasks: [
      { col: 6, row: 21, key: PROP.FLASK_RED },
      { col: 30, row: 10, key: PROP.FLASK_BLUE },
      { col: 30, row: 31, key: PROP.FLASK_RED },
    ],
    chests: [
      { col: 5, row: 21 },
      { col: 30, row: 9 },
      { col: 30, row: 32 },
    ],
    shrines: [
      { col: 30, row: 14, kind: 'blood' },
      { col: 30, row: 25, kind: 'chance' },
    ],
    altar: { col: 50, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

/** Level 3: "Пылающие Недра" (Expanded 60x38 molten cavern with lava bridges) */
function buildMagmaLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  carveRect(binary, 4, 14, 12, 11); // Magma Entry Chamber
  carveRect(binary, 16, 18, 8, 4);   // Molten Bridge 1
  carveRect(binary, 24, 6, 14, 13);  // Obsidian Vault North
  carveRect(binary, 24, 21, 14, 13); // Obsidian Vault South
  carveRect(binary, 30, 18, 3, 4);   // Central Chasm Bridge
  carveRect(binary, 38, 10, 8, 4);   // Bridge North->Core
  carveRect(binary, 38, 25, 8, 4);   // Bridge South->Core
  carveRect(binary, 45, 9, 12, 21);  // Inferno Core Sanctum

  const rand = prand(8888 + depth * 43);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_MAGMA;
      return rand() < 0.6 ? TILE_INDEX.MAGMA_1 : TILE_INDEX.MAGMA_2;
    })
  );

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 10, row: 18, kind: 'imp' },
    { col: 19, row: 19, kind: 'imp' },
    { col: 28, row: 10, kind: 'imp' },
    { col: 33, row: 10, kind: 'skeleton' },
    { col: 28, row: 27, kind: 'imp' },
    { col: 33, row: 27, kind: 'skeleton' },
    { col: 41, row: 11, kind: 'imp' },
    { col: 41, row: 26, kind: 'imp' },
    { col: 48, row: 14, kind: 'skeleton' },
    { col: 53, row: 14, kind: 'imp' },
    { col: 48, row: 24, kind: 'skeleton' },
    { col: 53, row: 24, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 8, row: 18 },
    torches: [
      { col: 6, row: 13 },
      { col: 13, row: 13 },
      { col: 26, row: 5 },
      { col: 35, row: 5 },
      { col: 26, row: 20 },
      { col: 35, row: 20 },
      { col: 47, row: 8 },
      { col: 54, row: 8 },
      { col: 47, row: 29 },
      { col: 54, row: 29 },
    ],
    decorations: [
      { col: 6, row: 17, key: PROP.CRATE, solid: true },
      { col: 7, row: 17, key: PROP.BARREL, solid: true },
      { col: 27, row: 9, key: PROP.BARREL, solid: true },
      { col: 33, row: 9, key: PROP.CRATE, solid: true },
      { col: 27, row: 26, key: PROP.BARREL, solid: true },
      { col: 33, row: 26, key: PROP.CRATE, solid: true },
    ],
    flasks: [
      { col: 8, row: 19, key: PROP.FLASK_RED },
      { col: 31, row: 10, key: PROP.FLASK_RED },
    ],
    chests: [
      { col: 31, row: 8 },
      { col: 31, row: 30 },
    ],
    shrines: [
      { col: 31, row: 12, kind: 'blood' },
      { col: 31, row: 24, kind: 'chance' },
    ],
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

/** Level 4: "Цитадель Бездны" (Expanded 60x38 floating astral platforms & cosmic amphitheater) */
function buildVoidCitadel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  // Astral Antechamber (West)
  carveRect(binary, 4, 13, 11, 12);

  // Western Astral Bridges
  carveRect(binary, 15, 17, 6, 4);  // West -> Central Hub
  carveRect(binary, 18, 9, 3, 9);   // Spoke to North Shrine
  carveRect(binary, 18, 20, 3, 9);  // Spoke to South Shrine

  // 4 Floating Astral Shrines
  carveRect(binary, 15, 5, 12, 10);  // North Astral Library
  carveRect(binary, 15, 23, 12, 10); // South Astral Crypt

  // Astral Cross Bridges
  carveRect(binary, 27, 8, 8, 4);   // North Bridge
  carveRect(binary, 27, 26, 8, 4);  // South Bridge
  carveRect(binary, 20, 15, 12, 8);  // Central Cosmic Nexus

  // Eastern Astral Spires
  carveRect(binary, 35, 5, 11, 10);  // North-East Spire
  carveRect(binary, 35, 23, 11, 10); // South-East Spire
  carveRect(binary, 31, 17, 10, 4);  // Nexus -> Throne Hallway

  // Grand Throne Arena of the Void
  carveRect(binary, 45, 8, 12, 22);  // Final Boss Arena

  const rand = prand(7777 + depth * 53);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_VOID;
      return rand() < 0.65 ? TILE_INDEX.VOID_1 : TILE_INDEX.VOID_2;
    })
  );

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 9, row: 16, kind: 'imp' },
    { col: 9, row: 21, kind: 'skeleton' },
    { col: 20, row: 9, kind: 'skeleton' },
    { col: 22, row: 11, kind: 'imp' },
    { col: 20, row: 27, kind: 'skeleton' },
    { col: 22, row: 29, kind: 'imp' },
    { col: 25, row: 19, kind: 'skeleton' },
    { col: 38, row: 9, kind: 'imp' },
    { col: 40, row: 11, kind: 'skeleton' },
    { col: 38, row: 27, kind: 'imp' },
    { col: 40, row: 29, kind: 'skeleton' },
    { col: 49, row: 13, kind: 'skeleton' },
    { col: 53, row: 13, kind: 'imp' },
    { col: 49, row: 24, kind: 'imp' },
    { col: 53, row: 24, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 8, row: 19 },
    torches: [
      { col: 5, row: 12 },
      { col: 13, row: 12 },
      { col: 17, row: 4 },
      { col: 25, row: 4 },
      { col: 17, row: 22 },
      { col: 25, row: 22 },
      { col: 37, row: 4 },
      { col: 44, row: 4 },
      { col: 37, row: 22 },
      { col: 44, row: 22 },
      { col: 47, row: 7 },
      { col: 55, row: 7 },
      { col: 47, row: 30 },
      { col: 55, row: 30 },
    ],
    decorations: [
      { col: 6, row: 15, key: PROP.TOMBSTONE, solid: true },
      { col: 12, row: 15, key: PROP.TOMBSTONE, solid: true },
      { col: 21, row: 7, key: PROP.BANNER_RED, solid: false },
      { col: 21, row: 25, key: PROP.BANNER_RED, solid: false },
      { col: 26, row: 19, key: PROP.TOMBSTONE, solid: true },
      { col: 39, row: 7, key: PROP.TOMBSTONE, solid: true },
      { col: 39, row: 25, key: PROP.TOMBSTONE, solid: true },
    ],
    flasks: [
      { col: 21, row: 10, key: PROP.FLASK_BLUE },
      { col: 21, row: 28, key: PROP.FLASK_RED },
      { col: 39, row: 10, key: PROP.FLASK_BLUE },
      { col: 39, row: 28, key: PROP.FLASK_RED },
    ],
    chests: [
      { col: 21, row: 8 },
      { col: 21, row: 30 },
      { col: 39, row: 8 },
      { col: 39, row: 30 },
    ],
    shrines: [
      { col: 25, row: 17, kind: 'blood' },
      { col: 25, row: 21, kind: 'chance' },
    ],
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

export function buildLevel1(depth = 1): LevelData {
  const biome = getBiomeForDepth(depth);
  if (biome.id === 'ruins') {
    return buildOutdoorRuins(biome, depth);
  } else if (biome.id === 'catacombs') {
    return buildCatacombs(biome, depth);
  } else if (biome.id === 'magma') {
    return buildMagmaLevel(biome, depth);
  } else {
    return buildVoidCitadel(biome, depth);
  }
}
