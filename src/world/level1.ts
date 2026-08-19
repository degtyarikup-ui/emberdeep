import { TILE_INDEX } from '../gfx/tiles';
import { PROP, PropKey } from '../gfx/props';
import { TEXTURE } from '../gfx/registry';
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

export interface DecorationObject {
  col: number;
  row: number;
  key: string;
  solid: boolean;
  scale?: number;
  offsetY?: number;
}

export interface LevelData {
  biome: BiomeConfig;
  data: number[][];
  spawn: { col: number; row: number };
  torches: { col: number; row: number }[];
  bonfires?: { col: number; row: number }[];
  trees?: TreeObject[];
  decorations: DecorationObject[];
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
const WATER_SHORE_L = 4;
const WATER_DEEP = 5;
const WATER_SHORE_R = 6;
const BRIDGE = 7;
const SNOW = 8;
const ICE = 9;
const CANYON_DIRT = 10;
const RAIL = 11;
const GRATE = 12;
// Corner bend tiles for smooth river curves
const SHORE_CORNER_LC = 13; // Left Convex  (shore_l top, water bot)
const SHORE_CORNER_LI = 14; // Left Concave (water top, shore_l bot)
const SHORE_CORNER_RC = 15; // Right Convex (shore_r top, water bot)
const SHORE_CORNER_RI = 16; // Right Concave(water top, shore_r bot)

function carveRect(grid: number[][], x0: number, y0: number, w: number, h: number, type = FLOOR): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
      grid[y][x] = type;
    }
  }
}

