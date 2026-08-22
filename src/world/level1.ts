// Imported from the Phaser-free data modules on purpose: level generation is
// pure logic, and keeping it out of the renderer's import graph is what lets
// it be unit-tested (see tests/level.test.ts).
import { TILE_INDEX } from '../gfx/tileIndex';
import { PROP } from '../gfx/propKeys';
import type { PropKey } from '../gfx/propKeys';
import { TEXTURE } from '../gfx/registry';
import type { EnemyKind } from '../entities/Enemy';
import { prand } from '../gfx/shapes';
import { BiomeConfig, getBiomeForDepth } from './biomes';

export const LEGACY_COLS = 60;
export const LEGACY_ROWS = 38;
export const COLS = LEGACY_COLS;
export const ROWS = LEGACY_ROWS;
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
  cols: number;
  rows: number;
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
const WATER_DEEP = 5;
const SNOW = 8;
const ICE = 9;
const CANYON_DIRT = 10;
const RAIL = 11;
const GRATE = 12;
const BRIDGE_TOP = 7;
const BRIDGE_BOT = 8;

function carveRect(grid: number[][], x0: number, y0: number, w: number, h: number, type = FLOOR): void {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (y < 0 || y >= rows || x < 0 || x >= cols) continue;
      grid[y][x] = type;
    }
  }
}

function carveRoadH(grid: number[][], x0: number, x1: number, yMid: number, width = 3, type = PATH): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const half = Math.floor(width / 2);
  for (let x = minX; x <= maxX; x++) {
    for (let dy = -half; dy <= half; dy++) {
      const y = yMid + dy;
      if (y >= 0 && y < rows && x >= 0 && x < cols) {
        const current = grid[y][x];
        if (current !== BRIDGE_TOP && current !== BRIDGE_BOT && current !== WATER_DEEP && current !== RUIN_FLOOR) {
          grid[y][x] = type;
        }
      }
    }
  }
}

function carveRoadV(grid: number[][], xMid: number, y0: number, y1: number, width = 3, type = PATH): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const half = Math.floor(width / 2);
  for (let y = minY; y <= maxY; y++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = xMid + dx;
      if (y >= 0 && y < rows && x >= 0 && x < cols) {
        const current = grid[y][x];
        if (current !== BRIDGE_TOP && current !== BRIDGE_BOT && current !== WATER_DEEP && current !== RUIN_FLOOR) {
          grid[y][x] = type;
        }
      }
    }
  }
}

