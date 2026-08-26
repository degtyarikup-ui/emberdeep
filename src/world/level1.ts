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
import { getBakedLevel1 } from './customLevelPreset';

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
  const COLS = 200;
  const ROWS = 80;
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(FLOOR));

  // 1. Outer mountain perimeter
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r < 3 || r >= ROWS - 3 || c < 3 || c >= COLS - 3) {
        binary[r][c] = WALL;
      }
    }
  }

  // Helper road carvers
  const carveRoadH = (b: number[][], c1: number, c2: number, r: number, halfW = 1) => {
    const left = Math.min(c1, c2);
    const right = Math.max(c1, c2);
    for (let c = left; c <= right; c++) {
      for (let dr = -halfW; dr <= halfW; dr++) {
        const nr = r + dr;
        if (nr >= 0 && nr < ROWS && c >= 0 && c < COLS) {
          if (b[nr][c] !== WATER_DEEP && b[nr][c] !== BRIDGE_TOP && b[nr][c] !== BRIDGE_BOT) {
            b[nr][c] = PATH;
          }
        }
      }
    }
  };

  const carveRoadV = (b: number[][], c: number, r1: number, r2: number, halfW = 1) => {
    const top = Math.min(r1, r2);
    const bot = Math.max(r1, r2);
    for (let r = top; r <= bot; r++) {
      for (let dc = -halfW; dc <= halfW; dc++) {
        const nc = c + dc;
        if (r >= 0 && r < ROWS && nc >= 0 && nc < COLS) {
          if (b[r][nc] !== WATER_DEEP && b[r][nc] !== BRIDGE_TOP && b[r][nc] !== BRIDGE_BOT) {
            b[r][nc] = PATH;
          }
        }
      }
    }
  };

  // 2. Natural Mountain Ridges & Architectural Stone Walls
  // Ridge 1: West Divide (Cols 44..48, rows 4..34 & rows 48..76)
  for (let r = 4; r <= 34; r++) {
    const rc = Math.round(46 + Math.sin(r * 0.2) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }
  for (let r = 48; r <= 76; r++) {
    const rc = Math.round(46 + Math.cos(r * 0.2) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }

  // Ridge 2: Necropolis East Wall (Cols 84..88, rows 4..28 & rows 54..76)
  for (let r = 4; r <= 28; r++) {
    const rc = Math.round(86 + Math.cos(r * 0.25) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }
  for (let r = 54; r <= 76; r++) {
    const rc = Math.round(86 + Math.sin(r * 0.25) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }

  // Mausoleum Stone Complex in Sector 2 (Cols 56..76, Rows 10..22)
  for (let c = 56; c <= 76; c++) {
    binary[10][c] = WALL;
    binary[22][c] = WALL;
  }
  for (let r = 10; r <= 22; r++) {
    binary[r][56] = WALL;
    binary[r][66] = WALL;
    binary[r][76] = WALL;
  }
  for (let r = 14; r <= 18; r++) binary[r][66] = PATH;
  for (let c = 64; c <= 68; c++) {
    binary[22][c] = PATH;
    binary[10][c] = PATH;
  }

  // Ridge 3: Eastern Mountains & Citadel Bastion Towers
  for (let r = 4; r <= 30; r++) {
    const rc = Math.round(166 + Math.sin(r * 0.2) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }
  for (let r = 52; r <= 76; r++) {
    const rc = Math.round(166 + Math.cos(r * 0.2) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }
  for (let r = 32; r <= 36; r++) {
    for (let c = 164; c <= 170; c++) binary[r][c] = WALL;
  }
  for (let r = 46; r <= 50; r++) {
    for (let c = 164; c <= 170; c++) binary[r][c] = WALL;
  }

  // 3. Meandering Forest River and Island of Mists (Cols 92..124)
  for (let r = 0; r < ROWS; r++) {
    if (r <= 24) {
      const rc = Math.round(98 - r * 0.15);
      for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WATER_DEEP;
    } else if (r <= 32) {
      const t = (r - 24) / 8.0;
      const wCenter = Math.round(94 + t * 14);
      const spread = Math.round(3 + t * 12);
      for (let c = wCenter - spread; c <= wCenter + spread; c++) binary[r][c] = WATER_DEEP;
    } else if (r <= 50) {
      for (let c = 92; c <= 99; c++) binary[r][c] = WATER_DEEP;
      for (let c = 118; c <= 125; c++) binary[r][c] = WATER_DEEP;
    } else if (r <= 58) {
      const t = (r - 50) / 8.0;
      const wCenter = Math.round(109 + t * 4);
      const spread = Math.round(15 - t * 12);
      for (let c = wCenter - spread; c <= wCenter + spread; c++) binary[r][c] = WATER_DEEP;
    } else {
      const rc = Math.round(113 + (r - 58) * 0.2);
      for (let c = rc - 3; c <= rc + 3; c++) {
        if (c < COLS - 4) binary[r][c] = WATER_DEEP;
      }
    }
  }

  // 4. Sturdy Bridges across River
  for (let c = 90; c <= 102; c++) {
    binary[16][c] = BRIDGE_TOP;
    binary[17][c] = BRIDGE_BOT;
  }
  for (let c = 91; c <= 101; c++) {
    binary[41][c] = BRIDGE_TOP;
    binary[42][c] = BRIDGE_BOT;
  }
  for (let c = 117; c <= 127; c++) {
    binary[41][c] = BRIDGE_TOP;
    binary[42][c] = BRIDGE_BOT;
  }
  for (let c = 108; c <= 120; c++) {
    binary[66][c] = BRIDGE_TOP;
    binary[67][c] = BRIDGE_BOT;
  }

  // 5. 11 Thematic Zone Clearings & POIs
  carveRoadH(binary, 10, 22, 20, 4);
  carveRoadV(binary, 14, 16, 26, 4);
  carveRoadH(binary, 24, 40, 14, 4);
  carveRoadV(binary, 32, 8, 22, 4);
  carveRoadH(binary, 14, 38, 60, 5);
  carveRoadV(binary, 24, 48, 70, 5);
  carveRoadH(binary, 38, 54, 41, 4);

  carveRoadH(binary, 58, 74, 16, 3);
  carveRoadV(binary, 66, 11, 21, 2);

  carveRoadH(binary, 54, 80, 62, 5);
  carveRoadV(binary, 66, 50, 72, 5);

  carveRoadH(binary, 101, 117, 41, 4);
  carveRoadV(binary, 110, 34, 48, 4);

  carveRoadH(binary, 132, 160, 16, 5);
  carveRoadV(binary, 146, 8, 28, 5);

  carveRoadH(binary, 132, 160, 60, 5);
  carveRoadV(binary, 146, 50, 70, 5);

  carveRoadH(binary, 158, 174, 41, 4);
  carveRoadV(binary, 166, 36, 46, 3);

  for (let r = 30; r <= 52; r++) {
    for (let c = 173; c <= 195; c++) {
      const distSq = (c - 184) * (c - 184) + (r - 41) * (r - 41);
      if (distSq <= 100) {
        binary[r][c] = PATH;
      }
    }
  }
  carveRoadH(binary, 172, 184, 41, 3);
  carveRoadH(binary, 184, 196, 41, 2);

  // 6. Road Network
  carveRoadH(binary, 14, 32, 20, 2);
  carveRoadV(binary, 32, 14, 20, 2);
  carveRoadV(binary, 24, 20, 60, 2);
  carveRoadH(binary, 24, 42, 41, 2);
  carveRoadH(binary, 42, 66, 41, 2);
  carveRoadV(binary, 66, 22, 62, 2);
  carveRoadH(binary, 66, 92, 16, 2);
  carveRoadH(binary, 66, 92, 41, 2);
  carveRoadH(binary, 66, 110, 62, 2);
  carveRoadV(binary, 110, 62, 66, 2);
  carveRoadH(binary, 102, 134, 16, 2);
  carveRoadH(binary, 117, 134, 41, 2);
  carveRoadH(binary, 110, 134, 66, 2);
  carveRoadV(binary, 134, 16, 66, 2);
  carveRoadH(binary, 134, 146, 16, 2);
  carveRoadH(binary, 134, 146, 60, 2);
  carveRoadH(binary, 146, 166, 41, 2);

  // 7. Autotiling
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

        if (!tW && !lW) data[r][c] = TILE_INDEX.CLIFF_TOP_TL;
        else if (!tW && !rW) data[r][c] = TILE_INDEX.CLIFF_TOP_TR;
        else if (!bW && !lW) data[r][c] = TILE_INDEX.CLIFF_BOT_BL;
        else if (!bW && !rW) data[r][c] = TILE_INDEX.CLIFF_BOT_BR;
        else if (!tW) data[r][c] = TILE_INDEX.CLIFF_TOP_TM;
        else if (!bW) data[r][c] = TILE_INDEX.CLIFF_BOT_BM;
        else if (!lW) data[r][c] = TILE_INDEX.CLIFF_MID_L;
        else if (!rW) data[r][c] = TILE_INDEX.CLIFF_MID_R;
        else {
          data[r][c] = TILE_INDEX.CLIFF_MID_M;
        }
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
        const tl = isWaterCell(r - 1, c - 1);
        const tr = isWaterCell(r - 1, c + 1);
        const bl = isWaterCell(r + 1, c - 1);
        const br = isWaterCell(r + 1, c + 1);

        if (!left && !top) data[r][c] = TILE_INDEX.WATER_SHORE_TL;
        else if (!right && !top) data[r][c] = TILE_INDEX.WATER_SHORE_TR;
        else if (!left && !bottom) data[r][c] = TILE_INDEX.WATER_SHORE_BL;
        else if (!right && !bottom) data[r][c] = TILE_INDEX.WATER_SHORE_BR;
        else if (!left) data[r][c] = TILE_INDEX.WATER_SHORE_L;
        else if (!right) data[r][c] = TILE_INDEX.WATER_SHORE_R;
        else if (!top) data[r][c] = TILE_INDEX.WATER_SHORE_T;
        else if (!bottom) data[r][c] = TILE_INDEX.WATER_SHORE_B;
        else if (top && left && !tl) data[r][c] = TILE_INDEX.WATER_INNER_TL;
        else if (top && right && !tr) data[r][c] = TILE_INDEX.WATER_INNER_TR;
        else if (bottom && left && !bl) data[r][c] = TILE_INDEX.WATER_INNER_BL;
        else if (bottom && right && !br) data[r][c] = TILE_INDEX.WATER_INNER_BR;
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

        if (topGrass && leftGrass) data[r][c] = TILE_INDEX.PATH_TL;
        else if (topGrass && rightGrass) data[r][c] = TILE_INDEX.PATH_TR;
        else if (bottomGrass && leftGrass) data[r][c] = TILE_INDEX.PATH_BL;
        else if (bottomGrass && rightGrass) data[r][c] = TILE_INDEX.PATH_BR;
        else if (topGrass) data[r][c] = TILE_INDEX.PATH_T;
        else if (bottomGrass) data[r][c] = TILE_INDEX.PATH_B;
        else if (leftGrass) data[r][c] = TILE_INDEX.PATH_L;
        else if (rightGrass) data[r][c] = TILE_INDEX.PATH_R;
        else {
          const v = rand();
          data[r][c] = v < 0.7 ? TILE_INDEX.DIRT_1 : TILE_INDEX.DIRT_2;
        }
      } else {
        const v = rand();
        data[r][c] = v < 0.65 ? TILE_INDEX.GRASS_1 : v < 0.88 ? TILE_INDEX.GRASS_2 : TILE_INDEX.GRASS_3;
      }
    }
  }

  // 8. Dense Primeval Forest Trees (Clean organic canopy framing POIs)
  const trees: { col: number; row: number; kind: 'pine' | 'oak' }[] = [
    { col: 4, row: 4, kind: 'oak' },
    { col: 4, row: 7, kind: 'oak' },
    { col: 4, row: 10, kind: 'oak' },
    { col: 4, row: 13, kind: 'oak' },
    { col: 4, row: 16, kind: 'oak' },
    { col: 4, row: 19, kind: 'oak' },
    { col: 4, row: 22, kind: 'oak' },
    { col: 4, row: 25, kind: 'oak' },
    { col: 4, row: 28, kind: 'oak' },
    { col: 4, row: 31, kind: 'oak' },
    { col: 4, row: 34, kind: 'oak' },
    { col: 4, row: 37, kind: 'oak' },
    { col: 4, row: 40, kind: 'oak' },
    { col: 4, row: 43, kind: 'oak' },
    { col: 4, row: 46, kind: 'oak' },
    { col: 4, row: 49, kind: 'oak' },
    { col: 4, row: 52, kind: 'oak' },
    { col: 4, row: 55, kind: 'oak' },
    { col: 4, row: 58, kind: 'oak' },
    { col: 4, row: 61, kind: 'oak' },
    { col: 4, row: 64, kind: 'oak' },
    { col: 4, row: 67, kind: 'oak' },
    { col: 4, row: 70, kind: 'oak' },
    { col: 4, row: 73, kind: 'oak' },
    { col: 4, row: 76, kind: 'oak' },
    { col: 7, row: 4, kind: 'oak' },
    { col: 7, row: 7, kind: 'oak' },
    { col: 7, row: 10, kind: 'oak' },
    { col: 7, row: 13, kind: 'oak' },
    { col: 7, row: 16, kind: 'oak' },
    { col: 7, row: 19, kind: 'oak' },
    { col: 7, row: 22, kind: 'oak' },
    { col: 7, row: 25, kind: 'oak' },
    { col: 7, row: 28, kind: 'oak' },
    { col: 7, row: 31, kind: 'oak' },
    { col: 7, row: 34, kind: 'oak' },
    { col: 7, row: 37, kind: 'oak' },
    { col: 7, row: 40, kind: 'oak' },
    { col: 7, row: 43, kind: 'oak' },
    { col: 7, row: 46, kind: 'oak' },
    { col: 7, row: 49, kind: 'oak' },
    { col: 7, row: 52, kind: 'oak' },
    { col: 7, row: 55, kind: 'oak' },
    { col: 7, row: 58, kind: 'oak' },
    { col: 7, row: 61, kind: 'oak' },
    { col: 7, row: 64, kind: 'oak' },
    { col: 7, row: 67, kind: 'oak' },
    { col: 7, row: 70, kind: 'oak' },
    { col: 7, row: 73, kind: 'oak' },
    { col: 7, row: 76, kind: 'oak' },
    { col: 10, row: 4, kind: 'oak' },
    { col: 10, row: 7, kind: 'oak' },
    { col: 10, row: 10, kind: 'oak' },
    { col: 10, row: 13, kind: 'oak' },
    { col: 10, row: 28, kind: 'oak' },
    { col: 10, row: 31, kind: 'oak' },
    { col: 10, row: 34, kind: 'oak' },
    { col: 10, row: 37, kind: 'oak' },
    { col: 10, row: 40, kind: 'oak' },
    { col: 10, row: 43, kind: 'oak' },
    { col: 10, row: 46, kind: 'oak' },
    { col: 10, row: 49, kind: 'oak' },
    { col: 10, row: 52, kind: 'oak' },
    { col: 10, row: 55, kind: 'oak' },
    { col: 10, row: 58, kind: 'oak' },
    { col: 10, row: 61, kind: 'oak' },
    { col: 10, row: 64, kind: 'oak' },
    { col: 10, row: 67, kind: 'oak' },
    { col: 10, row: 70, kind: 'oak' },
    { col: 10, row: 73, kind: 'oak' },
    { col: 10, row: 76, kind: 'oak' },
    { col: 13, row: 4, kind: 'oak' },
    { col: 13, row: 7, kind: 'oak' },
    { col: 13, row: 10, kind: 'oak' },
    { col: 13, row: 13, kind: 'oak' },
    { col: 13, row: 28, kind: 'oak' },
    { col: 13, row: 31, kind: 'oak' },
    { col: 13, row: 34, kind: 'oak' },
    { col: 13, row: 37, kind: 'oak' },
    { col: 13, row: 40, kind: 'oak' },
    { col: 13, row: 43, kind: 'oak' },
    { col: 13, row: 46, kind: 'oak' },
    { col: 13, row: 49, kind: 'oak' },
    { col: 13, row: 52, kind: 'oak' },
    { col: 13, row: 55, kind: 'oak' },
    { col: 13, row: 58, kind: 'oak' },
    { col: 13, row: 61, kind: 'oak' },
    { col: 13, row: 64, kind: 'oak' },
    { col: 13, row: 67, kind: 'oak' },
    { col: 13, row: 70, kind: 'oak' },
    { col: 13, row: 73, kind: 'oak' },
    { col: 13, row: 76, kind: 'oak' },
    { col: 16, row: 4, kind: 'oak' },
    { col: 16, row: 7, kind: 'oak' },
    { col: 16, row: 10, kind: 'oak' },
    { col: 16, row: 13, kind: 'oak' },
    { col: 16, row: 28, kind: 'oak' },
    { col: 16, row: 31, kind: 'oak' },
    { col: 16, row: 34, kind: 'oak' },
    { col: 16, row: 37, kind: 'oak' },
    { col: 16, row: 40, kind: 'oak' },
    { col: 16, row: 43, kind: 'oak' },
    { col: 16, row: 46, kind: 'oak' },
    { col: 16, row: 49, kind: 'oak' },
    { col: 16, row: 52, kind: 'oak' },
    { col: 16, row: 67, kind: 'oak' },
    { col: 16, row: 70, kind: 'oak' },
    { col: 16, row: 73, kind: 'oak' },
    { col: 16, row: 76, kind: 'oak' },
    { col: 19, row: 4, kind: 'oak' },
    { col: 19, row: 7, kind: 'oak' },
    { col: 19, row: 10, kind: 'oak' },
    { col: 19, row: 13, kind: 'oak' },
    { col: 19, row: 25, kind: 'oak' },
    { col: 19, row: 28, kind: 'oak' },
    { col: 19, row: 31, kind: 'oak' },
    { col: 19, row: 34, kind: 'oak' },
    { col: 19, row: 37, kind: 'oak' },
    { col: 19, row: 40, kind: 'oak' },
    { col: 19, row: 43, kind: 'oak' },
    { col: 19, row: 46, kind: 'oak' },
    { col: 19, row: 73, kind: 'oak' },
    { col: 19, row: 76, kind: 'oak' },
    { col: 22, row: 4, kind: 'oak' },
    { col: 22, row: 7, kind: 'oak' },
    { col: 22, row: 10, kind: 'oak' },
    { col: 22, row: 13, kind: 'oak' },
    { col: 22, row: 73, kind: 'oak' },
    { col: 22, row: 76, kind: 'oak' },
    { col: 25, row: 4, kind: 'oak' },
    { col: 25, row: 7, kind: 'oak' },
    { col: 25, row: 73, kind: 'oak' },
    { col: 25, row: 76, kind: 'oak' },
    { col: 28, row: 4, kind: 'oak' },
    { col: 28, row: 7, kind: 'oak' },
    { col: 28, row: 25, kind: 'oak' },
    { col: 28, row: 28, kind: 'oak' },
    { col: 28, row: 31, kind: 'oak' },
    { col: 28, row: 34, kind: 'oak' },
    { col: 28, row: 37, kind: 'oak' },
    { col: 28, row: 46, kind: 'oak' },
    { col: 28, row: 73, kind: 'oak' },
    { col: 28, row: 76, kind: 'oak' },
    { col: 31, row: 4, kind: 'oak' },
    { col: 31, row: 7, kind: 'oak' },
    { col: 31, row: 25, kind: 'oak' },
    { col: 31, row: 28, kind: 'oak' },
    { col: 31, row: 31, kind: 'oak' },
    { col: 31, row: 34, kind: 'oak' },
    { col: 31, row: 37, kind: 'oak' },
    { col: 31, row: 46, kind: 'oak' },
    { col: 31, row: 49, kind: 'oak' },
    { col: 31, row: 52, kind: 'oak' },
    { col: 31, row: 67, kind: 'oak' },
    { col: 31, row: 70, kind: 'oak' },
    { col: 31, row: 73, kind: 'oak' },
    { col: 31, row: 76, kind: 'oak' },
    { col: 34, row: 4, kind: 'oak' },
    { col: 34, row: 7, kind: 'oak' },
    { col: 34, row: 25, kind: 'oak' },
    { col: 34, row: 28, kind: 'oak' },
    { col: 34, row: 31, kind: 'oak' },
    { col: 34, row: 34, kind: 'oak' },
    { col: 34, row: 37, kind: 'oak' },
    { col: 34, row: 46, kind: 'oak' },
    { col: 34, row: 49, kind: 'oak' },
    { col: 34, row: 52, kind: 'oak' },
    { col: 34, row: 67, kind: 'oak' },
    { col: 34, row: 70, kind: 'oak' },
    { col: 34, row: 73, kind: 'oak' },
    { col: 34, row: 76, kind: 'oak' },
    { col: 37, row: 4, kind: 'oak' },
    { col: 37, row: 7, kind: 'oak' },
    { col: 37, row: 19, kind: 'oak' },
    { col: 37, row: 22, kind: 'oak' },
    { col: 37, row: 25, kind: 'oak' },
    { col: 37, row: 28, kind: 'oak' },
    { col: 37, row: 31, kind: 'oak' },
    { col: 37, row: 34, kind: 'oak' },
    { col: 37, row: 37, kind: 'oak' },
    { col: 37, row: 46, kind: 'oak' },
    { col: 37, row: 49, kind: 'oak' },
    { col: 37, row: 52, kind: 'oak' },
    { col: 37, row: 67, kind: 'oak' },
    { col: 37, row: 70, kind: 'oak' },
    { col: 37, row: 73, kind: 'oak' },
    { col: 37, row: 76, kind: 'oak' },
    { col: 40, row: 4, kind: 'oak' },
    { col: 40, row: 7, kind: 'oak' },
    { col: 40, row: 19, kind: 'oak' },
    { col: 40, row: 22, kind: 'oak' },
    { col: 40, row: 25, kind: 'oak' },
    { col: 40, row: 28, kind: 'oak' },
    { col: 40, row: 31, kind: 'oak' },
    { col: 40, row: 34, kind: 'oak' },
    { col: 40, row: 46, kind: 'oak' },
    { col: 40, row: 49, kind: 'oak' },
    { col: 40, row: 52, kind: 'oak' },
    { col: 40, row: 55, kind: 'oak' },
    { col: 40, row: 58, kind: 'oak' },
    { col: 40, row: 61, kind: 'oak' },
    { col: 40, row: 64, kind: 'oak' },
    { col: 40, row: 67, kind: 'oak' },
    { col: 40, row: 70, kind: 'oak' },
    { col: 40, row: 73, kind: 'oak' },
    { col: 40, row: 76, kind: 'oak' },
    { col: 43, row: 4, kind: 'oak' },
    { col: 43, row: 7, kind: 'oak' },
    { col: 43, row: 10, kind: 'oak' },
    { col: 43, row: 13, kind: 'oak' },
    { col: 43, row: 34, kind: 'oak' },
    { col: 43, row: 46, kind: 'oak' },
    { col: 43, row: 58, kind: 'oak' },
    { col: 43, row: 61, kind: 'oak' },
    { col: 43, row: 64, kind: 'oak' },
    { col: 43, row: 67, kind: 'oak' },
    { col: 46, row: 46, kind: 'oak' },
    { col: 49, row: 19, kind: 'oak' },
    { col: 49, row: 22, kind: 'oak' },
    { col: 49, row: 25, kind: 'oak' },
    { col: 49, row: 28, kind: 'oak' },
    { col: 49, row: 46, kind: 'oak' },
    { col: 49, row: 49, kind: 'oak' },
    { col: 49, row: 52, kind: 'oak' },
    { col: 49, row: 73, kind: 'oak' },
    { col: 49, row: 76, kind: 'oak' },
    { col: 52, row: 4, kind: 'oak' },
    { col: 52, row: 7, kind: 'oak' },
    { col: 52, row: 10, kind: 'oak' },
    { col: 52, row: 13, kind: 'oak' },
    { col: 52, row: 16, kind: 'oak' },
    { col: 52, row: 19, kind: 'oak' },
    { col: 52, row: 22, kind: 'oak' },
    { col: 52, row: 25, kind: 'oak' },
    { col: 52, row: 28, kind: 'oak' },
    { col: 52, row: 31, kind: 'oak' },
    { col: 52, row: 34, kind: 'oak' },
    { col: 52, row: 46, kind: 'oak' },
    { col: 52, row: 49, kind: 'oak' },
    { col: 52, row: 52, kind: 'oak' },
    { col: 52, row: 55, kind: 'oak' },
    { col: 52, row: 58, kind: 'oak' },
    { col: 52, row: 61, kind: 'oak' },
    { col: 52, row: 64, kind: 'oak' },
    { col: 52, row: 67, kind: 'oak' },
    { col: 52, row: 70, kind: 'oak' },
    { col: 52, row: 73, kind: 'oak' },
    { col: 52, row: 76, kind: 'oak' },
    { col: 55, row: 4, kind: 'oak' },
    { col: 55, row: 7, kind: 'oak' },
    { col: 55, row: 10, kind: 'oak' },
    { col: 55, row: 13, kind: 'oak' },
    { col: 55, row: 16, kind: 'oak' },
    { col: 55, row: 19, kind: 'oak' },
    { col: 55, row: 22, kind: 'oak' },
    { col: 55, row: 25, kind: 'oak' },
    { col: 55, row: 28, kind: 'oak' },
    { col: 55, row: 31, kind: 'oak' },
    { col: 55, row: 34, kind: 'oak' },
    { col: 55, row: 37, kind: 'oak' },
    { col: 55, row: 46, kind: 'oak' },
    { col: 55, row: 49, kind: 'oak' },
    { col: 55, row: 52, kind: 'oak' },
    { col: 55, row: 55, kind: 'oak' },
    { col: 55, row: 70, kind: 'oak' },
    { col: 55, row: 73, kind: 'oak' },
    { col: 55, row: 76, kind: 'oak' },
    { col: 58, row: 4, kind: 'oak' },
    { col: 58, row: 7, kind: 'oak' },
    { col: 58, row: 25, kind: 'oak' },
    { col: 58, row: 28, kind: 'oak' },
    { col: 58, row: 31, kind: 'oak' },
    { col: 58, row: 34, kind: 'oak' },
    { col: 58, row: 37, kind: 'oak' },
    { col: 58, row: 46, kind: 'oak' },
    { col: 58, row: 49, kind: 'oak' },
    { col: 58, row: 52, kind: 'oak' },
    { col: 58, row: 55, kind: 'oak' },
    { col: 58, row: 70, kind: 'oak' },
    { col: 58, row: 73, kind: 'oak' },
    { col: 58, row: 76, kind: 'oak' },
    { col: 61, row: 4, kind: 'oak' },
    { col: 61, row: 7, kind: 'oak' },
    { col: 61, row: 25, kind: 'oak' },
    { col: 61, row: 28, kind: 'oak' },
    { col: 61, row: 31, kind: 'oak' },
    { col: 61, row: 34, kind: 'oak' },
    { col: 61, row: 37, kind: 'oak' },
    { col: 61, row: 46, kind: 'oak' },
    { col: 61, row: 49, kind: 'oak' },
    { col: 61, row: 73, kind: 'oak' },
    { col: 61, row: 76, kind: 'oak' },
    { col: 64, row: 4, kind: 'oak' },
    { col: 64, row: 7, kind: 'oak' },
    { col: 64, row: 73, kind: 'oak' },
    { col: 64, row: 76, kind: 'oak' },
    { col: 67, row: 4, kind: 'oak' },
    { col: 67, row: 7, kind: 'oak' },
    { col: 67, row: 73, kind: 'oak' },
    { col: 67, row: 76, kind: 'oak' },
    { col: 70, row: 4, kind: 'oak' },
    { col: 70, row: 7, kind: 'oak' },
    { col: 70, row: 25, kind: 'oak' },
    { col: 70, row: 28, kind: 'oak' },
    { col: 70, row: 31, kind: 'oak' },
    { col: 70, row: 34, kind: 'oak' },
    { col: 70, row: 37, kind: 'oak' },
    { col: 70, row: 46, kind: 'oak' },
    { col: 70, row: 49, kind: 'oak' },
    { col: 70, row: 73, kind: 'oak' },
    { col: 70, row: 76, kind: 'oak' },
    { col: 73, row: 4, kind: 'oak' },
    { col: 73, row: 7, kind: 'oak' },
    { col: 73, row: 25, kind: 'oak' },
    { col: 73, row: 28, kind: 'oak' },
    { col: 73, row: 31, kind: 'oak' },
    { col: 73, row: 34, kind: 'oak' },
    { col: 73, row: 37, kind: 'oak' },
    { col: 73, row: 46, kind: 'oak' },
    { col: 73, row: 49, kind: 'oak' },
    { col: 73, row: 52, kind: 'oak' },
    { col: 73, row: 55, kind: 'oak' },
    { col: 73, row: 70, kind: 'oak' },
    { col: 73, row: 73, kind: 'oak' },
    { col: 73, row: 76, kind: 'oak' },
    { col: 76, row: 4, kind: 'oak' },
    { col: 76, row: 7, kind: 'oak' },
    { col: 76, row: 25, kind: 'oak' },
    { col: 76, row: 28, kind: 'oak' },
    { col: 76, row: 31, kind: 'oak' },
    { col: 76, row: 34, kind: 'oak' },
    { col: 76, row: 37, kind: 'oak' },
    { col: 76, row: 46, kind: 'oak' },
    { col: 76, row: 49, kind: 'oak' },
    { col: 76, row: 52, kind: 'oak' },
    { col: 76, row: 55, kind: 'oak' },
    { col: 76, row: 70, kind: 'oak' },
    { col: 76, row: 73, kind: 'oak' },
    { col: 76, row: 76, kind: 'oak' },
    { col: 79, row: 4, kind: 'oak' },
    { col: 79, row: 7, kind: 'oak' },
    { col: 79, row: 10, kind: 'oak' },
    { col: 79, row: 13, kind: 'oak' },
    { col: 79, row: 19, kind: 'oak' },
    { col: 79, row: 22, kind: 'oak' },
    { col: 79, row: 25, kind: 'oak' },
    { col: 79, row: 28, kind: 'oak' },
    { col: 79, row: 31, kind: 'oak' },
    { col: 79, row: 34, kind: 'oak' },
    { col: 79, row: 37, kind: 'oak' },
    { col: 79, row: 46, kind: 'oak' },
    { col: 79, row: 49, kind: 'oak' },
    { col: 79, row: 52, kind: 'oak' },
    { col: 79, row: 55, kind: 'oak' },
    { col: 79, row: 70, kind: 'oak' },
    { col: 79, row: 73, kind: 'oak' },
    { col: 79, row: 76, kind: 'oak' },
    { col: 82, row: 4, kind: 'oak' },
    { col: 82, row: 7, kind: 'oak' },
    { col: 82, row: 19, kind: 'oak' },
    { col: 82, row: 22, kind: 'oak' },
    { col: 82, row: 25, kind: 'oak' },
    { col: 82, row: 28, kind: 'oak' },
    { col: 82, row: 31, kind: 'oak' },
    { col: 82, row: 34, kind: 'oak' },
    { col: 82, row: 37, kind: 'oak' },
    { col: 82, row: 46, kind: 'oak' },
    { col: 82, row: 49, kind: 'oak' },
    { col: 82, row: 52, kind: 'oak' },
    { col: 82, row: 55, kind: 'oak' },
    { col: 82, row: 58, kind: 'oak' },
    { col: 82, row: 76, kind: 'oak' },
    { col: 85, row: 31, kind: 'oak' },
    { col: 85, row: 34, kind: 'oak' },
    { col: 85, row: 37, kind: 'oak' },
    { col: 85, row: 46, kind: 'oak' },
    { col: 85, row: 49, kind: 'oak' },
    { col: 85, row: 52, kind: 'oak' },
    { col: 88, row: 31, kind: 'oak' },
    { col: 88, row: 34, kind: 'oak' },
    { col: 88, row: 37, kind: 'oak' },
    { col: 88, row: 46, kind: 'oak' },
    { col: 88, row: 49, kind: 'oak' },
    { col: 88, row: 52, kind: 'oak' },
    { col: 91, row: 4, kind: 'oak' },
    { col: 91, row: 7, kind: 'oak' },
    { col: 91, row: 10, kind: 'oak' },
    { col: 91, row: 13, kind: 'oak' },
    { col: 91, row: 19, kind: 'oak' },
    { col: 91, row: 22, kind: 'oak' },
    { col: 91, row: 28, kind: 'oak' },
    { col: 91, row: 31, kind: 'oak' },
    { col: 91, row: 34, kind: 'oak' },
    { col: 91, row: 37, kind: 'oak' },
    { col: 91, row: 46, kind: 'oak' },
    { col: 91, row: 49, kind: 'oak' },
    { col: 91, row: 52, kind: 'oak' },
    { col: 91, row: 55, kind: 'oak' },
    { col: 91, row: 58, kind: 'oak' },
    { col: 91, row: 67, kind: 'oak' },
    { col: 91, row: 70, kind: 'oak' },
    { col: 91, row: 73, kind: 'oak' },
    { col: 91, row: 76, kind: 'oak' },
    { col: 94, row: 52, kind: 'oak' },
    { col: 94, row: 55, kind: 'oak' },
    { col: 94, row: 58, kind: 'oak' },
    { col: 94, row: 67, kind: 'oak' },
    { col: 94, row: 70, kind: 'oak' },
    { col: 94, row: 73, kind: 'oak' },
    { col: 94, row: 76, kind: 'oak' },
    { col: 97, row: 52, kind: 'oak' },
    { col: 97, row: 55, kind: 'oak' },
    { col: 97, row: 58, kind: 'oak' },
    { col: 97, row: 67, kind: 'oak' },
    { col: 97, row: 70, kind: 'oak' },
    { col: 97, row: 73, kind: 'oak' },
    { col: 97, row: 76, kind: 'oak' },
    { col: 100, row: 13, kind: 'oak' },
    { col: 100, row: 19, kind: 'oak' },
    { col: 100, row: 22, kind: 'oak' },
    { col: 100, row: 34, kind: 'oak' },
    { col: 100, row: 37, kind: 'oak' },
    { col: 100, row: 40, kind: 'oak' },
    { col: 100, row: 43, kind: 'oak' },
    { col: 100, row: 46, kind: 'oak' },
    { col: 100, row: 49, kind: 'oak' },
    { col: 100, row: 55, kind: 'oak' },
    { col: 100, row: 58, kind: 'oak' },
    { col: 100, row: 67, kind: 'oak' },
    { col: 100, row: 70, kind: 'oak' },
    { col: 100, row: 73, kind: 'oak' },
    { col: 100, row: 76, kind: 'oak' },
    { col: 103, row: 4, kind: 'oak' },
    { col: 103, row: 7, kind: 'oak' },
    { col: 103, row: 10, kind: 'oak' },
    { col: 103, row: 13, kind: 'oak' },
    { col: 103, row: 19, kind: 'oak' },
    { col: 103, row: 22, kind: 'oak' },
    { col: 103, row: 25, kind: 'oak' },
    { col: 103, row: 34, kind: 'oak' },
    { col: 103, row: 46, kind: 'oak' },
    { col: 103, row: 49, kind: 'oak' },
    { col: 103, row: 55, kind: 'oak' },
    { col: 103, row: 58, kind: 'oak' },
    { col: 103, row: 67, kind: 'oak' },
    { col: 103, row: 70, kind: 'oak' },
    { col: 103, row: 73, kind: 'oak' },
    { col: 103, row: 76, kind: 'oak' },
    { col: 106, row: 4, kind: 'oak' },
    { col: 106, row: 7, kind: 'oak' },
    { col: 106, row: 10, kind: 'oak' },
    { col: 106, row: 13, kind: 'oak' },
    { col: 106, row: 19, kind: 'oak' },
    { col: 106, row: 22, kind: 'oak' },
    { col: 106, row: 25, kind: 'oak' },
    { col: 106, row: 49, kind: 'oak' },
    { col: 106, row: 58, kind: 'oak' },
    { col: 106, row: 67, kind: 'oak' },
    { col: 106, row: 70, kind: 'oak' },
    { col: 106, row: 73, kind: 'oak' },
    { col: 106, row: 76, kind: 'oak' },
    { col: 109, row: 4, kind: 'oak' },
    { col: 109, row: 7, kind: 'oak' },
    { col: 109, row: 10, kind: 'oak' },
    { col: 109, row: 13, kind: 'oak' },
    { col: 109, row: 19, kind: 'oak' },
    { col: 109, row: 22, kind: 'oak' },
    { col: 109, row: 25, kind: 'oak' },
    { col: 109, row: 49, kind: 'oak' },
    { col: 109, row: 58, kind: 'oak' },
    { col: 109, row: 70, kind: 'oak' },
    { col: 109, row: 73, kind: 'oak' },
    { col: 109, row: 76, kind: 'oak' },
    { col: 112, row: 4, kind: 'oak' },
    { col: 112, row: 7, kind: 'oak' },
    { col: 112, row: 10, kind: 'oak' },
    { col: 112, row: 13, kind: 'oak' },
    { col: 112, row: 19, kind: 'oak' },
    { col: 112, row: 22, kind: 'oak' },
    { col: 112, row: 25, kind: 'oak' },
    { col: 112, row: 28, kind: 'oak' },
    { col: 112, row: 49, kind: 'oak' },
    { col: 112, row: 73, kind: 'oak' },
    { col: 112, row: 76, kind: 'oak' },
    { col: 115, row: 4, kind: 'oak' },
    { col: 115, row: 7, kind: 'oak' },
    { col: 115, row: 10, kind: 'oak' },
    { col: 115, row: 13, kind: 'oak' },
    { col: 115, row: 19, kind: 'oak' },
    { col: 115, row: 22, kind: 'oak' },
    { col: 115, row: 25, kind: 'oak' },
    { col: 115, row: 28, kind: 'oak' },
    { col: 115, row: 34, kind: 'oak' },
    { col: 115, row: 46, kind: 'oak' },
    { col: 115, row: 49, kind: 'oak' },
    { col: 118, row: 4, kind: 'oak' },
    { col: 118, row: 7, kind: 'oak' },
    { col: 118, row: 10, kind: 'oak' },
    { col: 118, row: 13, kind: 'oak' },
    { col: 118, row: 19, kind: 'oak' },
    { col: 118, row: 22, kind: 'oak' },
    { col: 118, row: 25, kind: 'oak' },
    { col: 118, row: 28, kind: 'oak' },
    { col: 118, row: 58, kind: 'oak' },
    { col: 118, row: 61, kind: 'oak' },
    { col: 121, row: 4, kind: 'oak' },
    { col: 121, row: 7, kind: 'oak' },
    { col: 121, row: 10, kind: 'oak' },
    { col: 121, row: 13, kind: 'oak' },
    { col: 121, row: 19, kind: 'oak' },
    { col: 121, row: 22, kind: 'oak' },
    { col: 121, row: 25, kind: 'oak' },
    { col: 121, row: 28, kind: 'oak' },
    { col: 121, row: 31, kind: 'oak' },
    { col: 121, row: 55, kind: 'oak' },
    { col: 121, row: 58, kind: 'oak' },
    { col: 121, row: 61, kind: 'oak' },
    { col: 121, row: 70, kind: 'oak' },
    { col: 121, row: 73, kind: 'oak' },
    { col: 121, row: 76, kind: 'oak' },
    { col: 124, row: 4, kind: 'oak' },
    { col: 124, row: 7, kind: 'oak' },
    { col: 124, row: 10, kind: 'oak' },
    { col: 124, row: 13, kind: 'oak' },
    { col: 124, row: 19, kind: 'oak' },
    { col: 124, row: 22, kind: 'oak' },
    { col: 124, row: 25, kind: 'oak' },
    { col: 124, row: 28, kind: 'oak' },
    { col: 124, row: 31, kind: 'oak' },
    { col: 124, row: 52, kind: 'oak' },
    { col: 124, row: 55, kind: 'oak' },
    { col: 124, row: 58, kind: 'oak' },
    { col: 124, row: 61, kind: 'oak' },
    { col: 124, row: 70, kind: 'oak' },
    { col: 124, row: 73, kind: 'oak' },
    { col: 124, row: 76, kind: 'oak' },
    { col: 127, row: 4, kind: 'oak' },
    { col: 127, row: 7, kind: 'oak' },
    { col: 127, row: 10, kind: 'oak' },
    { col: 127, row: 13, kind: 'oak' },
    { col: 127, row: 19, kind: 'oak' },
    { col: 127, row: 22, kind: 'oak' },
    { col: 127, row: 25, kind: 'oak' },
    { col: 127, row: 28, kind: 'oak' },
    { col: 127, row: 31, kind: 'oak' },
    { col: 127, row: 34, kind: 'oak' },
    { col: 127, row: 37, kind: 'oak' },
    { col: 127, row: 46, kind: 'oak' },
    { col: 127, row: 49, kind: 'oak' },
    { col: 127, row: 52, kind: 'oak' },
    { col: 127, row: 55, kind: 'oak' },
    { col: 127, row: 58, kind: 'oak' },
    { col: 127, row: 61, kind: 'oak' },
    { col: 127, row: 70, kind: 'oak' },
    { col: 127, row: 73, kind: 'oak' },
    { col: 127, row: 76, kind: 'oak' },
    { col: 130, row: 4, kind: 'oak' },
    { col: 130, row: 7, kind: 'oak' },
    { col: 130, row: 10, kind: 'oak' },
    { col: 130, row: 13, kind: 'oak' },
    { col: 130, row: 19, kind: 'oak' },
    { col: 130, row: 22, kind: 'oak' },
    { col: 130, row: 25, kind: 'oak' },
    { col: 130, row: 31, kind: 'oak' },
    { col: 130, row: 34, kind: 'oak' },
    { col: 130, row: 37, kind: 'oak' },
    { col: 130, row: 46, kind: 'oak' },
    { col: 130, row: 49, kind: 'oak' },
    { col: 130, row: 52, kind: 'oak' },
    { col: 130, row: 55, kind: 'oak' },
    { col: 130, row: 58, kind: 'oak' },
    { col: 130, row: 61, kind: 'oak' },
    { col: 130, row: 70, kind: 'oak' },
    { col: 130, row: 73, kind: 'oak' },
    { col: 130, row: 76, kind: 'oak' },
    { col: 133, row: 4, kind: 'oak' },
    { col: 133, row: 7, kind: 'oak' },
    { col: 133, row: 10, kind: 'oak' },
    { col: 133, row: 70, kind: 'oak' },
    { col: 133, row: 73, kind: 'oak' },
    { col: 133, row: 76, kind: 'oak' },
    { col: 136, row: 4, kind: 'oak' },
    { col: 136, row: 7, kind: 'oak' },
    { col: 136, row: 10, kind: 'oak' },
    { col: 136, row: 67, kind: 'oak' },
    { col: 136, row: 70, kind: 'oak' },
    { col: 136, row: 73, kind: 'oak' },
    { col: 136, row: 76, kind: 'oak' },
    { col: 139, row: 4, kind: 'oak' },
    { col: 139, row: 7, kind: 'oak' },
    { col: 139, row: 10, kind: 'oak' },
    { col: 139, row: 22, kind: 'oak' },
    { col: 139, row: 25, kind: 'oak' },
    { col: 139, row: 28, kind: 'oak' },
    { col: 139, row: 31, kind: 'oak' },
    { col: 139, row: 34, kind: 'oak' },
    { col: 139, row: 37, kind: 'oak' },
    { col: 139, row: 40, kind: 'oak' },
    { col: 139, row: 43, kind: 'oak' },
    { col: 139, row: 46, kind: 'oak' },
    { col: 139, row: 49, kind: 'oak' },
    { col: 139, row: 52, kind: 'oak' },
    { col: 139, row: 67, kind: 'oak' },
    { col: 139, row: 70, kind: 'oak' },
    { col: 139, row: 73, kind: 'oak' },
    { col: 139, row: 76, kind: 'oak' },
    { col: 142, row: 4, kind: 'oak' },
    { col: 142, row: 7, kind: 'oak' },
    { col: 142, row: 31, kind: 'oak' },
    { col: 142, row: 34, kind: 'oak' },
    { col: 142, row: 37, kind: 'oak' },
    { col: 142, row: 40, kind: 'oak' },
    { col: 142, row: 43, kind: 'oak' },
    { col: 142, row: 46, kind: 'oak' },
    { col: 142, row: 49, kind: 'oak' },
    { col: 142, row: 73, kind: 'oak' },
    { col: 142, row: 76, kind: 'oak' },
    { col: 145, row: 4, kind: 'oak' },
    { col: 145, row: 7, kind: 'oak' },
    { col: 145, row: 31, kind: 'oak' },
    { col: 145, row: 34, kind: 'oak' },
    { col: 145, row: 37, kind: 'oak' },
    { col: 145, row: 40, kind: 'oak' },
    { col: 145, row: 43, kind: 'oak' },
    { col: 145, row: 46, kind: 'oak' },
    { col: 145, row: 49, kind: 'oak' },
    { col: 145, row: 73, kind: 'oak' },
    { col: 145, row: 76, kind: 'oak' },
    { col: 148, row: 4, kind: 'oak' },
    { col: 148, row: 7, kind: 'oak' },
    { col: 148, row: 31, kind: 'oak' },
    { col: 148, row: 34, kind: 'oak' },
    { col: 148, row: 37, kind: 'oak' },
    { col: 148, row: 46, kind: 'oak' },
    { col: 148, row: 49, kind: 'oak' },
    { col: 148, row: 73, kind: 'oak' },
    { col: 148, row: 76, kind: 'oak' },
    { col: 151, row: 4, kind: 'oak' },
    { col: 151, row: 7, kind: 'oak' },
    { col: 151, row: 31, kind: 'oak' },
    { col: 151, row: 34, kind: 'oak' },
    { col: 151, row: 37, kind: 'oak' },
    { col: 151, row: 46, kind: 'oak' },
    { col: 151, row: 49, kind: 'oak' },
    { col: 151, row: 73, kind: 'oak' },
    { col: 151, row: 76, kind: 'oak' },
    { col: 154, row: 4, kind: 'oak' },
    { col: 154, row: 7, kind: 'oak' },
    { col: 154, row: 10, kind: 'oak' },
    { col: 154, row: 25, kind: 'oak' },
    { col: 154, row: 31, kind: 'oak' },
    { col: 154, row: 34, kind: 'oak' },
    { col: 154, row: 37, kind: 'oak' },
    { col: 154, row: 46, kind: 'oak' },
    { col: 154, row: 49, kind: 'oak' },
    { col: 154, row: 52, kind: 'oak' },
    { col: 154, row: 67, kind: 'oak' },
    { col: 154, row: 70, kind: 'oak' },
    { col: 154, row: 73, kind: 'oak' },
    { col: 154, row: 76, kind: 'oak' },
    { col: 157, row: 4, kind: 'oak' },
    { col: 157, row: 7, kind: 'oak' },
    { col: 157, row: 10, kind: 'oak' },
    { col: 157, row: 22, kind: 'oak' },
    { col: 157, row: 25, kind: 'oak' },
    { col: 157, row: 28, kind: 'oak' },
    { col: 157, row: 31, kind: 'oak' },
    { col: 157, row: 34, kind: 'oak' },
    { col: 157, row: 37, kind: 'oak' },
    { col: 157, row: 46, kind: 'oak' },
    { col: 157, row: 49, kind: 'oak' },
    { col: 157, row: 52, kind: 'oak' },
    { col: 157, row: 67, kind: 'oak' },
    { col: 157, row: 70, kind: 'oak' },
    { col: 157, row: 73, kind: 'oak' },
    { col: 157, row: 76, kind: 'oak' },
    { col: 160, row: 4, kind: 'oak' },
    { col: 160, row: 7, kind: 'oak' },
    { col: 160, row: 10, kind: 'oak' },
    { col: 160, row: 22, kind: 'oak' },
    { col: 160, row: 25, kind: 'oak' },
    { col: 160, row: 31, kind: 'oak' },
    { col: 160, row: 34, kind: 'oak' },
    { col: 160, row: 46, kind: 'oak' },
    { col: 160, row: 49, kind: 'oak' },
    { col: 160, row: 52, kind: 'oak' },
    { col: 160, row: 67, kind: 'oak' },
    { col: 160, row: 70, kind: 'oak' },
    { col: 160, row: 73, kind: 'oak' },
    { col: 160, row: 76, kind: 'oak' },
    { col: 163, row: 4, kind: 'oak' },
    { col: 163, row: 7, kind: 'oak' },
    { col: 163, row: 10, kind: 'oak' },
    { col: 163, row: 13, kind: 'oak' },
    { col: 163, row: 31, kind: 'oak' },
    { col: 163, row: 34, kind: 'oak' },
    { col: 163, row: 49, kind: 'oak' },
    { col: 163, row: 58, kind: 'oak' },
    { col: 163, row: 61, kind: 'oak' },
    { col: 163, row: 64, kind: 'oak' },
    { col: 163, row: 67, kind: 'oak' },
    { col: 166, row: 31, kind: 'oak' },
    { col: 169, row: 19, kind: 'oak' },
    { col: 169, row: 22, kind: 'oak' },
    { col: 169, row: 25, kind: 'oak' },
    { col: 169, row: 28, kind: 'oak' },
    { col: 169, row: 31, kind: 'oak' },
    { col: 169, row: 52, kind: 'oak' },
    { col: 169, row: 73, kind: 'oak' },
    { col: 169, row: 76, kind: 'oak' },
    { col: 172, row: 4, kind: 'oak' },
    { col: 172, row: 7, kind: 'oak' },
    { col: 172, row: 10, kind: 'oak' },
    { col: 172, row: 13, kind: 'oak' },
    { col: 172, row: 16, kind: 'oak' },
    { col: 172, row: 19, kind: 'oak' },
    { col: 172, row: 22, kind: 'oak' },
    { col: 172, row: 25, kind: 'oak' },
    { col: 172, row: 28, kind: 'oak' },
    { col: 172, row: 31, kind: 'oak' },
    { col: 172, row: 49, kind: 'oak' },
    { col: 172, row: 52, kind: 'oak' },
    { col: 172, row: 55, kind: 'oak' },
    { col: 172, row: 58, kind: 'oak' },
    { col: 172, row: 61, kind: 'oak' },
    { col: 172, row: 64, kind: 'oak' },
    { col: 172, row: 67, kind: 'oak' },
    { col: 172, row: 70, kind: 'oak' },
    { col: 172, row: 73, kind: 'oak' },
    { col: 172, row: 76, kind: 'oak' },
    { col: 175, row: 4, kind: 'oak' },
    { col: 175, row: 7, kind: 'oak' },
    { col: 175, row: 10, kind: 'oak' },
    { col: 175, row: 13, kind: 'oak' },
    { col: 175, row: 16, kind: 'oak' },
    { col: 175, row: 19, kind: 'oak' },
    { col: 175, row: 22, kind: 'oak' },
    { col: 175, row: 25, kind: 'oak' },
    { col: 175, row: 28, kind: 'oak' },
    { col: 175, row: 31, kind: 'oak' },
    { col: 175, row: 49, kind: 'oak' },
    { col: 175, row: 52, kind: 'oak' },
    { col: 175, row: 55, kind: 'oak' },
    { col: 175, row: 58, kind: 'oak' },
    { col: 175, row: 61, kind: 'oak' },
    { col: 175, row: 64, kind: 'oak' },
    { col: 175, row: 67, kind: 'oak' },
    { col: 175, row: 70, kind: 'oak' },
    { col: 175, row: 73, kind: 'oak' },
    { col: 175, row: 76, kind: 'oak' },
    { col: 178, row: 4, kind: 'oak' },
    { col: 178, row: 7, kind: 'oak' },
    { col: 178, row: 10, kind: 'oak' },
    { col: 178, row: 13, kind: 'oak' },
    { col: 178, row: 16, kind: 'oak' },
    { col: 178, row: 19, kind: 'oak' },
    { col: 178, row: 22, kind: 'oak' },
    { col: 178, row: 25, kind: 'oak' },
    { col: 178, row: 28, kind: 'oak' },
    { col: 178, row: 52, kind: 'oak' },
    { col: 178, row: 55, kind: 'oak' },
    { col: 178, row: 58, kind: 'oak' },
    { col: 178, row: 61, kind: 'oak' },
    { col: 178, row: 64, kind: 'oak' },
    { col: 178, row: 67, kind: 'oak' },
    { col: 178, row: 70, kind: 'oak' },
    { col: 178, row: 73, kind: 'oak' },
    { col: 178, row: 76, kind: 'oak' },
    { col: 181, row: 4, kind: 'oak' },
    { col: 181, row: 7, kind: 'oak' },
    { col: 181, row: 10, kind: 'oak' },
    { col: 181, row: 13, kind: 'oak' },
    { col: 181, row: 16, kind: 'oak' },
    { col: 181, row: 19, kind: 'oak' },
    { col: 181, row: 22, kind: 'oak' },
    { col: 181, row: 25, kind: 'oak' },
    { col: 181, row: 28, kind: 'oak' },
    { col: 181, row: 55, kind: 'oak' },
    { col: 181, row: 58, kind: 'oak' },
    { col: 181, row: 61, kind: 'oak' },
    { col: 181, row: 64, kind: 'oak' },
    { col: 181, row: 67, kind: 'oak' },
    { col: 181, row: 70, kind: 'oak' },
    { col: 181, row: 73, kind: 'oak' },
    { col: 181, row: 76, kind: 'oak' },
    { col: 184, row: 4, kind: 'oak' },
    { col: 184, row: 7, kind: 'oak' },
    { col: 184, row: 10, kind: 'oak' },
    { col: 184, row: 13, kind: 'oak' },
    { col: 184, row: 16, kind: 'oak' },
    { col: 184, row: 19, kind: 'oak' },
    { col: 184, row: 22, kind: 'oak' },
    { col: 184, row: 25, kind: 'oak' },
    { col: 184, row: 28, kind: 'oak' },
    { col: 184, row: 55, kind: 'oak' },
    { col: 184, row: 58, kind: 'oak' },
    { col: 184, row: 61, kind: 'oak' },
    { col: 184, row: 64, kind: 'oak' },
    { col: 184, row: 67, kind: 'oak' },
    { col: 184, row: 70, kind: 'oak' },
    { col: 184, row: 73, kind: 'oak' },
    { col: 184, row: 76, kind: 'oak' },
    { col: 187, row: 4, kind: 'oak' },
    { col: 187, row: 7, kind: 'oak' },
    { col: 187, row: 10, kind: 'oak' },
    { col: 187, row: 13, kind: 'oak' },
    { col: 187, row: 16, kind: 'oak' },
    { col: 187, row: 19, kind: 'oak' },
    { col: 187, row: 22, kind: 'oak' },
    { col: 187, row: 25, kind: 'oak' },
    { col: 187, row: 28, kind: 'oak' },
    { col: 187, row: 55, kind: 'oak' },
    { col: 187, row: 58, kind: 'oak' },
    { col: 187, row: 61, kind: 'oak' },
    { col: 187, row: 64, kind: 'oak' },
    { col: 187, row: 67, kind: 'oak' },
    { col: 187, row: 70, kind: 'oak' },
    { col: 187, row: 73, kind: 'oak' },
    { col: 187, row: 76, kind: 'oak' },
    { col: 190, row: 4, kind: 'oak' },
    { col: 190, row: 7, kind: 'oak' },
    { col: 190, row: 10, kind: 'oak' },
    { col: 190, row: 13, kind: 'oak' },
    { col: 190, row: 16, kind: 'oak' },
    { col: 190, row: 19, kind: 'oak' },
    { col: 190, row: 22, kind: 'oak' },
    { col: 190, row: 25, kind: 'oak' },
    { col: 190, row: 28, kind: 'oak' },
    { col: 190, row: 52, kind: 'oak' },
    { col: 190, row: 55, kind: 'oak' },
    { col: 190, row: 58, kind: 'oak' },
    { col: 190, row: 61, kind: 'oak' },
    { col: 190, row: 64, kind: 'oak' },
    { col: 190, row: 67, kind: 'oak' },
    { col: 190, row: 70, kind: 'oak' },
    { col: 190, row: 73, kind: 'oak' },
    { col: 190, row: 76, kind: 'oak' },
    { col: 193, row: 4, kind: 'oak' },
    { col: 193, row: 7, kind: 'oak' },
    { col: 193, row: 10, kind: 'oak' },
    { col: 193, row: 13, kind: 'oak' },
    { col: 193, row: 16, kind: 'oak' },
    { col: 193, row: 19, kind: 'oak' },
    { col: 193, row: 22, kind: 'oak' },
    { col: 193, row: 25, kind: 'oak' },
    { col: 193, row: 28, kind: 'oak' },
    { col: 193, row: 31, kind: 'oak' },
    { col: 193, row: 49, kind: 'oak' },
    { col: 193, row: 52, kind: 'oak' },
    { col: 193, row: 55, kind: 'oak' },
    { col: 193, row: 58, kind: 'oak' },
    { col: 193, row: 61, kind: 'oak' },
    { col: 193, row: 64, kind: 'oak' },
    { col: 193, row: 67, kind: 'oak' },
    { col: 193, row: 70, kind: 'oak' },
    { col: 193, row: 73, kind: 'oak' },
    { col: 193, row: 76, kind: 'oak' },
    { col: 196, row: 4, kind: 'oak' },
    { col: 196, row: 7, kind: 'oak' },
    { col: 196, row: 10, kind: 'oak' },
    { col: 196, row: 13, kind: 'oak' },
    { col: 196, row: 16, kind: 'oak' },
    { col: 196, row: 19, kind: 'oak' },
    { col: 196, row: 22, kind: 'oak' },
    { col: 196, row: 25, kind: 'oak' },
    { col: 196, row: 28, kind: 'oak' },
    { col: 196, row: 31, kind: 'oak' },
    { col: 196, row: 34, kind: 'oak' },
    { col: 196, row: 37, kind: 'oak' },
    { col: 196, row: 46, kind: 'oak' },
    { col: 196, row: 49, kind: 'oak' },
    { col: 196, row: 52, kind: 'oak' },
    { col: 196, row: 55, kind: 'oak' },
    { col: 196, row: 58, kind: 'oak' },
    { col: 196, row: 61, kind: 'oak' },
    { col: 196, row: 64, kind: 'oak' },
    { col: 196, row: 67, kind: 'oak' },
    { col: 196, row: 70, kind: 'oak' },
    { col: 196, row: 73, kind: 'oak' },
    { col: 196, row: 76, kind: 'oak' },
  ];

  // 9. Architectural Structures & Environmental Decorations (300+ props)
  const decorations: DecorationObject[] = [
    { col: 8, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 8, row: 26, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 10, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 10, row: 26, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 12, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 12, row: 26, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 14, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 14, row: 26, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 16, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 16, row: 26, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 18, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 18, row: 26, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 20, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 20, row: 26, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 8, row: 18, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 8, row: 20, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 8, row: 22, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 8, row: 24, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 10, row: 18, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 10, row: 24, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 16, row: 18, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 18, row: 20, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 18, row: 22, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 12, row: 20, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 16, row: 24, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 24, row: 8, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 24, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 26, row: 8, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 26, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 28, row: 8, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 28, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 30, row: 8, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 30, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 32, row: 8, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 32, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 34, row: 8, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 34, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 36, row: 8, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 36, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 38, row: 8, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 38, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 28, row: 12, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 34, row: 14, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 36, row: 18, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 26, row: 14, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 38, row: 12, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 16, row: 52, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 16, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 16, row: 60, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 16, row: 64, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 20, row: 52, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 20, row: 56, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 20, row: 60, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 20, row: 64, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 24, row: 52, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 24, row: 56, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 24, row: 60, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 24, row: 64, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 28, row: 52, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 28, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 28, row: 60, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 28, row: 64, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 32, row: 52, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 32, row: 56, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 32, row: 60, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 32, row: 64, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 24, row: 56, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 20, row: 60, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 28, row: 60, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 38, row: 37, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 38, row: 45, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 38, row: 43, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 41, row: 37, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 41, row: 45, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 41, row: 43, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 44, row: 37, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 44, row: 45, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 44, row: 43, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 47, row: 37, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 47, row: 45, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 47, row: 43, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 50, row: 37, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 50, row: 45, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 50, row: 43, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 53, row: 37, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 53, row: 45, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 53, row: 43, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 60, row: 12, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 64, row: 12, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 70, row: 12, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 74, row: 12, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 60, row: 20, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 64, row: 20, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 70, row: 20, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 74, row: 20, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 58, row: 16, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 74, row: 16, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 62, row: 16, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 68, row: 16, key: TEXTURE.PROP_CHAINS, solid: false },
    { col: 62, row: 14, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 68, row: 18, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 54, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 55, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 54, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 55, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 54, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 55, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 54, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 55, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 54, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 55, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 54, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 55, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 57, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 58, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 57, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 58, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 57, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 58, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 57, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 58, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 57, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 58, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 57, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 58, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 60, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 61, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 60, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 61, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 60, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 61, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 60, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 61, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 60, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 61, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 60, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 61, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 63, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 64, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 63, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 64, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 63, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 64, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 63, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 64, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 63, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 64, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 63, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 64, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 66, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 67, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 66, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 67, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 66, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 67, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 66, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 67, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 66, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 67, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 66, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 67, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 69, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 70, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 69, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 70, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 69, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 70, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 69, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 70, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 69, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 70, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 69, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 70, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 72, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 73, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 72, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 73, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 72, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 73, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 72, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 73, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 72, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 73, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 72, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 73, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 75, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 76, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 75, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 76, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 75, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 76, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 75, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 76, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 75, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 76, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 75, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 76, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 78, row: 52, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 79, row: 52, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 78, row: 56, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 79, row: 56, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 78, row: 60, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 79, row: 60, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 78, row: 64, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 79, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 78, row: 68, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 79, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 78, row: 72, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 79, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 126, row: 4, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 6, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 8, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 10, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 12, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 14, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 14, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 16, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 16, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 18, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 18, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 20, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 22, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 24, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 26, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 28, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 30, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 30, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 32, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 32, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 34, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 34, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 36, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 36, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 38, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 38, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 40, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 40, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 42, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 44, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 44, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 46, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 46, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 48, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 48, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 50, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 50, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 52, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 52, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 54, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 56, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 58, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 60, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 60, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 62, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 62, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 64, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 64, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 66, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 68, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 70, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 72, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 126, row: 74, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 88, row: 18, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 86, row: 60, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 110, row: 36, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 104, row: 40, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 116, row: 40, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 104, row: 46, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 116, row: 46, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 104, row: 34, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 104, row: 48, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 106, row: 34, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 106, row: 48, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 108, row: 34, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 108, row: 48, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 110, row: 34, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 110, row: 48, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 112, row: 34, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 112, row: 48, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 114, row: 34, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 114, row: 48, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 116, row: 34, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 116, row: 48, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 130, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 132, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 132, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 134, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 134, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 136, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 136, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 138, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 138, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 140, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 140, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 142, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 142, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 144, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 144, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 146, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 148, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 148, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 150, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 150, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 152, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 152, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 154, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 154, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 156, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 156, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 158, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 158, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 160, row: 8, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 160, row: 28, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 11, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 14, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 17, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 20, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 23, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 26, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 136, row: 12, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.3 },
    { col: 140, row: 18, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 152, row: 18, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 144, row: 22, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 148, row: 22, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 134, row: 24, key: TEXTURE.PROP_SPIKES, solid: true },
    { col: 158, row: 24, key: TEXTURE.PROP_SPIKES, solid: true },
    { col: 130, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 132, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 132, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 134, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 134, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 136, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 136, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 138, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 138, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 140, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 140, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 142, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 142, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 144, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 144, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 146, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 148, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 148, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 150, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 150, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 152, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 152, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 154, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 154, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 156, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 156, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 158, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 158, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 160, row: 50, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 160, row: 72, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 53, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 56, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 59, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 62, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 65, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 68, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 130, row: 71, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 136, row: 54, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.3 },
    { col: 154, row: 54, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.3 },
    { col: 140, row: 64, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 144, row: 64, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 152, row: 64, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 156, row: 64, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 142, row: 68, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 150, row: 68, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 134, row: 68, key: TEXTURE.PROP_SPIKES, solid: true },
    { col: 158, row: 68, key: TEXTURE.PROP_SPIKES, solid: true },
    { col: 162, row: 34, key: TEXTURE.PROP_SPIKES, solid: true },
    { col: 162, row: 48, key: TEXTURE.PROP_SPIKES, solid: true },
    { col: 172, row: 34, key: TEXTURE.PROP_SPIKES, solid: true },
    { col: 172, row: 48, key: TEXTURE.PROP_SPIKES, solid: true },
    { col: 172, row: 38, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 172, row: 44, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 194, row: 45, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 192, row: 48, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 190, row: 51, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 186, row: 52, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 182, row: 52, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 178, row: 51, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 176, row: 48, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 174, row: 45, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 174, row: 37, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 176, row: 34, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 178, row: 31, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 182, row: 30, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 186, row: 30, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 190, row: 31, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 192, row: 34, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 194, row: 37, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 180, row: 36, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 188, row: 36, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 180, row: 46, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 188, row: 46, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 190, row: 39, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 190, row: 43, key: TEXTURE.PROP_BARREL, solid: true },
  ];

  // 10. Torches for Crossroads, Fort Gates & Camps
  const torches = [
    { col: 10, row: 18 },
    { col: 18, row: 18 },
    { col: 10, row: 24 },
    { col: 18, row: 24 },
    { col: 32, row: 18 },
    { col: 24, row: 52 },
    { col: 24, row: 68 },
    { col: 38, row: 41 },
    { col: 56, row: 10 },
    { col: 76, row: 10 },
    { col: 56, row: 22 },
    { col: 76, row: 22 },
    { col: 66, row: 14 },
    { col: 66, row: 18 },
    { col: 54, row: 56 },
    { col: 78, row: 56 },
    { col: 54, row: 68 },
    { col: 78, row: 68 },
    { col: 90, row: 15 },
    { col: 102, row: 15 },
    { col: 91, row: 40 },
    { col: 101, row: 40 },
    { col: 117, row: 40 },
    { col: 127, row: 40 },
    { col: 108, row: 65 },
    { col: 120, row: 65 },
    { col: 104, row: 36 },
    { col: 116, row: 36 },
    { col: 104, row: 46 },
    { col: 116, row: 46 },
    { col: 132, row: 12 },
    { col: 158, row: 12 },
    { col: 132, row: 24 },
    { col: 158, row: 24 },
    { col: 132, row: 54 },
    { col: 158, row: 54 },
    { col: 132, row: 66 },
    { col: 158, row: 66 },
    { col: 164, row: 36 },
    { col: 164, row: 46 },
    { col: 170, row: 36 },
    { col: 170, row: 46 },
    { col: 174, row: 34 },
    { col: 174, row: 48 },
    { col: 184, row: 30 },
    { col: 184, row: 52 },
    { col: 194, row: 38 },
    { col: 194, row: 44 },
  ];

  // 11. Bonfires
  const bonfires = [
    { col: 14, row: 20 },
    { col: 66, row: 20 },
    { col: 110, row: 46 },
    { col: 146, row: 16 },
    { col: 146, row: 60 },
    { col: 176, row: 41 },
  ];

  // 12. Strategic Reward Chests
  const chests = [
    { col: 32, row: 14 },
    { col: 72, row: 16 },
    { col: 110, row: 41 },
    { col: 148, row: 60 },
  ];

  // 13. Elemental Shrines
  const shrines = [
    { col: 24, row: 60, kind: 'chance' as const },
    { col: 66, row: 62, kind: 'blood' as const },
    { col: 160, row: 41, kind: 'chance' as const },
  ];

  // 14. Supply Flasks
  const flasks = [
    { col: 42, row: 41, key: PROP.FLASK_RED },
    { col: 58, row: 62, key: PROP.FLASK_YELLOW },
    { col: 106, row: 38, key: PROP.FLASK_RED },
    { col: 114, row: 44, key: PROP.FLASK_YELLOW },
    { col: 154, row: 56, key: PROP.FLASK_RED },
  ];

  // 15. Thematic Enemies in Habitats
  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    { col: 20, row: 18, kind: 'wolf' },
    { col: 22, row: 16, kind: 'wolf' },
    { col: 26, row: 20, kind: 'wolf' },
    { col: 28, row: 18, kind: 'wolf' },
    { col: 30, row: 12, kind: 'wolf' },
    { col: 34, row: 12, kind: 'wolf' },
    { col: 36, row: 16, kind: 'wolf' },
    { col: 34, row: 18, kind: 'direwolf' },
    { col: 18, row: 56, kind: 'wolf' },
    { col: 22, row: 64, kind: 'wolf' },
    { col: 28, row: 62, kind: 'wolf' },
    { col: 22, row: 58, kind: 'direwolf' },
    { col: 60, row: 14, kind: 'skeleton' },
    { col: 64, row: 14, kind: 'skeleton' },
    { col: 70, row: 14, kind: 'skeleton' },
    { col: 74, row: 14, kind: 'skeleton' },
    { col: 60, row: 18, kind: 'skeleton' },
    { col: 64, row: 18, kind: 'skeleton' },
    { col: 70, row: 18, kind: 'skeleton' },
    { col: 74, row: 18, kind: 'skeleton' },
    { col: 42, row: 39, kind: 'skeleton' },
    { col: 44, row: 43, kind: 'skeleton' },
    { col: 60, row: 56, kind: 'skeleton' },
    { col: 64, row: 56, kind: 'skeleton' },
    { col: 72, row: 56, kind: 'skeleton' },
    { col: 76, row: 56, kind: 'skeleton' },
    { col: 60, row: 68, kind: 'skeleton' },
    { col: 72, row: 68, kind: 'skeleton' },
    { col: 88, row: 16, kind: 'wolf' },
    { col: 90, row: 20, kind: 'wolf' },
    { col: 88, row: 62, kind: 'skeleton' },
    { col: 90, row: 66, kind: 'skeleton' },
    { col: 106, row: 36, kind: 'wolf' },
    { col: 114, row: 36, kind: 'wolf' },
    { col: 108, row: 44, kind: 'direwolf' },
    { col: 106, row: 44, kind: 'skeleton' },
    { col: 114, row: 44, kind: 'skeleton' },
    { col: 126, row: 62, kind: 'wolf' },
    { col: 126, row: 20, kind: 'wolf' },
    { col: 138, row: 12, kind: 'orc_grunt' },
    { col: 142, row: 12, kind: 'orc_grunt' },
    { col: 150, row: 12, kind: 'orc_grunt' },
    { col: 154, row: 12, kind: 'orc_grunt' },
    { col: 138, row: 22, kind: 'orc_grunt' },
    { col: 142, row: 22, kind: 'orc_grunt' },
    { col: 150, row: 22, kind: 'orc_grunt' },
    { col: 154, row: 22, kind: 'orc_grunt' },
    { col: 134, row: 16, kind: 'orc_archer' },
    { col: 146, row: 8, kind: 'orc_archer' },
    { col: 158, row: 16, kind: 'orc_archer' },
    { col: 138, row: 56, kind: 'orc_grunt' },
    { col: 142, row: 56, kind: 'orc_grunt' },
    { col: 150, row: 56, kind: 'orc_grunt' },
    { col: 154, row: 56, kind: 'orc_grunt' },
    { col: 138, row: 66, kind: 'orc_grunt' },
    { col: 142, row: 66, kind: 'orc_grunt' },
    { col: 150, row: 66, kind: 'orc_grunt' },
    { col: 154, row: 66, kind: 'orc_grunt' },
    { col: 134, row: 60, kind: 'orc_archer' },
    { col: 146, row: 72, kind: 'orc_archer' },
    { col: 158, row: 60, kind: 'orc_archer' },
    { col: 162, row: 38, kind: 'orc_archer' },
    { col: 162, row: 44, kind: 'orc_archer' },
    { col: 168, row: 38, kind: 'orc_shield' },
    { col: 168, row: 44, kind: 'orc_shield' },
    { col: 172, row: 36, kind: 'orc_archer' },
    { col: 172, row: 46, kind: 'orc_archer' },
    { col: 176, row: 38, kind: 'orc_shield' },
    { col: 176, row: 44, kind: 'orc_shield' },
    { col: 178, row: 36, kind: 'orc_grunt' },
    { col: 178, row: 46, kind: 'orc_grunt' },
  ];

  return {
    biome,
    cols: COLS,
    rows: ROWS,
    data,
    spawn: { col: 14, row: 20 },
    bonfires,
    trees,
    torches,
    decorations,
    flasks,
    chests,
    shrines,
    altar: { col: 184, row: 41 },
    exit: { col: 194, row: 41 },
    enemies,
  };
}

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
    { col: 31, row: 17, key: PROP.FLASK_YELLOW },
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
  // Room doorways
  carveRect(binary, 12, 14, 4, 3, FLOOR);
  carveRect(binary, 42, 14, 4, 3, FLOOR);
  carveRect(binary, 12, 21, 4, 3, FLOOR);
  carveRect(binary, 42, 21, 4, 3, FLOOR);

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
    { col: 29, row: 19, key: PROP.FLASK_YELLOW },
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

  // Mine room doorways
  carveRect(binary, 16, 12, 5, 3, CANYON_DIRT);
  carveRect(binary, 40, 12, 5, 3, CANYON_DIRT);
  carveRect(binary, 16, 23, 5, 3, CANYON_DIRT);
  carveRect(binary, 40, 23, 5, 3, CANYON_DIRT);

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
    { col: 28, row: 18, key: PROP.FLASK_YELLOW },
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

  // Glacial room doorways
  carveRect(binary, 14, 12, 5, 3, SNOW);
  carveRect(binary, 42, 12, 5, 3, SNOW);
  carveRect(binary, 14, 23, 5, 3, SNOW);
  carveRect(binary, 42, 23, 5, 3, SNOW);

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
    { col: 19, row: 26, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 43, row: 5, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
    { col: 43, row: 26, key: TEXTURE.PROP_VOID_OBELISK, solid: true, scale: 1.1 },
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
    { col: 30, row: 18, key: PROP.FLASK_YELLOW },
    { col: 44, row: 18, key: PROP.FLASK_RED },
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

export function buildLevel1(depth = 1, ignoreBaked = false): LevelData {
  const biome = getBiomeForDepth(depth);
  if (biome.id === 'forest') {
    if (!ignoreBaked) {
      const baked = getBakedLevel1();
      if (baked) return baked;
    }
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