function carvePath(grid: number[][], x1: number, y1: number, x2: number, y2: number, width = 2, type = PATH): void {
  let cx = x1;
  let cy = y1;
  while (cx !== x2 || cy !== y2) {
    for (let dy = -Math.floor(width / 2); dy <= Math.floor(width / 2); dy++) {
      for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (py >= 2 && py < ROWS - 2 && px >= 2 && px < COLS - 2) {
          if (grid[py][px] === FLOOR || grid[py][px] === SNOW || grid[py][px] === CANYON_DIRT) {
            grid[py][px] = type;
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

// =========================================================================
// LEVEL 1: «Лесной Хутор и Руины» (Meandering River, Bridges, Hamlet, Ruins)
// =========================================================================
function buildForestHamletLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(FLOOR));

  // Dense outer forest boundary walls
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r <= 1 || r >= ROWS - 2 || c <= 1 || c >= COLS - 2) {
        binary[r][c] = WALL;
      }
    }
  }

  // Organic Meandering River with Genuine Pixel Crawler Shorelines + Corner Bend Tiles
  const riverCenters: number[] = Array.from({ length: ROWS }, (_, r) =>
    29 + Math.floor(Math.sin(r * 0.22) * 3)
  );

  for (let r = 0; r < ROWS; r++) {
    const riverCenter = riverCenters[r];
    const prevCenter = r > 0 ? riverCenters[r - 1] : riverCenter;
    const shiftNow = riverCenter - prevCenter; // +1 shifted right, -1 shifted left

    const leftC = riverCenter - 2;
    const rightC = riverCenter + 2;

    // Center Deep Water
    for (let w = -1; w <= 1; w++) {
      const c = riverCenter + w;
      if (c >= 2 && c < COLS - 2) binary[r][c] = WATER_DEEP;
    }

    // Left Shoreline - check if bending
    if (leftC >= 2 && leftC < COLS - 2) {
      if (shiftNow > 0) {
        // River shifted RIGHT: this column was water before, now is left bank
        binary[r][leftC] = SHORE_CORNER_LI; // Concave: water top, shore_l bottom
      } else if (shiftNow < 0) {
        // River shifted LEFT: this column was left bank, shifting to become water
        binary[r][leftC] = SHORE_CORNER_LC; // Convex: shore_l top, water bottom
      } else {
        binary[r][leftC] = WATER_SHORE_L;
      }
    }

    // Right Shoreline - check if bending
    if (rightC >= 2 && rightC < COLS - 2) {
      if (shiftNow > 0) {
        // River shifted RIGHT: right bank also moves right, this col becomes water
        binary[r][rightC] = SHORE_CORNER_RC; // Convex: shore_r top, water bottom
      } else if (shiftNow < 0) {
        // River shifted LEFT: right bank moves left, this col was water, now is shore
        binary[r][rightC] = SHORE_CORNER_RI; // Concave: water top, shore_r bottom
      } else {
        binary[r][rightC] = WATER_SHORE_R;
      }
    }

    // Fill exposed extra columns when river shifts (ensure no gaps)
    if (shiftNow > 0) {
      // River moved right: the old leftC-1 might still be WATER_DEEP, restore to FLOOR
      const oldLeft = leftC - 1;
      if (oldLeft >= 2 && oldLeft < COLS - 2 && binary[r][oldLeft] === WATER_DEEP) {
        binary[r][oldLeft] = FLOOR;
      }
    } else if (shiftNow < 0) {
      const oldRight = rightC + 1;
      if (oldRight >= 2 && oldRight < COLS - 2 && binary[r][oldRight] === WATER_DEEP) {
        binary[r][oldRight] = FLOOR;
      }
    }
  }

  // 2 Wooden bridges crossing the river
  // North Bridge (row 11..12)
  for (let r = 11; r <= 12; r++) {
    for (let c = 25; c <= 34; c++) {
      binary[r][c] = BRIDGE;
    }
  }
  // South Bridge (row 25..26)
  for (let r = 25; r <= 26; r++) {
    for (let c = 25; c <= 34; c++) {
      binary[r][c] = BRIDGE;
    }
  }

  // West Bank: Woodcutter's Hamlet Clearings
  carveRect(binary, 4, 14, 12, 10, FLOOR); // Village Green & Campfire
  carveRect(binary, 8, 5, 12, 8, FLOOR);   // North Cabin Glade
  carveRect(binary, 8, 25, 12, 8, FLOOR);  // South Orchard

  // East Bank: Ancient Sunken Chapel & Dais
  carveRect(binary, 36, 5, 12, 8, RUIN_FLOOR);   // North-East Chapel
  carveRect(binary, 36, 25, 12, 8, RUIN_FLOOR);  // South-East Graveyard
  carveRect(binary, 46, 12, 11, 14, RUIN_FLOOR); // Grand Altar Dais

  // Winding Dirt Roads connecting all wings
  carvePath(binary, 8, 19, 14, 9, 2);   // Campsite -> North Cabin
  carvePath(binary, 8, 19, 14, 29, 2);  // Campsite -> South Cabin
  carvePath(binary, 14, 9, 24, 11, 2);  // North Cabin -> North Bridge
  carvePath(binary, 14, 29, 25, 25, 2); // South Cabin -> South Bridge
  carvePath(binary, 34, 11, 42, 9, 2);  // North Bridge -> Chapel
  carvePath(binary, 35, 25, 42, 29, 2); // South Bridge -> Graveyard
  carvePath(binary, 42, 9, 51, 19, 2);  // Chapel -> Dais
  carvePath(binary, 42, 29, 51, 19, 2); // Graveyard -> Dais

  // Chapel Ruin Walls
  for (let c = 36; c <= 47; c++) binary[5][c] = WALL;
  for (let r = 5; r <= 12; r++) binary[r][36] = WALL;
  for (let r = 5; r <= 12; r++) binary[r][47] = WALL;
  binary[12][41] = RUIN_FLOOR;
  binary[12][42] = RUIN_FLOOR; // Entry gap

  // Convert binary to tile IDs
  const rand = prand(1111 + depth * 17);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_RUIN;
      if (cell === WATER_SHORE_L) return TILE_INDEX.WATER_SHORE_L;
      if (cell === WATER_DEEP) return TILE_INDEX.WATER_DEEP;
      if (cell === WATER_SHORE_R) return TILE_INDEX.WATER_SHORE_R;
      if (cell === SHORE_CORNER_LC) return TILE_INDEX.SHORE_CORNER_LC;
      if (cell === SHORE_CORNER_LI) return TILE_INDEX.SHORE_CORNER_LI;
      if (cell === SHORE_CORNER_RC) return TILE_INDEX.SHORE_CORNER_RC;
      if (cell === SHORE_CORNER_RI) return TILE_INDEX.SHORE_CORNER_RI;
      if (cell === BRIDGE) return TILE_INDEX.WOOD_BRIDGE;
      if (cell === RUIN_FLOOR) return TILE_INDEX.RUIN_STONE;
      if (cell === PATH) return rand() < 0.5 ? TILE_INDEX.DIRT_1 : TILE_INDEX.DIRT_2;
      const v = rand();
      return v < 0.45 ? TILE_INDEX.GRASS_1 : v < 0.75 ? TILE_INDEX.GRASS_2 : TILE_INDEX.GRASS_3;
    })
  );

  const trees: TreeObject[] = [
    // North Forest Grove
    { col: 4, row: 4, kind: 'oak' },
    { col: 7, row: 3, kind: 'pine' },
    { col: 18, row: 3, kind: 'oak' },
    { col: 22, row: 4, kind: 'pine' },
    { col: 25, row: 6, kind: 'pine' },
    { col: 34, row: 3, kind: 'oak' },
    { col: 50, row: 4, kind: 'pine' },
    { col: 54, row: 4, kind: 'oak' },
    // South Forest Grove
    { col: 4, row: 34, kind: 'oak' },
    { col: 7, row: 35, kind: 'pine' },
    { col: 18, row: 35, kind: 'pine' },
    { col: 22, row: 34, kind: 'oak' },
    { col: 26, row: 32, kind: 'pine' },
    { col: 34, row: 35, kind: 'oak' },
    { col: 50, row: 34, kind: 'pine' },
    { col: 54, row: 35, kind: 'oak' },
    // Clearing Accents
    { col: 6, row: 18, kind: 'oak' },
    { col: 16, row: 17, kind: 'pine' },
    { col: 38, row: 18, kind: 'pine' },
    { col: 45, row: 10, kind: 'oak' },
    { col: 45, row: 28, kind: 'pine' },
  ];

  const decorations: DecorationObject[] = [
    // Woodcutter's Cabins (64x64 large house)
    { col: 10, row: 7, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 10, row: 27, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    // Wooden Fences around gardens
    { col: 6, row: 9, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 7, row: 9, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 6, row: 29, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 7, row: 29, key: TEXTURE.PROP_FENCE, solid: true },
    // Outdoor Workbenches with tools
    { col: 14, row: 8, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 14, row: 28, key: TEXTURE.PROP_WORKBENCH, solid: true },
    // Campsite Crates & Barrels
    { col: 6, row: 16, key: PROP.CRATE, solid: true },
    { col: 7, row: 16, key: PROP.BARREL, solid: true },
    { col: 15, row: 19, key: PROP.CRATE, solid: true },
    // Chapel & Graveyard Tombstones
    { col: 38, row: 7, key: PROP.TOMBSTONE, solid: true },
    { col: 44, row: 7, key: PROP.TOMBSTONE, solid: true },
    { col: 38, row: 27, key: PROP.TOMBSTONE, solid: true },
    { col: 40, row: 29, key: PROP.TOMBSTONE, solid: true },
    { col: 44, row: 27, key: PROP.TOMBSTONE, solid: true },
    // Banners on Chapel
    { col: 39, row: 6, key: PROP.BANNER_BLUE, solid: false },
    { col: 43, row: 6, key: PROP.BANNER_BLUE, solid: false },
    // Rocks & Bushes
    { col: 24, row: 15, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 34, row: 20, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 16, row: 11, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 36, row: 11, key: TEXTURE.PROP_BUSH, solid: false },
  ];

  const bonfires = [
    { col: 10, row: 18 }, // West Village Campsite
    { col: 42, row: 19 }, // East Chapel Waystation
  ];

  const torches = [
    { col: 36, row: 5 },
    { col: 47, row: 5 },
    { col: 47, row: 12 },
    { col: 55, row: 12 },
    { col: 47, row: 26 },
    { col: 55, row: 26 },
  ];

  const chests = [
    { col: 8, row: 6 },   // Cabin attic loot
    { col: 8, row: 30 },  // South Cabin loot
    { col: 41, row: 8 },  // Chapel altar chest
    { col: 41, row: 29 }, // Graveyard crypt chest
    { col: 53, row: 19 }, // Boss reward chest
  ];

  const shrines = [
    { col: 41, row: 6, kind: 'blood' as const },
    { col: 41, row: 27, kind: 'chance' as const },
  ];

  const flasks = [
    { col: 14, row: 9, key: PROP.FLASK_RED },
    { col: 14, row: 29, key: PROP.FLASK_BLUE },
    { col: 48, row: 14, key: PROP.FLASK_RED },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    // West Shore Forest Patrol
    { col: 16, row: 10, kind: 'imp' },
    { col: 16, row: 26, kind: 'imp' },
    // Bridge Sentinels
    { col: 25, row: 11, kind: 'skeleton' },
    { col: 26, row: 25, kind: 'imp' },
    // Chapel Undead
    { col: 39, row: 9, kind: 'skeleton' },
    { col: 44, row: 9, kind: 'skeleton' },
    // Graveyard Skeletons
    { col: 39, row: 28, kind: 'skeleton' },
    { col: 44, row: 28, kind: 'imp' },
    // Grand Dais Guards
    { col: 48, row: 16, kind: 'imp' },
    { col: 53, row: 16, kind: 'skeleton' },
    { col: 48, row: 22, kind: 'imp' },
    { col: 53, row: 22, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 8, row: 18 },
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

// =========================================================================
// LEVEL 2: «Катакомбы Тюрьмы и Сток» (Cellblocks, Iron Bars, Blood Sluice)
// =========================================================================
function buildPrisonDungeonLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  // Central Guard Gallery Highway (West to East arterial)
  carveRect(binary, 4, 16, 52, 6, FLOOR);

  // 4 Modular Prison Cell Wards
  // North-West Ward (cols 6..22, rows 4..14)
  carveRect(binary, 6, 4, 16, 11, FLOOR);
  // South-West Ward (cols 6..22, rows 23..33)
  carveRect(binary, 6, 23, 16, 11, FLOOR);
  // North-East Ward (cols 36..52, rows 4..14)
  carveRect(binary, 36, 4, 16, 11, FLOOR);
  // South-East Ward (cols 36..52, rows 23..33)
  carveRect(binary, 36, 23, 16, 11, FLOOR);

  // Central Torture & Drainage Chamber (cols 24..34, rows 13..25)
  carveRect(binary, 24, 13, 10, 12, FLOOR);
  // Sewer Grate Drainage pit in center
  for (let r = 17; r <= 21; r++) {
    for (let c = 27; c <= 31; c++) {
      binary[r][c] = GRATE;
    }
  }

  // East Warden's Grand Sanctum (cols 48..56, rows 13..25)
  carveRect(binary, 48, 13, 9, 12, FLOOR);

  const rand = prand(2222 + depth * 23);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_DUNGEON;
      if (cell === GRATE) return TILE_INDEX.SEWER_GRATE_TILE;
      const v = rand();
      return v < 0.35 ? TILE_INDEX.DUNGEON_1 : v < 0.65 ? TILE_INDEX.DUNGEON_2 : v < 0.85 ? TILE_INDEX.DUNGEON_3 : TILE_INDEX.DUNGEON_4;
    })
  );

  const decorations: DecorationObject[] = [
    // Prison Iron Bars separating cells in NW Ward
    { col: 10, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 11, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 17, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 18, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    // Prison Iron Bars in SW Ward
    { col: 10, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 11, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 17, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 18, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    // Prison Iron Bars in NE Ward
    { col: 40, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 41, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 47, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 48, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    // Prison Iron Bars in SE Ward
    { col: 40, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 41, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 47, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 48, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    // Hanging Wall Chains in Central Chamber & Cells
    { col: 25, row: 13, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 33, row: 13, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 8, row: 4, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 45, row: 4, key: TEXTURE.PROP_CHAINS, solid: false },
    // Torture Benches
    { col: 26, row: 15, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 32, row: 15, key: TEXTURE.PROP_WORKBENCH, solid: true },
    // Blood Spills around drainage
    { col: 28, row: 16, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 30, row: 22, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 14, row: 6, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 44, row: 30, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    // Barrels and Crates
    { col: 6, row: 17, key: PROP.BARREL, solid: true },
    { col: 6, row: 18, key: PROP.CRATE, solid: true },
    { col: 25, row: 23, key: PROP.BARREL, solid: true },
    { col: 33, row: 23, key: PROP.BARREL, solid: true },
    { col: 50, row: 14, key: PROP.BANNER_RED, solid: false },
    { col: 54, row: 14, key: PROP.BANNER_RED, solid: false },
  ];

  const torches = [
    { col: 5, row: 15 },
    { col: 14, row: 15 },
    { col: 24, row: 12 },
    { col: 33, row: 12 },
    { col: 44, row: 15 },
    { col: 55, row: 15 },
    { col: 14, row: 3 },
    { col: 14, row: 34 },
    { col: 44, row: 3 },
    { col: 44, row: 34 },
  ];

  const chests = [
    { col: 8, row: 5 },   // NW Cell Secret Chest
    { col: 8, row: 31 },  // SW Cell Secret Chest
    { col: 50, row: 5 },  // NE Cell Secret Chest
    { col: 50, row: 31 }, // SE Cell Secret Chest
    { col: 54, row: 19 }, // Warden Boss Chest
  ];

  const shrines = [
    { col: 29, row: 14, kind: 'blood' as const },  // Torture Room Blood Shrine
    { col: 29, row: 24, kind: 'chance' as const }, // Sluice Chance Shrine
  ];

  const flasks = [
    { col: 14, row: 18, key: PROP.FLASK_RED },
    { col: 29, row: 19, key: PROP.FLASK_BLUE },
    { col: 44, row: 18, key: PROP.FLASK_RED },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    // NW Cell Guards
    { col: 12, row: 6, kind: 'skeleton' },
    { col: 18, row: 10, kind: 'imp' },
    // SW Cell Undead
    { col: 12, row: 28, kind: 'skeleton' },
    { col: 18, row: 25, kind: 'imp' },
    // Central Torture Squad
    { col: 26, row: 18, kind: 'skeleton' },
    { col: 32, row: 18, kind: 'skeleton' },
    { col: 29, row: 16, kind: 'imp' },
    // NE Ward Patrol
    { col: 42, row: 6, kind: 'imp' },
    { col: 48, row: 10, kind: 'skeleton' },
    // SE Ward Patrol
    { col: 42, row: 28, kind: 'skeleton' },
    { col: 48, row: 25, kind: 'imp' },
    // Grand Warden Sentinels
    { col: 49, row: 16, kind: 'imp' },
    { col: 53, row: 16, kind: 'skeleton' },
    { col: 49, row: 22, kind: 'imp' },
    { col: 53, row: 22, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 7, row: 19 },
    torches,
    decorations,
    flasks,
    chests,
    shrines,
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

// =========================================================================
// LEVEL 3: «Горный Каньон и Шахты» (Terraces, Rail Tracks, Mine Shafts, Lupines)
// =========================================================================
function buildCanyonMinesLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  // Canyon Plateau Main Arteries & Plateaus
  carveRect(binary, 4, 14, 52, 10, CANYON_DIRT); // Central Canyon Basin

  // Multi-tier Terraces (North Quarry & South Grotto)
  carveRect(binary, 12, 4, 18, 9, CANYON_DIRT);  // North High Quarry
  carveRect(binary, 12, 25, 18, 9, CANYON_DIRT); // South Crystal Grotto
  carveRect(binary, 34, 4, 18, 9, CANYON_DIRT);  // North-East Ore Depot
  carveRect(binary, 34, 25, 18, 9, CANYON_DIRT); // South-East Deep Shaft
  carveRect(binary, 46, 10, 11, 18, CANYON_DIRT); // Final Smelter Arena

  // Connecting Ramps / Chokepoints
  carvePath(binary, 20, 14, 20, 8, 3, CANYON_DIRT);
  carvePath(binary, 20, 24, 20, 30, 3, CANYON_DIRT);
  carvePath(binary, 42, 14, 42, 8, 3, CANYON_DIRT);
  carvePath(binary, 42, 24, 42, 30, 3, CANYON_DIRT);

  // Rail Track Network (along row 19 from col 5 to 48, with branches)
  for (let c = 5; c <= 48; c++) binary[19][c] = RAIL;
  for (let r = 7; r <= 19; r++) binary[r][21] = RAIL; // North Branch
  for (let r = 19; r <= 31; r++) binary[r][39] = RAIL; // South Branch

  const rand = prand(3333 + depth * 47);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_CANYON;
      if (cell === RAIL) return TILE_INDEX.RAIL_TRACK_TILE;
      return rand() < 0.6 ? TILE_INDEX.CANYON_DIRT_1 : TILE_INDEX.CANYON_DIRT_2;
    })
  );

  const decorations: DecorationObject[] = [
    // Mine Shaft Portals (Wooden timber entry arches)
    { col: 5, row: 18, key: TEXTURE.PROP_MINE_SHAFT, solid: true, scale: 1.1 },
    { col: 21, row: 4, key: TEXTURE.PROP_MINE_SHAFT, solid: true, scale: 1.1 },
    { col: 39, row: 33, key: TEXTURE.PROP_MINE_SHAFT, solid: true, scale: 1.1 },
    // Minecarts on tracks
    { col: 12, row: 19, key: TEXTURE.PROP_MINECART, solid: true },
    { col: 32, row: 19, key: TEXTURE.PROP_MINECART, solid: true },
    { col: 21, row: 10, key: TEXTURE.PROP_MINECART, solid: true },
    { col: 39, row: 26, key: TEXTURE.PROP_MINECART, solid: true },
    // Purple Mountain Lupines blooming along cliffs
    { col: 8, row: 14, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 15, row: 6, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 27, row: 6, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 15, row: 32, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 27, row: 32, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 36, row: 14, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 46, row: 12, key: TEXTURE.PROP_LUPINE, solid: false },
    // Giant Cliff Mushrooms
    { col: 10, row: 5, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: true },
    { col: 28, row: 26, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: true },
    { col: 48, row: 8, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: true },
    // Mining Crates and Boulders
    { col: 8, row: 17, key: PROP.CRATE, solid: true },
    { col: 9, row: 17, key: PROP.BARREL, solid: true },
    { col: 25, row: 8, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 25, row: 29, key: TEXTURE.PROP_ROCK, solid: true },
  ];

  const torches = [
    { col: 5, row: 13 },
    { col: 21, row: 3 },
    { col: 39, row: 32 },
    { col: 12, row: 13 },
    { col: 30, row: 13 },
    { col: 46, row: 9 },
    { col: 55, row: 9 },
    { col: 46, row: 28 },
    { col: 55, row: 28 },
  ];

  const chests = [
    { col: 23, row: 5 },  // High Quarry Loot
    { col: 37, row: 32 }, // Deep Grotto Loot
    { col: 47, row: 6 },  // Ore Depot Loot
    { col: 53, row: 19 }, // Smelter Boss Chest
  ];

  const shrines = [
    { col: 26, row: 16, kind: 'blood' as const },  // Blood Shrine at Canyon Depot
    { col: 34, row: 22, kind: 'chance' as const }, // Chance Shrine at Grotto
  ];

  const flasks = [
    { col: 14, row: 18, key: PROP.FLASK_RED },
    { col: 36, row: 18, key: PROP.FLASK_RED },
    { col: 21, row: 7, key: PROP.FLASK_BLUE },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    // Rail Patrol
    { col: 16, row: 18, kind: 'imp' },
    { col: 28, row: 18, kind: 'skeleton' },
    // High Quarry Miners
    { col: 16, row: 8, kind: 'skeleton' },
    { col: 24, row: 8, kind: 'imp' },
    // Deep Grotto Cave Squad
    { col: 16, row: 28, kind: 'imp' },
    { col: 24, row: 28, kind: 'skeleton' },
    // East Ore Depot Squad
    { col: 40, row: 8, kind: 'imp' },
    { col: 40, row: 28, kind: 'skeleton' },
    // Smelter Boss Sentinels
    { col: 48, row: 15, kind: 'skeleton' },
    { col: 53, row: 15, kind: 'imp' },
    { col: 48, row: 23, kind: 'skeleton' },
    { col: 53, row: 23, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 8, row: 18 },
    torches,
    decorations,
    flasks,
    chests,
    shrines,
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

// =========================================================================
// LEVEL 4: «Замерзший Астральный Пик» (Glacial Ice Lakes, Crystals, Obelisks)
// =========================================================================
function buildGlacialAbyssLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  // Glacial Snowfields Base
  carveRect(binary, 4, 14, 52, 10, SNOW);

  // 4 Floating Glacial Ice Plateaus
  carveRect(binary, 12, 4, 16, 9, SNOW);  // North-West Spire
  carveRect(binary, 12, 25, 16, 9, SNOW); // South-West Spire
  carveRect(binary, 36, 4, 16, 9, SNOW);  // North-East Spire
  carveRect(binary, 36, 25, 16, 9, SNOW); // South-East Spire
  carveRect(binary, 46, 9, 11, 20, SNOW); // Central Frozen Dais

  // Frozen Blue Ice Lakes inside plateaus
  for (let r = 6; r <= 9; r++) {
    for (let c = 15; c <= 23; c++) binary[r][c] = ICE;
  }
  for (let r = 27; r <= 30; r++) {
    for (let c = 39; c <= 47; c++) binary[r][c] = ICE;
  }

  // Connecting Chasm Bridges
  carvePath(binary, 20, 14, 20, 8, 3, SNOW);
  carvePath(binary, 20, 24, 20, 30, 3, SNOW);
  carvePath(binary, 44, 14, 44, 8, 3, SNOW);
  carvePath(binary, 44, 24, 44, 30, 3, SNOW);

  const rand = prand(4444 + depth * 59);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_GLACIAL;
      if (cell === ICE) return TILE_INDEX.ICE_LAKE;
      return rand() < 0.65 ? TILE_INDEX.SNOW_1 : TILE_INDEX.SNOW_2;
    })
  );

  const decorations: DecorationObject[] = [
    // 4 Floating Astral Void Obelisks empowering the Citadel
    { col: 19, row: 5, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 19, row: 27, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 43, row: 5, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 43, row: 27, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    // Glowing Blue Ice Crystals (tactical cover / labyrinths)
    { col: 12, row: 18, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 13, row: 19, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 26, row: 17, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 27, row: 18, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 34, row: 18, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 35, row: 19, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 48, row: 12, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 48, row: 25, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    // Snow-dusted Boulders
    { col: 8, row: 15, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 24, row: 8, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 37, row: 8, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 24, row: 30, key: TEXTURE.PROP_ROCK, solid: true },
  ];

  const torches = [
    { col: 5, row: 13 },
    { col: 13, row: 13 },
    { col: 27, row: 13 },
    { col: 35, row: 13 },
    { col: 46, row: 8 },
    { col: 55, row: 8 },
    { col: 46, row: 29 },
    { col: 55, row: 29 },
  ];

  const chests = [
    { col: 14, row: 6 },  // Ice Lake Hidden Chest
    { col: 14, row: 30 }, // South Spire Chest
    { col: 48, row: 6 },  // North Spire Chest
    { col: 54, row: 19 }, // Boss Finale Chest
  ];

  const shrines = [
    { col: 27, row: 15, kind: 'blood' as const },
    { col: 35, row: 23, kind: 'chance' as const },
  ];

  const flasks = [
    { col: 14, row: 18, key: PROP.FLASK_BLUE },
    { col: 30, row: 18, key: PROP.FLASK_RED },
    { col: 44, row: 18, key: PROP.FLASK_BLUE },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    // Crystal Maze Patrol
    { col: 15, row: 18, kind: 'imp' },
    { col: 22, row: 18, kind: 'skeleton' },
    { col: 30, row: 18, kind: 'imp' },
    // North Plateau Sentinels
    { col: 17, row: 8, kind: 'skeleton' },
    { col: 21, row: 8, kind: 'imp' },
    // South Plateau Sentinels
    { col: 17, row: 28, kind: 'skeleton' },
    { col: 21, row: 28, kind: 'imp' },
    // East Spire Squad
    { col: 41, row: 8, kind: 'skeleton' },
    { col: 41, row: 28, kind: 'skeleton' },
    // Void Citadel Final Sentinels
    { col: 49, row: 14, kind: 'skeleton' },
    { col: 53, row: 14, kind: 'imp' },
    { col: 49, row: 24, kind: 'imp' },
    { col: 53, row: 24, kind: 'skeleton' },
  ];

  return {
    biome,
    data,
    spawn: { col: 8, row: 19 },
    torches,
    decorations,
    flasks,
    chests,
    shrines,
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

export function buildLevel1(depth = 1): LevelData {
  const biome = getBiomeForDepth(depth);
  if (biome.id === 'ruins') {
    return buildForestHamletLevel(biome, depth);
  } else if (biome.id === 'catacombs') {
    return buildPrisonDungeonLevel(biome, depth);
  } else if (biome.id === 'magma') {
    return buildCanyonMinesLevel(biome, depth);
  } else {
    return buildGlacialAbyssLevel(biome, depth);
  }
}
