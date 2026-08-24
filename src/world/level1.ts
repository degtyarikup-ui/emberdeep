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
  const binary: number[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(WALL));

  // 1. Organic outer mountain/forest boundary (multi-layered rugged rocks)
  for (let r = 0; r < ROWS; r++) {
    const leftMargin = 5 + (r >= 30 && r <= 60 ? 1 : 0);
    const rightMargin = 5 + (r >= 25 && r <= 55 ? 1 : 0);
    for (let c = leftMargin; c < COLS - rightMargin; c++) {
      binary[r][c] = FLOOR;
    }
  }
  for (let c = 0; c < COLS; c++) {
    const topMargin = 5 + (c >= 35 && c <= 75 ? 1 : 0);
    const botMargin = 5 + (c >= 30 && c <= 70 ? 1 : 0);
    for (let r = 0; r < topMargin; r++) binary[r][c] = WALL;
    for (let r = ROWS - botMargin; r < ROWS; r++) binary[r][c] = WALL;
  }

  // 2. Organic Mountain Rock Ridges separating distinct zones
  // Ridge 1: NW Ridge dividing Campsite & Sawmill (rows 4..24)
  for (let r = 4; r <= 24; r++) {
    const rc = Math.round(29 + Math.sin(r * 0.3) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }
  // Ridge 2: Central-West Ridge dividing Witch Glade & River (rows 36..56)
  for (let r = 36; r <= 56; r++) {
    const rc = Math.round(50 + Math.cos(r * 0.25) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }
  // Ridge 3: SW Necropolis Wall
  for (let r = 48; r < ROWS; r++) {
    for (let c = 0; c <= 12; c++) binary[r][c] = WALL;
  }
  for (let c = 13; c <= 44; c++) {
    for (let r = 80; r < ROWS; r++) binary[r][c] = WALL;
  }
  // Ridge 4: NE Mountain Crest above Bandit Outpost (rows 4..26)
  for (let r = 4; r <= 26; r++) {
    const rc = Math.round(86 + Math.sin(r * 0.25) * 2.0);
    for (let c = rc - 4; c <= rc + 4; c++) binary[r][c] = WALL;
  }
  // Ridge 5: East-Central Divide between Bandit Outpost and Altar Grove (rows 46..58)
  for (let r = 46; r <= 58; r++) {
    const rc = Math.round(102 + Math.cos(r * 0.3) * 1.5);
    for (let c = rc - 4; c <= rc + 4; c++) binary[r][c] = WALL;
  }
  // Ridge 6: SE Smuggler Ridge (rows 68..84)
  for (let r = 68; r <= 84; r++) {
    const rc = Math.round(77 + Math.sin(r * 0.3) * 1.5);
    for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WALL;
  }

  // 3. Smooth, continuous, meandering forest river & central secret island (cols 65..77, rows 42..54)
  for (let r = 0; r < ROWS; r++) {
    if (r <= 16) {
      const rc = Math.round(58 - r * 0.25);
      for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WATER_DEEP;
    } else if (r <= 26) {
      const rc = 54;
      for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WATER_DEEP;
    } else if (r <= 36) {
      const t = (r - 26) / 10.0;
      const wCenter = Math.round(54 + t * 16);
      const spread = Math.round(3 + t * 11);
      for (let c = wCenter - spread; c <= wCenter + spread; c++) binary[r][c] = WATER_DEEP;
    } else if (r <= 56) {
      for (let c = 54; c <= 62; c++) binary[r][c] = WATER_DEEP;
      for (let c = 80; c <= 88; c++) binary[r][c] = WATER_DEEP;
    } else if (r <= 66) {
      const t = (r - 56) / 10.0;
      const wCenter = Math.round(71 + t * 13);
      const spread = Math.round(14 - t * 11);
      for (let c = wCenter - spread; c <= wCenter + spread; c++) binary[r][c] = WATER_DEEP;
    } else if (r <= 76) {
      const rc = 84;
      for (let c = rc - 3; c <= rc + 3; c++) binary[r][c] = WATER_DEEP;
    } else {
      const rc = Math.round(84 + (r - 76) * 0.5);
      for (let c = rc - 3; c <= rc + 3; c++) {
        if (c < COLS - 5) binary[r][c] = WATER_DEEP;
      }
    }
  }

  // 4. Sturdy wooden bridges across the river (anchored on land on both sides)
  // North Bridge (rows 18-19, cols 49..58)
  for (let c = 49; c <= 58; c++) {
    binary[18][c] = BRIDGE_TOP;
    binary[19][c] = BRIDGE_BOT;
  }
  // West Island Bridge (rows 48-49, cols 52..64)
  for (let c = 52; c <= 64; c++) {
    binary[48][c] = BRIDGE_TOP;
    binary[49][c] = BRIDGE_BOT;
  }
  // East Island Bridge (rows 48-49, cols 78..90)
  for (let c = 78; c <= 90; c++) {
    binary[48][c] = BRIDGE_TOP;
    binary[49][c] = BRIDGE_BOT;
  }
  // South Bridge (rows 72-73, cols 79..89)
  for (let c = 79; c <= 89; c++) {
    binary[72][c] = BRIDGE_TOP;
    binary[73][c] = BRIDGE_BOT;
  }

  // 5. 10 Thematic Zone Clearings & POIs
  // 1. Campsite
  carveRoadH(binary, 10, 24, 20, 5);
  carveRoadV(binary, 14, 16, 26, 5);
  // 2. Sawmill
  carveRoadH(binary, 36, 50, 20, 5);
  carveRoadV(binary, 44, 12, 26, 5);
  // 3. River Docks
  carveRoadH(binary, 52, 62, 30, 4);
  // 4. Island
  carveRoadH(binary, 64, 78, 48, 5);
  carveRoadV(binary, 71, 42, 54, 5);
  // 5. Witch Glade
  carveRoadH(binary, 16, 28, 40, 5);
  carveRoadV(binary, 22, 36, 44, 5);
  // 6. Bandit Base
  carveRoadH(binary, 96, 122, 26, 7);
  carveRoadV(binary, 108, 16, 40, 7);
  // 7. Necropolis
  carveRoadH(binary, 20, 42, 66, 5);
  carveRoadV(binary, 32, 54, 76, 5);
  // 8. Smuggler Grotto
  carveRoadH(binary, 92, 102, 78, 5);
  // 9. Sunken Ruin
  carveRoadH(binary, 52, 64, 72, 5);
  carveRoadV(binary, 58, 66, 76, 5);
  // 10. Orc Warchief Arena («Бойцовский круг Орды»)
  // Carve circular combat ring around (112, 70) with radius 11
  for (let r = 58; r <= 82; r++) {
    for (let c = 100; c <= 124; c++) {
      const distSq = (c - 112) * (c - 112) + (r - 70) * (r - 70);
      if (distSq <= 121) {
        binary[r][c] = PATH;
      }
    }
  }
  // Arena West Gate path
  carveRoadH(binary, 90, 104, 70, 5);
  // Arena East Exit path
  carveRoadH(binary, 120, 126, 70, 3);

  // 6. Comprehensive 3-Tile Wide Road Network connecting all 10 POIs
  // Spawn -> Sawmill
  carveRoadH(binary, 14, 44, 20, 3);
  // Spawn -> Witch Glade
  carveRoadV(binary, 22, 20, 40, 3);
  // Witch Glade -> Necropolis
  carveRoadV(binary, 24, 40, 58, 3);
  // Sawmill -> River Docks
  carveRoadH(binary, 44, 54, 30, 3);
  // River Docks -> North Bridge
  carveRoadV(binary, 52, 19, 30, 3);
  // North Bridge -> Bandit Outpost
  carveRoadH(binary, 58, 96, 19, 3);
  carveRoadV(binary, 96, 19, 26, 3);
  // Trail to Island (West Bridge)
  carveRoadV(binary, 46, 20, 48, 3);
  carveRoadH(binary, 46, 52, 48, 3);
  // Trail from Island (East Bridge) -> Bandit Base / Altar
  carveRoadH(binary, 88, 96, 48, 3);
  carveRoadV(binary, 96, 48, 68, 3);
  // Bandit Outpost -> Altar Grove
  carveRoadV(binary, 110, 36, 68, 3);
  // Necropolis -> Sunken Ruin
  carveRoadH(binary, 36, 54, 72, 3);
  // Sunken Ruin -> South Bridge
  carveRoadH(binary, 54, 79, 72, 3);
  // South Bridge -> Smuggler Grotto
  carveRoadV(binary, 96, 72, 78, 3);
  // South Bridge -> Altar Grove
  carveRoadH(binary, 88, 110, 72, 3);

  // 7. Mountain Rock Cliff Autotiling & Vegetation Layer
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

  // 8. Rich Forest Trees (Dense forest canopy clusters framing zones, creating natural mazes and shortcuts)
  const trees: TreeObject[] = [
    // Zone 1: Campsite rim & western trail
    { col: 6, row: 12, kind: 'oak' }, { col: 12, row: 10, kind: 'pine' }, { col: 18, row: 10, kind: 'oak' },
    { col: 22, row: 10, kind: 'pine' }, { col: 6, row: 28, kind: 'pine' }, { col: 12, row: 30, kind: 'oak' },
    { col: 18, row: 30, kind: 'pine' }, { col: 24, row: 28, kind: 'oak' }, { col: 22, row: 14, kind: 'pine' },
    { col: 22, row: 28, kind: 'oak' }, { col: 16, row: 14, kind: 'pine' }, { col: 20, row: 12, kind: 'oak' },

    // Zone 2: Sawmill rim & timber woods
    { col: 36, row: 10, kind: 'pine' }, { col: 42, row: 8, kind: 'oak' }, { col: 50, row: 8, kind: 'pine' },
    { col: 48, row: 12, kind: 'oak' }, { col: 48, row: 24, kind: 'pine' }, { col: 34, row: 30, kind: 'oak' },
    { col: 42, row: 32, kind: 'pine' }, { col: 50, row: 32, kind: 'oak' }, { col: 38, row: 9, kind: 'pine' },
    { col: 46, row: 9, kind: 'oak' }, { col: 34, row: 20, kind: 'pine' }, { col: 50, row: 28, kind: 'oak' },

    // Zone 3: Riverbank groves & Docks
    { col: 50, row: 14, kind: 'pine' }, { col: 44, row: 40, kind: 'oak' }, { col: 44, row: 46, kind: 'pine' },
    { col: 44, row: 52, kind: 'oak' }, { col: 46, row: 34, kind: 'pine' }, { col: 64, row: 62, kind: 'oak' },
    { col: 94, row: 16, kind: 'oak' }, { col: 86, row: 34, kind: 'pine' }, { col: 90, row: 52, kind: 'oak' },
    { col: 90, row: 62, kind: 'pine' }, { col: 64, row: 12, kind: 'pine' }, { col: 62, row: 12, kind: 'oak' },
    { col: 88, row: 20, kind: 'pine' }, { col: 88, row: 30, kind: 'oak' }, { col: 90, row: 40, kind: 'pine' },

    // Zone 4: Secret Island trees
    { col: 68, row: 43, kind: 'oak' }, { col: 74, row: 43, kind: 'pine' },
    { col: 68, row: 53, kind: 'pine' }, { col: 74, row: 53, kind: 'oak' },
    { col: 66, row: 46, kind: 'oak' }, { col: 76, row: 46, kind: 'pine' },

    // Zone 5: Witch Glade cluster & southern thickets
    { col: 12, row: 34, kind: 'pine' }, { col: 12, row: 44, kind: 'oak' }, { col: 28, row: 34, kind: 'oak' },
    { col: 28, row: 44, kind: 'pine' }, { col: 18, row: 48, kind: 'oak' }, { col: 14, row: 40, kind: 'pine' },
    { col: 26, row: 46, kind: 'oak' }, { col: 20, row: 50, kind: 'pine' }, { col: 14, row: 46, kind: 'oak' },

    // Zone 6: Bandit Outpost buffer & eastern woods
    { col: 92, row: 14, kind: 'pine' }, { col: 92, row: 20, kind: 'oak' }, { col: 92, row: 36, kind: 'pine' },
    { col: 92, row: 44, kind: 'oak' }, { col: 124, row: 14, kind: 'pine' }, { col: 124, row: 38, kind: 'oak' },
    { col: 124, row: 46, kind: 'pine' }, { col: 104, row: 12, kind: 'oak' }, { col: 116, row: 12, kind: 'pine' },
    { col: 98, row: 10, kind: 'pine' }, { col: 120, row: 10, kind: 'oak' }, { col: 126, row: 26, kind: 'pine' },

    // Zone 7: Necropolis haunted grove
    { col: 16, row: 50, kind: 'oak' }, { col: 24, row: 50, kind: 'pine' }, { col: 32, row: 50, kind: 'oak' },
    { col: 40, row: 50, kind: 'pine' }, { col: 46, row: 54, kind: 'oak' }, { col: 46, row: 64, kind: 'pine' },
    { col: 46, row: 74, kind: 'oak' }, { col: 16, row: 76, kind: 'pine' }, { col: 24, row: 76, kind: 'oak' },
    { col: 32, row: 76, kind: 'pine' }, { col: 40, row: 76, kind: 'oak' }, { col: 18, row: 60, kind: 'pine' },
    { col: 44, row: 60, kind: 'oak' }, { col: 18, row: 70, kind: 'pine' }, { col: 44, row: 74, kind: 'oak' },

    // Zone 8 & 9: Sunken Ruin & Smuggler Grotto buffer
    { col: 48, row: 64, kind: 'pine' }, { col: 48, row: 78, kind: 'oak' }, { col: 68, row: 66, kind: 'pine' },
    { col: 68, row: 78, kind: 'oak' }, { col: 74, row: 70, kind: 'pine' }, { col: 92, row: 82, kind: 'oak' },
    { col: 50, row: 60, kind: 'pine' }, { col: 64, row: 60, kind: 'oak' }, { col: 88, row: 76, kind: 'pine' },
    { col: 104, row: 82, kind: 'oak' }, { col: 90, row: 80, kind: 'pine' },

    // Zone 10: Orc Arena outer perimeter trees
    { col: 96, row: 60, kind: 'pine' }, { col: 96, row: 74, kind: 'oak' },
    { col: 98, row: 64, kind: 'pine' }, { col: 98, row: 82, kind: 'oak' },
    { col: 106, row: 54, kind: 'pine' }, { col: 118, row: 54, kind: 'oak' },
    { col: 106, row: 84, kind: 'pine' }, { col: 118, row: 84, kind: 'oak' },
    { col: 126, row: 60, kind: 'pine' }, { col: 126, row: 68, kind: 'oak' },
    { col: 126, row: 74, kind: 'pine' }, { col: 126, row: 80, kind: 'oak' },
  ];

  // 9. Rich Decorations, Destructible Obstacles & Trap Props
  const decorations: DecorationObject[] = [
    // Zone 1: Ashen Campsite (Spawn)
    { col: 10, row: 24, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 12, row: 16, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 11, row: 18, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 16, row: 24, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 16, row: 16, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 12, row: 22, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 8, row: 18, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 8, row: 20, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 18, row: 24, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 20, row: 24, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 14, row: 24, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 22, row: 16, key: TEXTURE.PROP_ROCK, solid: true },

    // Zone 2: Lumberjack Sawmill (Timber barricades & storage yard)
    { col: 38, row: 14, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 48, row: 14, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.2 },
    { col: 42, row: 18, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 46, row: 22, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 40, row: 16, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 42, row: 16, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 50, row: 16, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 44, row: 26, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 35, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 50, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 36, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 50, row: 22, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 50, row: 24, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 34, row: 24, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 34, row: 26, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 50, row: 26, key: TEXTURE.PROP_BUSH, solid: false },

    // Zone 3: River Fisherman's Docks & Rapids
    { col: 48, row: 26, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 46, row: 28, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 48, row: 28, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 50, row: 26, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 46, row: 22, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 48, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 60, row: 22, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 52, row: 34, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 50, row: 34, key: TEXTURE.PROP_REEDS, solid: false },

    // Zone 4: Secret Island of Mists
    { col: 68, row: 45, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 74, row: 45, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 67, row: 51, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 75, row: 51, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 70, row: 44, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 72, row: 52, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 69, row: 47, key: TEXTURE.PROP_ROCK, solid: true },

    // Zone 5: Witch's Herbal Glade
    { col: 20, row: 36, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 24, row: 36, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 18, row: 42, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 26, row: 42, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 16, row: 38, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 28, row: 38, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 20, row: 44, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 16, row: 44, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 28, row: 46, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },

    // Zone 6: Forgotten Bandit Outpost & Palisade Fortress
    { col: 96, row: 18, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.3 },
    { col: 116, row: 18, key: TEXTURE.PROP_CABIN, solid: true, scale: 1.3 },
    { col: 100, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 102, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 110, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 112, row: 16, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 96, row: 32, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 122, row: 32, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 104, row: 22, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 106, row: 22, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 108, row: 22, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 114, row: 24, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 120, row: 28, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 100, row: 34, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 116, row: 34, key: TEXTURE.PROP_WORKBENCH, solid: true },
    { col: 122, row: 22, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 108, row: 36, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 114, row: 36, key: TEXTURE.PROP_FENCE, solid: true },
    // Bandit Outpost Floor Spike Traps (Tactical Bottlenecks)
    { col: 98, row: 20, key: TEXTURE.PROP_SPIKES, solid: false },
    { col: 98, row: 32, key: TEXTURE.PROP_SPIKES, solid: false },

    // Zone 7: Druidic Necropolis & Mausoleum
    { col: 20, row: 56, key: PROP.TOMBSTONE, solid: false },
    { col: 24, row: 56, key: PROP.TOMBSTONE, solid: false },
    { col: 28, row: 56, key: PROP.TOMBSTONE, solid: false },
    { col: 36, row: 56, key: PROP.TOMBSTONE, solid: false },
    { col: 40, row: 56, key: PROP.TOMBSTONE, solid: false },
    { col: 20, row: 62, key: PROP.TOMBSTONE, solid: false },
    { col: 40, row: 62, key: PROP.TOMBSTONE, solid: false },
    { col: 20, row: 70, key: PROP.TOMBSTONE, solid: false },
    { col: 28, row: 70, key: PROP.TOMBSTONE, solid: false },
    { col: 36, row: 70, key: PROP.TOMBSTONE, solid: false },
    { col: 40, row: 70, key: PROP.TOMBSTONE, solid: false },
    { col: 28, row: 60, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 34, row: 60, key: TEXTURE.PROP_PRISON_BARS, solid: true },
    { col: 30, row: 64, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 22, row: 76, key: PROP.TOMBSTONE, solid: false },
    { col: 38, row: 76, key: PROP.TOMBSTONE, solid: false },
    { col: 26, row: 78, key: TEXTURE.PROP_MUSHROOM_GIANT, solid: false },
    { col: 34, row: 78, key: TEXTURE.PROP_LUPINE, solid: false },
    // Necropolis Floor Spike Traps (Crypt Threshold)
    { col: 30, row: 58, key: TEXTURE.PROP_SPIKES, solid: false },
    { col: 34, row: 58, key: TEXTURE.PROP_SPIKES, solid: false },

    // Zone 8: Smuggler's Hidden Grotto
    { col: 94, row: 76, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 100, row: 76, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 94, row: 80, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 96, row: 80, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 98, row: 80, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 100, row: 80, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 92, row: 80, key: TEXTURE.PROP_BUSH, solid: false },

    // Zone 9: Ancient Sunken Ruin & Angel Sanctuary
    { col: 58, row: 68, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 52, row: 70, key: TEXTURE.PROP_ROCK_LARGE, solid: true },
    { col: 64, row: 70, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 54, row: 76, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 62, row: 76, key: TEXTURE.PROP_LUPINE, solid: false },
    { col: 58, row: 78, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 50, row: 72, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 66, row: 72, key: TEXTURE.PROP_ROCK, solid: true },

    // Zone 10: Orc Warchief Arena («Бойцовский круг Орды»)
    // Palisade Ring enclosing the arena
    // Top Arc
    { col: 108, row: 61, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 110, row: 60, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 112, row: 60, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 114, row: 60, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 116, row: 61, key: TEXTURE.PROP_FENCE, solid: true },
    // Top-Right & Right Arc
    { col: 118, row: 62, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 120, row: 64, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 121, row: 67, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 121, row: 73, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 120, row: 76, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 118, row: 78, key: TEXTURE.PROP_FENCE, solid: true },
    // Bottom Arc
    { col: 116, row: 79, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 114, row: 80, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 112, row: 80, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 110, row: 80, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 108, row: 79, key: TEXTURE.PROP_FENCE, solid: true },
    // Bottom-Left & Left Arc
    { col: 106, row: 78, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 104, row: 76, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 103, row: 73, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 103, row: 67, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 104, row: 64, key: TEXTURE.PROP_FENCE, solid: true },
    { col: 106, row: 62, key: TEXTURE.PROP_FENCE, solid: true },
    // Arena West Gate Totems & Entrance
    { col: 102, row: 67, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 102, row: 73, key: TEXTURE.PROP_STATUE, solid: true },
    // Arena East Exit Gate Totems
    { col: 122, row: 67, key: TEXTURE.PROP_STATUE, solid: true },
    { col: 122, row: 73, key: TEXTURE.PROP_STATUE, solid: true },
    // Battle Arena ground bloodstains
    { col: 109, row: 68, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },
    { col: 115, row: 72, key: TEXTURE.PROP_BLOOD_SPILL, solid: false },

    // Roadside Props, Bridge Obstacles & Spike Traps
    { col: 25, row: 22, key: TEXTURE.PROP_ROCK, solid: true },
    { col: 44, row: 48, key: TEXTURE.PROP_CRATE, solid: true },
    { col: 91, row: 48, key: TEXTURE.PROP_BARREL, solid: true },
    { col: 88, row: 68, key: TEXTURE.PROP_BUSH, solid: false },
    { col: 78, row: 72, key: TEXTURE.PROP_REEDS, solid: false },
    { col: 92, row: 72, key: TEXTURE.PROP_REEDS, solid: false },
    // South Approach Spike Traps
    { col: 76, row: 72, key: TEXTURE.PROP_SPIKES, solid: false },
    { col: 90, row: 72, key: TEXTURE.PROP_SPIKES, solid: false },
  ];

  // 10. Atmospheric Torches
  const torches = [
    // Campsite
    { col: 8, row: 14 }, { col: 24, row: 14 }, { col: 8, row: 28 }, { col: 24, row: 28 },
    // Sawmill
    { col: 34, row: 10 }, { col: 52, row: 10 }, { col: 34, row: 28 }, { col: 52, row: 28 },
    // River Docks & North Bridge
    { col: 49, row: 18 }, { col: 58, row: 18 }, { col: 48, row: 24 },
    // Secret Island
    { col: 66, row: 44 }, { col: 76, row: 44 }, { col: 66, row: 52 }, { col: 76, row: 52 },
    // Witch Glade
    { col: 16, row: 34 }, { col: 28, row: 34 },
    // Bandit Outpost
    { col: 94, row: 14 }, { col: 122, row: 14 }, { col: 94, row: 42 }, { col: 122, row: 42 },
    // Necropolis
    { col: 18, row: 54 }, { col: 44, row: 54 }, { col: 18, row: 80 }, { col: 44, row: 80 },
    // Smuggler Grotto & Sunken Ruin
    { col: 92, row: 74 }, { col: 102, row: 74 }, { col: 52, row: 64 }, { col: 64, row: 64 },
    // South Bridge
    { col: 79, row: 72 }, { col: 89, row: 72 },
    // Orc Arena Gate & Perimeter Torches
    { col: 101, row: 68 }, { col: 101, row: 72 }, // West Gate
    { col: 123, row: 68 }, { col: 123, row: 72 }, // East Exit Gate
    { col: 106, row: 64 }, { col: 118, row: 64 }, // North Corners
    { col: 106, row: 76 }, { col: 118, row: 76 }, // South Corners
    { col: 112, row: 61 }, { col: 112, row: 79 }, // North & South Apex
    { col: 104, row: 70 }, { col: 120, row: 70 }, // West & East Mid Flanks
  ];

  // 11. Bonfires
  const bonfires = [
    { col: 14, row: 20 },  // Zone 1: Campsite
    { col: 44, row: 20 },  // Zone 2: Sawmill
    { col: 108, row: 28 }, // Zone 6: Bandit Outpost
    { col: 32, row: 64 },  // Zone 7: Necropolis
    { col: 58, row: 74 },  // Zone 9: Sunken Ruin
    { col: 108, row: 66 }, // Zone 10: Orc Arena North-West Ritual Fire
    { col: 116, row: 66 }, // Zone 10: Orc Arena North-East Ritual Fire
    { col: 108, row: 74 }, // Zone 10: Orc Arena South-West Ritual Fire
    { col: 116, row: 74 }, // Zone 10: Orc Arena South-East Ritual Fire
  ];

  // 12. Strategic Chests
  const chests = [
    { col: 48, row: 24 },  // Zone 2: Sawmill Stash
    { col: 71, row: 48 },  // Zone 4: Secret Island Relic
    { col: 118, row: 24 }, // Zone 6: Bandit Stronghold Hoard
    { col: 24, row: 74 },  // Zone 7: Necropolis Crypt
    { col: 98, row: 78 },  // Zone 8: Smuggler Grotto Cache
  ];

  // 13. Shrines
  const shrines = [
    { col: 38, row: 24, kind: 'chance' as const }, // Zone 2: Fortune Shrine
    { col: 32, row: 66, kind: 'blood' as const },  // Zone 7: Blood Shrine
    { col: 58, row: 72, kind: 'chance' as const }, // Zone 9: Sunken Ruin Angel Shrine
  ];

  // 14. Supply Flasks
  const flasks = [
    { col: 18, row: 18, key: PROP.FLASK_RED },  // Zone 1: Campsite HP Flask
    { col: 48, row: 30, key: PROP.FLASK_BLUE }, // Zone 3: River Docks Mana Flask
    { col: 22, row: 40, key: PROP.FLASK_RED },  // Zone 5: Witch Glade Elixir
    { col: 104, row: 36, key: PROP.FLASK_BLUE }, // Zone 6: Bandit Outpost Mana Flask
  ];

  // 15. Tactical Enemies (65+ enemies in dense tactical squads and wolf packs across 10 POIs)
  const enemies: { col: number; row: number; kind: EnemyKind }[] = [
    // Zone 1 -> Zone 2 Trail: Roaming Wolf Pack (4)
    { col: 20, row: 18, kind: 'wolf' }, { col: 24, row: 22, kind: 'wolf' },
    { col: 22, row: 20, kind: 'wolf' }, { col: 28, row: 20, kind: 'wolf' },

    // Zone 2: Sawmill (4 orc grunts + 3 wolves + 2 skeletons)
    { col: 38, row: 18, kind: 'orc_grunt' }, { col: 46, row: 18, kind: 'orc_grunt' },
    { col: 36, row: 24, kind: 'orc_grunt' }, { col: 44, row: 22, kind: 'orc_grunt' },
    { col: 40, row: 26, kind: 'wolf' }, { col: 42, row: 26, kind: 'wolf' }, { col: 44, row: 28, kind: 'wolf' },
    { col: 48, row: 24, kind: 'skeleton' }, { col: 50, row: 20, kind: 'skeleton' },

    // Zone 3: River Docks & North Bridge (3 skeletons + 3 wolves)
    { col: 46, row: 24, kind: 'skeleton' }, { col: 50, row: 32, kind: 'skeleton' }, { col: 52, row: 28, kind: 'skeleton' },
    { col: 48, row: 20, kind: 'wolf' }, { col: 54, row: 18, kind: 'wolf' }, { col: 62, row: 19, kind: 'wolf' },

    // Zone 4: Secret Island (3 champions: 2 skeletons + 1 orc grunt)
    { col: 69, row: 49, kind: 'skeleton' }, { col: 73, row: 49, kind: 'orc_grunt' }, { col: 71, row: 51, kind: 'skeleton' },

    // Zone 5: Witch Glade (4 orc grunts + 2 wolves)
    { col: 18, row: 38, kind: 'orc_grunt' }, { col: 24, row: 38, kind: 'orc_grunt' },
    { col: 22, row: 44, kind: 'orc_grunt' }, { col: 20, row: 46, kind: 'orc_grunt' },
    { col: 16, row: 42, kind: 'wolf' }, { col: 26, row: 44, kind: 'wolf' },

    // Zone 6: Bandit Outpost (14 fortress defenders: 7 orc grunts + 7 skeletons)
    { col: 100, row: 22, kind: 'orc_grunt' }, { col: 112, row: 22, kind: 'skeleton' },
    { col: 106, row: 26, kind: 'orc_grunt' }, { col: 114, row: 26, kind: 'skeleton' },
    { col: 102, row: 30, kind: 'skeleton' }, { col: 110, row: 30, kind: 'orc_grunt' },
    { col: 118, row: 30, kind: 'orc_grunt' }, { col: 104, row: 36, kind: 'skeleton' },
    { col: 112, row: 36, kind: 'skeleton' }, { col: 118, row: 36, kind: 'orc_grunt' },
    { col: 98, row: 26, kind: 'orc_grunt' }, { col: 108, row: 20, kind: 'orc_grunt' },
    { col: 120, row: 24, kind: 'skeleton' }, { col: 116, row: 32, kind: 'skeleton' },

    // Zone 7: Necropolis (8 crypt skeletons + 3 wolves)
    { col: 24, row: 60, kind: 'skeleton' }, { col: 36, row: 60, kind: 'skeleton' },
    { col: 26, row: 66, kind: 'skeleton' }, { col: 38, row: 66, kind: 'skeleton' },
    { col: 28, row: 74, kind: 'skeleton' }, { col: 36, row: 74, kind: 'skeleton' },
    { col: 32, row: 62, kind: 'skeleton' }, { col: 32, row: 72, kind: 'skeleton' },
    { col: 20, row: 66, kind: 'wolf' }, { col: 44, row: 68, kind: 'wolf' }, { col: 22, row: 72, kind: 'wolf' },

    // Zone 8: Smuggler Grotto (4 orc grunts)
    { col: 94, row: 78, kind: 'orc_grunt' }, { col: 96, row: 76, kind: 'orc_grunt' },
    { col: 100, row: 78, kind: 'orc_grunt' }, { col: 98, row: 78, kind: 'orc_grunt' },

    // Zone 9: Sunken Ruin (5 skeletons + 2 wolves)
    { col: 54, row: 68, kind: 'skeleton' }, { col: 62, row: 68, kind: 'skeleton' },
    { col: 54, row: 76, kind: 'skeleton' }, { col: 62, row: 76, kind: 'skeleton' },
    { col: 58, row: 74, kind: 'skeleton' }, { col: 50, row: 74, kind: 'wolf' }, { col: 64, row: 74, kind: 'wolf' },

    // Zone 10: Outer Approaches & Sentry Posts around Orc Arena (13 relocated enemies)
    // 1. West Gate Outpost / Entrance Guard (3)
    { col: 98, row: 68, kind: 'skeleton' },
    { col: 98, row: 72, kind: 'skeleton' },
    { col: 96, row: 70, kind: 'orc_grunt' },

    // 2. North Trail from Bandit Outpost (4)
    { col: 108, row: 44, kind: 'wolf' },
    { col: 112, row: 46, kind: 'wolf' },
    { col: 110, row: 48, kind: 'skeleton' },
    { col: 112, row: 52, kind: 'skeleton' },

    // 3. South Approach from Bridge & Grotto (4)
    { col: 90, row: 74, kind: 'wolf' },
    { col: 94, row: 72, kind: 'wolf' },
    { col: 92, row: 76, kind: 'orc_grunt' },
    { col: 96, row: 78, kind: 'orc_grunt' },

    // 4. North-East Ridge Sentry (2)
    { col: 122, row: 50, kind: 'orc_grunt' },
    { col: 124, row: 54, kind: 'skeleton' },
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