// =========================================================================
// LEVEL 1: «Темный Лес» (Massive Primeval Forest, Winding River, Campsite & Ancient Altar)
// =========================================================================
function buildDarkForestLevel(biome: BiomeConfig, depth: number): LevelData {
  const COLS = 140;
  const ROWS = 90;
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(FLOOR));

  // 1. Organic outer mountain/forest boundary (multi-layered rugged rocks)
  for (let c = 0; c < COLS; c++) {
    const topDepth = Math.round(3 + 1.6 * Math.sin(c * 0.11) + 0.9 * Math.cos(c * 0.23));
    for (let r = 0; r <= topDepth; r++) binary[r][c] = WALL;

    const botDepth = Math.round(3 + 1.6 * Math.cos(c * 0.09) + 0.9 * Math.sin(c * 0.21));
    for (let r = ROWS - 1 - botDepth; r < ROWS; r++) binary[r][c] = WALL;
  }

  for (let r = 0; r < ROWS; r++) {
    const leftDepth = Math.round(3 + 1.6 * Math.sin(r * 0.13) + 0.9 * Math.cos(r * 0.27));
    for (let c = 0; c <= leftDepth; c++) binary[r][c] = WALL;

    const rightDepth = Math.round(3 + 1.6 * Math.cos(r * 0.11) + 0.9 * Math.sin(r * 0.24));
    for (let c = COLS - 1 - rightDepth; c < COLS; c++) binary[r][c] = WALL;
  }

  // 2. Internal mountain ridges (forming natural corridors & separating zones)
  // Ridge 1: Separates Spawn and Hamlet (cols 28..32, rows 4..24)
  carveRect(binary, 28, 4, 5, 21, WALL);
  // Ridge 2: Central rocky plateau dividing West valley & River (cols 48..53, rows 38..58)
  carveRect(binary, 48, 38, 6, 21, WALL);
  // Ridge 3: Encapsulating Necropolis (cols 8..15, rows 46..78 & cols 16..44, rows 78..84)
  carveRect(binary, 8, 46, 8, 33, WALL);
  carveRect(binary, 16, 78, 29, 7, WALL);
  // Ridge 4: Northeast buffer (cols 82..88, rows 6..28)
  carveRect(binary, 82, 6, 7, 23, WALL);
  // Ridge 5: Divide between Stronghold and Altar Grove (cols 98..105, rows 50..60)
  carveRect(binary, 98, 50, 8, 11, WALL);

  // 3. Meandering forest river & central secret island (cols 65..77, rows 43..53)
  for (let r = 0; r < ROWS; r++) {
    let rc: number;
    if (r <= 15) rc = Math.round(62 - r * 0.4);
    else if (r <= 24) rc = 56; // North bridge straight section
    else if (r <= 40) rc = Math.round(56 + (r - 24) * 0.75);
    else if (r <= 55) rc = 71; // Split around island
    else if (r <= 68) rc = Math.round(71 + (r - 55) * 1.0);
    else if (r <= 76) rc = 85; // South bridge straight section
    else rc = Math.round(85 + (r - 76) * 0.7);

    if (r >= 41 && r <= 55) {
      // Split channels around island
      for (let c = 60; c <= 64; c++) binary[r][c] = WATER_DEEP;
      for (let c = 78; c <= 82; c++) binary[r][c] = WATER_DEEP;
    } else {
      for (let c = rc - 2; c <= rc + 2; c++) {
        if (c >= 2 && c < COLS - 2) binary[r][c] = WATER_DEEP;
      }
    }
  }

  // 4. Sturdy wooden bridges across the river (anchored on land on both sides)
  // North Bridge (rows 18-19, cols 52..60)
  for (let c = 52; c <= 60; c++) {
    binary[18][c] = BRIDGE_TOP;
    binary[19][c] = BRIDGE_BOT;
  }
  // West Island Bridge (rows 48-49, cols 58..66)
  for (let c = 58; c <= 66; c++) {
    binary[48][c] = BRIDGE_TOP;
    binary[49][c] = BRIDGE_BOT;
  }
  // East Island Bridge (rows 48-49, cols 76..84)
  for (let c = 76; c <= 84; c++) {
    binary[48][c] = BRIDGE_TOP;
    binary[49][c] = BRIDGE_BOT;
  }
  // South Bridge (rows 72-73, cols 80..90)
  for (let c = 80; c <= 90; c++) {
    binary[72][c] = BRIDGE_TOP;
    binary[73][c] = BRIDGE_BOT;
  }

  // 5. Zone clearings & POIs
  // Zone 1: Campsite (Spawn)
  carveRect(binary, 8, 14, 18, 15, FLOOR);
  carveRect(binary, 10, 16, 14, 11, PATH);

  // Zone 2: Lumberjack Hamlet
  carveRect(binary, 34, 10, 20, 20, FLOOR);
  carveRect(binary, 36, 12, 16, 16, PATH);

  // Zone 3: Secret Island
  carveRect(binary, 65, 43, 13, 11, FLOOR);
  carveRect(binary, 68, 45, 7, 7, PATH);

  // Zone 4: Undead Stronghold
  carveRect(binary, 94, 16, 30, 28, FLOOR);
  carveRect(binary, 98, 20, 22, 20, PATH);

  // Zone 5: Druidic Necropolis
  carveRect(binary, 18, 50, 28, 28, FLOOR);
  carveRect(binary, 22, 54, 20, 20, PATH);

  // Zone 6: Sacred Altar Grove & Exit
  carveRect(binary, 96, 56, 34, 28, FLOOR);
  carveRect(binary, 102, 62, 22, 16, PATH);

  // 6. 3-Tile Wide Road Network with Autotiling
  // Spawn -> Hamlet
  carveRoadH(binary, 14, 44, 20, 3);
  // Spawn -> Necropolis branch
  carveRoadV(binary, 20, 20, 60, 3);
  carveRoadH(binary, 20, 32, 60, 3);
  // Hamlet -> North Bridge
  carveRoadH(binary, 44, 52, 19, 3);
  // North Bridge -> Stronghold
  carveRoadH(binary, 60, 98, 19, 3);
  carveRoadV(binary, 98, 19, 28, 3);
  // Trail to Island (West)
  carveRoadV(binary, 46, 20, 48, 3);
  carveRoadH(binary, 46, 58, 48, 3);
  // Trail from Island (East) -> Stronghold/Altar
  carveRoadH(binary, 84, 94, 48, 3);
  carveRoadV(binary, 94, 48, 68, 3);
  // Stronghold -> Altar Grove
  carveRoadV(binary, 110, 38, 68, 3);
  // Necropolis -> South Bridge
  carveRoadH(binary, 32, 80, 72, 3);
  // South Bridge -> Altar Grove
  carveRoadH(binary, 90, 106, 72, 3);

  // 7. Autotiling Step
  const rand = prand(1001 + depth * 19);
  const data: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(TILE_INDEX.GRASS_1));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = binary[r][c];
      if (cell === WALL) {
        const isWall = (row: number, col: number) => {
          if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
          return binary[row][col] === WALL;
        };
        const tW = isWall(r - 1, c);
        const bW = isWall(r + 1, c);
        const lW = isWall(r, c - 1);
        const rW = isWall(r, c + 1);

        if (!tW && !lW) data[r][c] = TILE_INDEX.WALL_CORNER_TL;
        else if (!tW && !rW) data[r][c] = TILE_INDEX.WALL_CORNER_TR;
        else if (!bW && !lW) data[r][c] = TILE_INDEX.WALL_CORNER_BL;
        else if (!bW && !rW) data[r][c] = TILE_INDEX.WALL_CORNER_BR;
        else if (!lW) data[r][c] = TILE_INDEX.WALL_SIDE_L;
        else if (!rW) data[r][c] = TILE_INDEX.WALL_SIDE_R;
        else data[r][c] = TILE_INDEX.WALL_RUIN;
      } else if (cell === BRIDGE_TOP) {
        data[r][c] = TILE_INDEX.WOOD_BRIDGE;
      } else if (cell === BRIDGE_BOT) {
        data[r][c] = TILE_INDEX.WOOD_BRIDGE_BOT;
      } else if (cell === WATER_DEEP) {
        const isWaterCell = (row: number, col: number) => {
          if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
          const k = binary[row][col];
          return k === WATER_DEEP || k === BRIDGE_TOP || k === BRIDGE_BOT;
        };

        const top = isWaterCell(r - 1, c);
        const bottom = isWaterCell(r + 1, c);
        const left = isWaterCell(r, c - 1);
        const right = isWaterCell(r, c + 1);

        if (!left && !top) data[r][c] = TILE_INDEX.WATER_SHORE_TL;
        else if (!right && !top) data[r][c] = TILE_INDEX.WATER_SHORE_TR;
        else if (!left && !bottom) data[r][c] = TILE_INDEX.WATER_SHORE_BL;
        else if (!right && !bottom) data[r][c] = TILE_INDEX.WATER_SHORE_BR;
        else if (!left) data[r][c] = TILE_INDEX.WATER_SHORE_L;
        else if (!right) data[r][c] = TILE_INDEX.WATER_SHORE_R;
        else if (!top) data[r][c] = TILE_INDEX.WATER_SHORE_T;
        else if (!bottom) data[r][c] = TILE_INDEX.WATER_SHORE_B;
        else data[r][c] = TILE_INDEX.WATER_DEEP;
      } else if (cell === PATH) {
        const isGrassCell = (row: number, col: number) => {
          if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
          return binary[row][col] === FLOOR;
        };

        const topGrass = isGrassCell(r - 1, c);
        const bottomGrass = isGrassCell(r + 1, c);
        const leftGrass = isGrassCell(r, c - 1);
        const rightGrass = isGrassCell(r, c + 1);
        const tlGrass = isGrassCell(r - 1, c - 1);
        const trGrass = isGrassCell(r - 1, c + 1);
        const blGrass = isGrassCell(r + 1, c - 1);
        const brGrass = isGrassCell(r + 1, c + 1);

        if (topGrass && leftGrass) data[r][c] = TILE_INDEX.PATH_TL;
        else if (topGrass && rightGrass) data[r][c] = TILE_INDEX.PATH_TR;
        else if (bottomGrass && leftGrass) data[r][c] = TILE_INDEX.PATH_BL;
        else if (bottomGrass && rightGrass) data[r][c] = TILE_INDEX.PATH_BR;
        else if (topGrass) data[r][c] = TILE_INDEX.PATH_T;
        else if (bottomGrass) data[r][c] = TILE_INDEX.PATH_B;
        else if (leftGrass) data[r][c] = TILE_INDEX.PATH_L;
        else if (rightGrass) data[r][c] = TILE_INDEX.PATH_R;
        else if (tlGrass) data[r][c] = TILE_INDEX.PATH_INNER_TL;
        else if (trGrass) data[r][c] = TILE_INDEX.PATH_INNER_TR;
        else if (blGrass) data[r][c] = TILE_INDEX.PATH_INNER_BL;
        else if (brGrass) data[r][c] = TILE_INDEX.PATH_INNER_BR;
        else {
          const v = rand();
          data[r][c] = v < 0.6 ? TILE_INDEX.DIRT_1 : TILE_INDEX.DIRT_2;
        }
      } else {
        const v = rand();
        data[r][c] = v < 0.45 ? TILE_INDEX.GRASS_1 : v < 0.75 ? TILE_INDEX.GRASS_2 : TILE_INDEX.GRASS_3;
      }
    }
  }

  // 8. Forest Trees
  const trees: TreeObject[] = [
    // Campsite rim
    { col: 6, row: 12, kind: 'oak' }, { col: 12, row: 10, kind: 'pine' }, { col: 18, row: 10, kind: 'oak' },
    { col: 24, row: 12, kind: 'pine' }, { col: 6, row: 28, kind: 'pine' }, { col: 12, row: 30, kind: 'oak' },
    { col: 18, row: 30, kind: 'pine' }, { col: 24, row: 28, kind: 'oak' },
    // Hamlet rim
    { col: 34, row: 8, kind: 'pine' }, { col: 42, row: 8, kind: 'oak' }, { col: 50, row: 8, kind: 'pine' },
    { col: 54, row: 12, kind: 'oak' }, { col: 54, row: 28, kind: 'pine' }, { col: 34, row: 30, kind: 'oak' },
    { col: 42, row: 32, kind: 'pine' }, { col: 50, row: 32, kind: 'oak' },
    // Riverbank groves
    { col: 56, row: 12, kind: 'pine' }, { col: 56, row: 28, kind: 'oak' }, { col: 58, row: 42, kind: 'pine' },
    { col: 58, row: 52, kind: 'oak' }, { col: 64, row: 32, kind: 'pine' }, { col: 64, row: 62, kind: 'oak' },
    { col: 86, row: 12, kind: 'oak' }, { col: 86, row: 34, kind: 'pine' }, { col: 88, row: 52, kind: 'oak' },
    { col: 88, row: 62, kind: 'pine' },
    // Island trees
    { col: 68, row: 43, kind: 'oak' }, { col: 74, row: 43, kind: 'pine' },
    { col: 68, row: 53, kind: 'pine' }, { col: 74, row: 53, kind: 'oak' },
    // Stronghold buffer
    { col: 92, row: 14, kind: 'pine' }, { col: 92, row: 20, kind: 'oak' }, { col: 92, row: 36, kind: 'pine' },
    { col: 92, row: 44, kind: 'oak' }, { col: 124, row: 14, kind: 'pine' }, { col: 124, row: 38, kind: 'oak' },
    { col: 124, row: 46, kind: 'pine' },
    // Necropolis grove
    { col: 16, row: 48, kind: 'oak' }, { col: 24, row: 48, kind: 'pine' }, { col: 32, row: 48, kind: 'oak' },
    { col: 40, row: 48, kind: 'pine' }, { col: 46, row: 54, kind: 'oak' }, { col: 46, row: 64, kind: 'pine' },
    { col: 46, row: 74, kind: 'oak' }, { col: 16, row: 76, kind: 'pine' }, { col: 24, row: 80, kind: 'oak' },
    { col: 32, row: 80, kind: 'pine' }, { col: 40, row: 80, kind: 'oak' },
    // Altar sacred trees
    { col: 98, row: 54, kind: 'pine' }, { col: 106, row: 54, kind: 'oak' }, { col: 114, row: 54, kind: 'pine' },
    { col: 122, row: 54, kind: 'oak' }, { col: 126, row: 60, kind: 'pine' }, { col: 126, row: 74, kind: 'oak' },
    { col: 126, row: 80, kind: 'pine' }, { col: 98, row: 80, kind: 'oak' }, { col: 106, row: 82, kind: 'pine' },
    { col: 114, row: 82, kind: 'oak' }, { col: 122, row: 82, kind: 'pine' },
  ];

  // 9. Decorations & Props
  const decorations: DecorationObject[] = [
    // Zone 1: Campsite
    { col: 10, row: 24, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 12, row: 16, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 11, row: 18, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 16, row: 24, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 16, row: 16, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 12, row: 22, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 8, row: 18, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 8, row: 20, key: TEXTURE.PROP_FENCE, solid: true },
    // Zone 2: Hamlet
    { col: 38, row: 14, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 48, row: 14, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 42, row: 18, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 46, row: 22, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 40, row: 16, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 50, row: 16, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 44, row: 26, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 35, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 52, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    // Zone 3: River & Island
    { col: 55, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 57, row: 40, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 68, row: 45, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 74, row: 51, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 86, row: 65, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 54, row: 24, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 70, row: 45, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 88, row: 67, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 68, row: 50, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 74, row: 46, key: TEXTURE.PROP_LUPINE, solid: false },
    // Zone 4: Stronghold
    { col: 96, row: 22, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 96, row: 23, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 96, row: 33, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 96, row: 34, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 122, row: 22, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 122, row: 34, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 102, row: 24, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 102, row: 32, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 114, row: 22, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 114, row: 34, key: TEXTURE.PROP_CRATE, solid: true },
    // Zone 5: Necropolis
    { col: 22, row: 56, key: PROP.TOMBSTONE, solid: true },
    { col: 26, row: 56, key: PROP.TOMBSTONE, solid: true },
    { col: 30, row: 56, key: PROP.TOMBSTONE, solid: true },
    { col: 22, row: 62, key: PROP.TOMBSTONE, solid: true },
    { col: 26, row: 62, key: PROP.TOMBSTONE, solid: true },
    { col: 30, row: 62, key: PROP.TOMBSTONE, solid: true },
    { col: 36, row: 58, key: PROP.TOMBSTONE, solid: true },
    { col: 40, row: 58, key: PROP.TOMBSTONE, solid: true },
    { col: 36, row: 64, key: PROP.TOMBSTONE, solid: true },
    { col: 40, row: 64, key: PROP.TOMBSTONE, solid: true },
    { col: 20, row: 70, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: true },
    { col: 42, row: 70, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: true },
    { col: 28, row: 76, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: true },
    // Zone 6: Altar Grove
    { col: 104, row: 62, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 120, row: 76, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 106, row: 64, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 118, row: 64, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 106, row: 76, key: TEXTURE.PROP_LUPINE, solid: false },
  ];

  const bonfires = [
    { col: 14, row: 18 },
    { col: 44, row: 16 },
    { col: 106, row: 24 },
    { col: 114, row: 32 },
    { col: 118, row: 70 },
  ];

  const torches = [
    // Spawn
    { col: 22, row: 19 }, { col: 22, row: 21 },
    // Hamlet
    { col: 36, row: 19 }, { col: 44, row: 19 }, { col: 50, row: 19 },
    // North Bridge
    { col: 52, row: 17 }, { col: 60, row: 17 },
    // Island Bridges
    { col: 58, row: 47 }, { col: 66, row: 47 }, { col: 76, row: 47 }, { col: 84, row: 47 },
    // Necropolis
    { col: 22, row: 54 }, { col: 32, row: 54 }, { col: 32, row: 74 },
    // Stronghold
    { col: 96, row: 24 }, { col: 96, row: 32 }, { col: 106, row: 20 }, { col: 114, row: 20 },
    // South Bridge
    { col: 80, row: 71 }, { col: 90, row: 71 },
    // Altar Ritual Circle
    { col: 108, row: 66 }, { col: 116, row: 66 }, { col: 116, row: 74 }, { col: 108, row: 74 },
  ];

  const chests = [
    { col: 48, row: 24 },
    { col: 71, row: 48 },
    { col: 118, row: 24 },
    { col: 120, row: 64 },
  ];

  const shrines = [
    { col: 38, row: 24, kind: 'chance' as const },
    { col: 32, row: 66, kind: 'blood' as const },
  ];

  const flasks = [
    { col: 18, row: 18, key: PROP.FLASK_RED },
    { col: 56, row: 32, key: PROP.FLASK_BLUE },
    { col: 104, row: 66, key: PROP.FLASK_RED },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    // Zone 2: Hamlet (4)
    { col: 40, row: 12, kind: 'imp' },
    { col: 46, row: 12, kind: 'imp' },
    { col: 42, row: 22, kind: 'imp' },
    { col: 48, row: 22, kind: 'imp' },
    // Zone 3: River & Island (8)
    { col: 54, row: 19, kind: 'imp' },
    { col: 58, row: 19, kind: 'skeleton' },
    { col: 70, row: 46, kind: 'skeleton' },
    { col: 74, row: 50, kind: 'imp' },
    { col: 58, row: 36, kind: 'imp' },
    { col: 62, row: 56, kind: 'imp' },
    { col: 82, row: 73, kind: 'skeleton' },
    { col: 88, row: 73, kind: 'skeleton' },
    // Zone 4: Stronghold (12)
    { col: 98, row: 26, kind: 'skeleton' },
    { col: 98, row: 30, kind: 'skeleton' },
    { col: 104, row: 22, kind: 'imp' },
    { col: 104, row: 34, kind: 'imp' },
    { col: 108, row: 28, kind: 'skeleton' },
    { col: 112, row: 26, kind: 'skeleton' },
    { col: 112, row: 32, kind: 'imp' },
    { col: 116, row: 24, kind: 'imp' },
    { col: 116, row: 32, kind: 'skeleton' },
    { col: 120, row: 28, kind: 'imp' },
    { col: 118, row: 20, kind: 'skeleton' },
    { col: 122, row: 20, kind: 'skeleton' },
    // Zone 5: Necropolis (5)
    { col: 24, row: 58, kind: 'skeleton' },
    { col: 28, row: 64, kind: 'skeleton' },
    { col: 36, row: 62, kind: 'skeleton' },
    { col: 34, row: 72, kind: 'skeleton' },
    { col: 24, row: 74, kind: 'skeleton' },
    // Zone 6: Altar Grove (8)
    { col: 104, row: 68, kind: 'skeleton' },
    { col: 104, row: 72, kind: 'imp' },
    { col: 108, row: 62, kind: 'skeleton' },
    { col: 108, row: 78, kind: 'imp' },
    { col: 116, row: 62, kind: 'imp' },
    { col: 116, row: 78, kind: 'skeleton' },
    { col: 120, row: 68, kind: 'skeleton' },
    { col: 120, row: 72, kind: 'imp' },
  ];

  return {
    biome,
    cols: COLS,
    rows: ROWS,
    data,
    spawn: { col: 14, row: 20 },
    torches,
    bonfires,
    trees,
    decorations,
    flasks,
    chests,
    shrines,
    altar: { col: 112, row: 70 },
    exit: { col: 124, row: 70 },
    enemies,
  };
}

// =========================================================================
// LEVEL 2: «Руины» (Sunken Fortress, Overgrown Cobblestone, Chapel & Crypts)
// =========================================================================
function buildAncientRuinsLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(FLOOR));

  // Outer fortified boundary walls
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r <= 1 || r >= ROWS - 2 || c <= 1 || c >= COLS - 2) {
        binary[r][c] = WALL;
      }
    }
  }

  // Large Solid Cobblestone Courtyards & Ruined Chambers
  carveRect(binary, 4, 14, 14, 10, RUIN_FLOOR);
  carveRect(binary, 6, 4, 16, 9, RUIN_FLOOR);
  carveRect(binary, 6, 25, 16, 9, RUIN_FLOOR);
  carveRect(binary, 24, 10, 14, 18, RUIN_FLOOR);
  carveRect(binary, 40, 4, 16, 9, RUIN_FLOOR);
  carveRect(binary, 40, 25, 16, 9, RUIN_FLOOR);
  carveRect(binary, 44, 13, 13, 12, RUIN_FLOOR);

  // Paved Stone Avenues connecting the ruins
  carveRoadH(binary, 16, 24, 18, 4, RUIN_FLOOR);
  carveRoadH(binary, 36, 46, 18, 4, RUIN_FLOOR);
  carveRoadV(binary, 14, 11, 27, 4, RUIN_FLOOR);
  carveRoadV(binary, 48, 11, 27, 4, RUIN_FLOOR);

  // Ruined Partition Walls & Colonnades
  for (let c = 6; c <= 21; c++) binary[4][c] = WALL;
  for (let r = 4; r <= 12; r++) binary[r][6] = WALL;
  for (let r = 4; r <= 12; r++) binary[r][21] = WALL;
  binary[12][13] = RUIN_FLOOR;
  binary[12][14] = RUIN_FLOOR;

  for (let c = 6; c <= 21; c++) binary[33][c] = WALL;
  for (let r = 25; r <= 33; r++) binary[r][6] = WALL;
  for (let r = 25; r <= 33; r++) binary[r][21] = WALL;
  binary[25][13] = RUIN_FLOOR;
  binary[25][14] = RUIN_FLOOR;

  for (let c = 40; c <= 55; c++) binary[4][c] = WALL;
  for (let r = 4; r <= 12; r++) binary[r][40] = WALL;
  for (let r = 4; r <= 12; r++) binary[r][55] = WALL;
  binary[12][47] = RUIN_FLOOR;
  binary[12][48] = RUIN_FLOOR;

  for (let c = 40; c <= 55; c++) binary[33][c] = WALL;
  for (let r = 25; r <= 33; r++) binary[r][40] = WALL;
  for (let r = 25; r <= 33; r++) binary[r][55] = WALL;
  binary[25][47] = RUIN_FLOOR;
  binary[25][48] = RUIN_FLOOR;

  const rand = prand(2002 + depth * 23);
  const data: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(TILE_INDEX.GRASS_1));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = binary[r][c];
      if (cell === WALL) {
        if (r <= 1 && c <= 1) data[r][c] = TILE_INDEX.WALL_CORNER_TL;
        else if (r <= 1 && c >= COLS - 2) data[r][c] = TILE_INDEX.WALL_CORNER_TR;
        else if (r >= ROWS - 2 && c <= 1) data[r][c] = TILE_INDEX.WALL_CORNER_BL;
        else if (r >= ROWS - 2 && c >= COLS - 2) data[r][c] = TILE_INDEX.WALL_CORNER_BR;
        else if (c <= 1) data[r][c] = TILE_INDEX.WALL_SIDE_L;
        else if (c >= COLS - 2) data[r][c] = TILE_INDEX.WALL_SIDE_R;
        else data[r][c] = TILE_INDEX.WALL_RUIN;
      } else if (cell === RUIN_FLOOR) {
        const isNotCobble = (row: number, col: number) => {
          if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
          return binary[row][col] !== RUIN_FLOOR && binary[row][col] !== WALL;
        };
        const topNC = isNotCobble(r - 1, c);
        const botNC = isNotCobble(r + 1, c);
        const leftNC = isNotCobble(r, c - 1);
        const rightNC = isNotCobble(r, c + 1);
        const tlNC = isNotCobble(r - 1, c - 1);
        const trNC = isNotCobble(r - 1, c + 1);
        const blNC = isNotCobble(r + 1, c - 1);
        const brNC = isNotCobble(r + 1, c + 1);

        if (topNC && leftNC) data[r][c] = TILE_INDEX.COBBLE_TL;
        else if (topNC && rightNC) data[r][c] = TILE_INDEX.COBBLE_TR;
        else if (botNC && leftNC) data[r][c] = TILE_INDEX.COBBLE_BL;
        else if (botNC && rightNC) data[r][c] = TILE_INDEX.COBBLE_BR;
        else if (topNC) data[r][c] = TILE_INDEX.COBBLE_T;
        else if (botNC) data[r][c] = TILE_INDEX.COBBLE_B;
        else if (leftNC) data[r][c] = TILE_INDEX.COBBLE_L;
        else if (rightNC) data[r][c] = TILE_INDEX.COBBLE_R;
        else if (tlNC) data[r][c] = TILE_INDEX.COBBLE_INNER_TL;
        else if (trNC) data[r][c] = TILE_INDEX.COBBLE_INNER_TR;
        else if (blNC) data[r][c] = TILE_INDEX.COBBLE_INNER_BL;
        else if (brNC) data[r][c] = TILE_INDEX.COBBLE_INNER_BR;
        else data[r][c] = TILE_INDEX.RUIN_STONE;
      } else {
        const v = rand();
        data[r][c] = v < 0.5 ? TILE_INDEX.DIRT_1 : TILE_INDEX.GRASS_2;
      }
    }
  }

  const decorations: DecorationObject[] = [
    { col: 28, row: 13, key: TEXTURE.FOUNTAIN_BLUE, solid: true },
    { col: 34, row: 13, key: TEXTURE.FOUNTAIN_BLUE, solid: true },
    { col: 28, row: 23, key: TEXTURE.FOUNTAIN_RED, solid: true },
    { col: 34, row: 23, key: TEXTURE.FOUNTAIN_RED, solid: true },
    { col: 44, row: 5, key: PROP.BANNER_BLUE, solid: false },
    { col: 51, row: 5, key: PROP.BANNER_BLUE, solid: false },
    { col: 42, row: 27, key: PROP.TOMBSTONE, solid: true },
    { col: 45, row: 27, key: PROP.TOMBSTONE, solid: true },
    { col: 48, row: 27, key: PROP.TOMBSTONE, solid: true },
    { col: 52, row: 27, key: PROP.TOMBSTONE, solid: true },
    { col: 43, row: 30, key: PROP.TOMBSTONE, solid: true },
    { col: 47, row: 30, key: PROP.TOMBSTONE, solid: true },
    { col: 51, row: 30, key: PROP.TOMBSTONE, solid: true },
    { col: 10, row: 8, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 18, row: 8, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 10, row: 29, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 18, row: 29, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 31, row: 18, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 8, row: 16, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 8, row: 20, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 17, row: 16, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 17, row: 20, key: TEXTURE.PROP_BARREL, solid: true },
  ];

  const torches = [
    { col: 6, row: 13 }, { col: 21, row: 13 }, { col: 6, row: 24 }, { col: 21, row: 24 },
    { col: 24, row: 9 }, { col: 37, row: 9 }, { col: 24, row: 28 }, { col: 37, row: 28 },
    { col: 45, row: 12 }, { col: 55, row: 12 }, { col: 45, row: 25 }, { col: 55, row: 25 },
  ];

  const chests = [
    { col: 14, row: 6 }, { col: 14, row: 31 }, { col: 48, row: 6 }, { col: 54, row: 31 }, { col: 54, row: 19 },
  ];

  const shrines = [
    { col: 48, row: 8, kind: 'blood' as const },
    { col: 42, row: 29, kind: 'chance' as const },
  ];

  const flasks = [
    { col: 14, row: 18, key: PROP.FLASK_RED },
    { col: 31, row: 17, key: PROP.FLASK_BLUE },
    { col: 46, row: 18, key: PROP.FLASK_RED },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 11, row: 7, kind: 'skeleton' }, { col: 17, row: 7, kind: 'skeleton' },
    { col: 11, row: 28, kind: 'imp' }, { col: 17, row: 28, kind: 'imp' },
    { col: 26, row: 15, kind: 'skeleton' }, { col: 35, row: 15, kind: 'imp' },
    { col: 26, row: 21, kind: 'imp' }, { col: 35, row: 21, kind: 'skeleton' },
    { col: 44, row: 8, kind: 'skeleton' }, { col: 52, row: 8, kind: 'skeleton' },
    { col: 44, row: 29, kind: 'imp' }, { col: 50, row: 29, kind: 'skeleton' },
    { col: 47, row: 16, kind: 'imp' }, { col: 52, row: 16, kind: 'skeleton' },
    { col: 47, row: 22, kind: 'imp' }, { col: 52, row: 22, kind: 'skeleton' },
  ];

  return {
    biome,
    cols: LEGACY_COLS,
    rows: LEGACY_ROWS,
    data,
    spawn: { col: 7, row: 18 },
    torches, decorations, flasks, chests, shrines,
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

// =========================================================================
// LEVEL 3: «Катакомбы» (Prison Wards, Iron Bars, Blood Sluices, Spikes)
// =========================================================================
function buildPrisonCatacombsLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  carveRect(binary, 4, 16, 52, 6, FLOOR);
  carveRect(binary, 6, 4, 16, 11, FLOOR);
  carveRect(binary, 6, 23, 16, 11, FLOOR);
  carveRect(binary, 36, 4, 16, 11, FLOOR);
  carveRect(binary, 36, 23, 16, 11, FLOOR);
  carveRect(binary, 24, 13, 10, 12, FLOOR);
  for (let r = 17; r <= 21; r++) {
    for (let c = 27; c <= 31; c++) binary[r][c] = GRATE;
  }
  carveRect(binary, 48, 13, 9, 12, FLOOR);

  const rand = prand(3003 + depth * 29);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_DUNGEON;
      if (cell === GRATE) return TILE_INDEX.SEWER_GRATE_TILE;
      const v = rand();
      return v < 0.35 ? TILE_INDEX.DUNGEON_1 : v < 0.65 ? TILE_INDEX.DUNGEON_2 : v < 0.85 ? TILE_INDEX.DUNGEON_3 : TILE_INDEX.DUNGEON_4;
    })
  );

  const decorations: DecorationObject[] = [
    { col: 10, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 11, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 17, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 18, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 10, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 11, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 17, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 18, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 40, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 41, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 47, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 48, row: 8, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 40, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 41, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 47, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 48, row: 27, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 25, row: 13, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 33, row: 13, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 8, row: 4, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 45, row: 4, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 26, row: 15, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 32, row: 15, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 14, row: 17, key: TEXTURE.PROP_SPIKES, solid: false },
    { col: 15, row: 17, key: TEXTURE.PROP_SPIKES, solid: false },
    { col: 44, row: 17, key: TEXTURE.PROP_SPIKES, solid: false },
    { col: 45, row: 17, key: TEXTURE.PROP_SPIKES, solid: false },
    { col: 29, row: 20, key: TEXTURE.PROP_SPIKES, solid: false },
    { col: 28, row: 13, key: TEXTURE.FOUNTAIN_RED, solid: true },
    { col: 30, row: 13, key: TEXTURE.FOUNTAIN_RED, solid: true },
    { col: 28, row: 16, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 30, row: 22, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 14, row: 6, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 44, row: 30, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
  ];

  const torches = [
    { col: 5, row: 15 }, { col: 14, row: 15 }, { col: 24, row: 12 }, { col: 33, row: 12 },
    { col: 44, row: 15 }, { col: 55, row: 15 }, { col: 14, row: 3 }, { col: 14, row: 34 },
    { col: 44, row: 3 }, { col: 44, row: 34 },
  ];

  const chests = [
    { col: 8, row: 5 }, { col: 8, row: 31 }, { col: 50, row: 5 }, { col: 50, row: 31 }, { col: 54, row: 19 },
  ];

  const shrines = [
    { col: 29, row: 14, kind: 'blood' as const },
    { col: 29, row: 24, kind: 'chance' as const },
  ];

  const flasks = [
    { col: 14, row: 18, key: PROP.FLASK_RED },
    { col: 29, row: 19, key: PROP.FLASK_BLUE },
    { col: 44, row: 18, key: PROP.FLASK_RED },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 12, row: 6, kind: 'skeleton' }, { col: 18, row: 10, kind: 'imp' },
    { col: 12, row: 28, kind: 'skeleton' }, { col: 18, row: 25, kind: 'imp' },
    { col: 26, row: 18, kind: 'skeleton' }, { col: 32, row: 18, kind: 'skeleton' },
    { col: 29, row: 16, kind: 'imp' }, { col: 42, row: 6, kind: 'imp' },
    { col: 48, row: 10, kind: 'skeleton' }, { col: 42, row: 28, kind: 'skeleton' },
    { col: 48, row: 25, kind: 'imp' }, { col: 49, row: 16, kind: 'imp' },
    { col: 53, row: 16, kind: 'skeleton' }, { col: 49, row: 22, kind: 'imp' },
    { col: 53, row: 22, kind: 'skeleton' },
  ];

  return {
    biome,
    cols: LEGACY_COLS,
    rows: LEGACY_ROWS,
    data,
    spawn: { col: 7, row: 19 },
    torches, decorations, flasks, chests, shrines,
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

// =========================================================================
// LEVEL 4: «Глубины Катакомб» (Subterranean Mines, Rail Tracks, Mine Shafts)
// =========================================================================
function buildCatacombDepthsLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  carveRect(binary, 4, 14, 52, 10, CANYON_DIRT);
  carveRect(binary, 8, 4, 20, 9, CANYON_DIRT);
  carveRect(binary, 32, 4, 20, 9, CANYON_DIRT);
  carveRect(binary, 8, 25, 20, 9, CANYON_DIRT);
  carveRect(binary, 32, 25, 20, 9, CANYON_DIRT);

  for (let c = 6; c <= 54; c++) binary[19][c] = RAIL;
  for (let r = 8; r <= 19; r++) binary[r][18] = RAIL;
  for (let r = 19; r <= 30; r++) binary[r][42] = RAIL;

  const rand = prand(4004 + depth * 31);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_CANYON;
      if (cell === RAIL) return TILE_INDEX.RAIL_TRACK_TILE;
      const v = rand();
      return v < 0.55 ? TILE_INDEX.CANYON_DIRT_1 : TILE_INDEX.CANYON_DIRT_2;
    })
  );

  const decorations: DecorationObject[] = [
    { col: 12, row: 4, key: TEXTURE.PROP_MINE_SHAFT, solid: true, scale: 1.1 },
    { col: 44, row: 4, key: TEXTURE.PROP_MINE_SHAFT, solid: true, scale: 1.1 },
    { col: 12, row: 25, key: TEXTURE.PROP_MINE_SHAFT, solid: true, scale: 1.1 },
    { col: 10, row: 19, key: TEXTURE.PROP_MINECART, solid: true },
    { col: 30, row: 19, key: TEXTURE.PROP_MINECART, solid: true },
    { col: 18, row: 12, key: TEXTURE.PROP_MINECART, solid: true },
    { col: 42, row: 26, key: TEXTURE.PROP_MINECART, solid: true },
    { col: 22, row: 7, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: true },
    { col: 36, row: 7, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 22, row: 28, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 36, row: 28, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: true },
    { col: 20, row: 14, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 38, row: 14, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 6, row: 15, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 54, row: 15, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 26, row: 17, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 34, row: 21, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 14, row: 6, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 46, row: 6, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 14, row: 27, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 46, row: 27, key: TEXTURE.PROP_CRATE, solid: true },
  ];

  const torches = [
    { col: 6, row: 13 }, { col: 18, row: 3 }, { col: 42, row: 3 }, { col: 54, row: 13 },
    { col: 18, row: 34 }, { col: 42, row: 34 }, { col: 24, row: 13 }, { col: 36, row: 13 },
    { col: 24, row: 24 }, { col: 36, row: 24 },
  ];

  const chests = [
    { col: 15, row: 5 }, { col: 47, row: 5 }, { col: 15, row: 26 }, { col: 47, row: 26 }, { col: 54, row: 18 },
  ];

  const shrines = [
    { col: 25, row: 7, kind: 'chance' as const },
    { col: 35, row: 29, kind: 'blood' as const },
  ];

  const flasks = [
    { col: 14, row: 18, key: PROP.FLASK_RED },
    { col: 28, row: 18, key: PROP.FLASK_BLUE },
    { col: 45, row: 18, key: PROP.FLASK_RED },
  ];

  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 14, row: 19, kind: 'imp' }, { col: 24, row: 19, kind: 'skeleton' },
    { col: 36, row: 19, kind: 'imp' }, { col: 16, row: 8, kind: 'skeleton' },
    { col: 38, row: 8, kind: 'skeleton' }, { col: 44, row: 8, kind: 'imp' },
    { col: 16, row: 28, kind: 'imp' }, { col: 38, row: 28, kind: 'skeleton' },
    { col: 44, row: 28, kind: 'imp' }, { col: 48, row: 16, kind: 'skeleton' },
    { col: 52, row: 16, kind: 'imp' }, { col: 48, row: 22, kind: 'skeleton' },
    { col: 52, row: 22, kind: 'imp' },
  ];

  return {
    biome,
    cols: LEGACY_COLS,
    rows: LEGACY_ROWS,
    data,
    spawn: { col: 7, row: 18 },
    torches, decorations, flasks, chests, shrines,
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

// =========================================================================
// LEVEL 5: «Бездна» (Glacial Rift, Black Ice Lakes, Astral Obelisks)
// =========================================================================
function buildAstralAbyssLevel(biome: BiomeConfig, depth: number): LevelData {
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  carveRect(binary, 4, 14, 52, 10, SNOW);
  carveRect(binary, 8, 4, 16, 9, SNOW);
  carveRect(binary, 36, 4, 16, 9, SNOW);
  carveRect(binary, 8, 25, 16, 9, SNOW);
  carveRect(binary, 36, 25, 16, 9, SNOW);
  carveRect(binary, 46, 11, 10, 16, SNOW);
  carveRect(binary, 12, 6, 8, 5, ICE);
  carveRect(binary, 40, 6, 8, 5, ICE);
  carveRect(binary, 12, 27, 8, 5, ICE);
  carveRect(binary, 40, 27, 8, 5, ICE);

  const rand = prand(5005 + depth * 37);
  const data = binary.map((row) =>
    row.map((cell) => {
      if (cell === WALL) return TILE_INDEX.WALL_GLACIAL;
      if (cell === ICE) return TILE_INDEX.ICE_LAKE;
      const v = rand();
      return v < 0.6 ? TILE_INDEX.SNOW_1 : TILE_INDEX.SNOW_2;
    })
  );

  const decorations: DecorationObject[] = [
    { col: 19, row: 5, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 19, row: 27, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 43, row: 5, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 43, row: 27, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 12, row: 18, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 13, row: 19, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 26, row: 17, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 27, row: 18, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 34, row: 18, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 35, row: 19, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 48, row: 12, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
    { col: 48, row: 25, key: TEXTURE.PROP_ICE_CRYSTAL, solid: true },
  ];

  const torches = [
    { col: 5, row: 13 }, { col: 15, row: 13 }, { col: 25, row: 13 }, { col: 35, row: 13 },
    { col: 46, row: 8 }, { col: 55, row: 8 }, { col: 46, row: 29 }, { col: 55, row: 29 },
  ];

  const chests = [
    { col: 10, row: 6 }, { col: 10, row: 29 }, { col: 50, row: 6 }, { col: 54, row: 19 },
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
    { col: 15, row: 18, kind: 'imp' }, { col: 22, row: 18, kind: 'skeleton' },
    { col: 30, row: 18, kind: 'imp' }, { col: 10, row: 10, kind: 'skeleton' },
    { col: 21, row: 10, kind: 'imp' }, { col: 10, row: 26, kind: 'skeleton' },
    { col: 21, row: 26, kind: 'imp' }, { col: 37, row: 10, kind: 'skeleton' },
    { col: 37, row: 26, kind: 'skeleton' }, { col: 49, row: 14, kind: 'skeleton' },
    { col: 53, row: 14, kind: 'imp' }, { col: 49, row: 24, kind: 'imp' },
    { col: 53, row: 24, kind: 'skeleton' },
  ];

  return {
    biome,
    cols: LEGACY_COLS,
    rows: LEGACY_ROWS,
    data,
    spawn: { col: 8, row: 19 },
    torches, decorations, flasks, chests, shrines,
    altar: { col: 51, row: 19 },
    exit: { col: 55, row: 19 },
    enemies,
  };
}

export function buildLevel1(depth = 1): LevelData {
  const biome = getBiomeForDepth(depth);
  if (biome.id === 'forest') {
    return buildDarkForestLevel(biome, depth);
  } else if (biome.id === 'ruins') {
    return buildAncientRuinsLevel(biome, depth);
  } else if (biome.id === 'catacombs') {
    return buildPrisonCatacombsLevel(biome, depth);
  } else if (biome.id === 'depths') {
    return buildCatacombDepthsLevel(biome, depth);
  } else {
    return buildAstralAbyssLevel(biome, depth);
  }
}
