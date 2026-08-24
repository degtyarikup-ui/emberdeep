import { TILE_INDEX } from '../gfx/tileIndex';

export type SmartBrushFamily = 'path' | 'water' | 'cobble' | 'cliff' | 'wall';

export interface SmartBrushDef {
  id: string;
  name: string;
  family: SmartBrushFamily;
  previewTileId: number;
  description: string;
}

export const SMART_BRUSHES: SmartBrushDef[] = [
  {
    id: 'smart_path',
    name: 'Умная тропа / Дорожка',
    family: 'path',
    previewTileId: TILE_INDEX.PATH_TL,
    description: 'Автоматически стыкует границы, внешние и внутренние углы дорожки на траве.',
  },
  {
    id: 'smart_water',
    name: 'Умная река / Берега',
    family: 'water',
    previewTileId: TILE_INDEX.WATER_SHORE_TL,
    description: 'Автоматически формирует изгибы берегов и глубокую воду.',
  },
  {
    id: 'smart_cobble',
    name: 'Умная площадь / Камень',
    family: 'cobble',
    previewTileId: TILE_INDEX.COBBLE_TL,
    description: 'Автоматически укладывает ровные каменные бордюры и углы.',
  },
  {
    id: 'smart_cliff',
    name: 'Умные скалы / Горы',
    family: 'cliff',
    previewTileId: TILE_INDEX.CLIFF_TOP_TL,
    description: 'Автоматически выстраивает скальные вершины, стены и подножия.',
  },
  {
    id: 'smart_wall',
    name: 'Умные стены подземелья',
    family: 'wall',
    previewTileId: TILE_INDEX.WALL_DUNGEON,
    description: 'Автоматически стыкует углы и боковые срезы каменных стен.',
  },
];

const PATH_TILES = new Set<number>([
  TILE_INDEX.PATH_T,
  TILE_INDEX.PATH_B,
  TILE_INDEX.PATH_L,
  TILE_INDEX.PATH_R,
  TILE_INDEX.PATH_TL,
  TILE_INDEX.PATH_TR,
  TILE_INDEX.PATH_BL,
  TILE_INDEX.PATH_BR,
  TILE_INDEX.PATH_INNER_TL,
  TILE_INDEX.PATH_INNER_TR,
  TILE_INDEX.PATH_INNER_BL,
  TILE_INDEX.PATH_INNER_BR,
  TILE_INDEX.DIRT_1,
  TILE_INDEX.DIRT_2,
]);

const WATER_TILES = new Set<number>([
  TILE_INDEX.WATER_SHORE_T,
  TILE_INDEX.WATER_SHORE_B,
  TILE_INDEX.WATER_SHORE_L,
  TILE_INDEX.WATER_SHORE_R,
  TILE_INDEX.WATER_SHORE_TL,
  TILE_INDEX.WATER_SHORE_TR,
  TILE_INDEX.WATER_SHORE_BL,
  TILE_INDEX.WATER_SHORE_BR,
  TILE_INDEX.WATER_DEEP,
  TILE_INDEX.WOOD_BRIDGE,
  TILE_INDEX.WOOD_BRIDGE_BOT,
]);

const COBBLE_TILES = new Set<number>([
  TILE_INDEX.COBBLE_T,
  TILE_INDEX.COBBLE_B,
  TILE_INDEX.COBBLE_L,
  TILE_INDEX.COBBLE_R,
  TILE_INDEX.COBBLE_TL,
  TILE_INDEX.COBBLE_TR,
  TILE_INDEX.COBBLE_BL,
  TILE_INDEX.COBBLE_BR,
  TILE_INDEX.COBBLE_INNER_TL,
  TILE_INDEX.COBBLE_INNER_TR,
  TILE_INDEX.COBBLE_INNER_BL,
  TILE_INDEX.COBBLE_INNER_BR,
  TILE_INDEX.RUIN_STONE,
]);

const CLIFF_TILES = new Set<number>([
  TILE_INDEX.CLIFF_TOP_TL,
  TILE_INDEX.CLIFF_TOP_TM,
  TILE_INDEX.CLIFF_TOP_TR,
  TILE_INDEX.CLIFF_MID_L,
  TILE_INDEX.CLIFF_MID_M,
  TILE_INDEX.CLIFF_MID_R,
  TILE_INDEX.CLIFF_BOT_BL,
  TILE_INDEX.CLIFF_BOT_BM,
  TILE_INDEX.CLIFF_BOT_BR,
  TILE_INDEX.CLIFF_FACE,
  TILE_INDEX.CLIFF_INNER_TL,
  TILE_INDEX.CLIFF_INNER_TR,
]);

const WALL_TILES = new Set<number>([
  TILE_INDEX.WALL_DUNGEON,
  TILE_INDEX.WALL_RUIN,
  TILE_INDEX.WALL_CANYON,
  TILE_INDEX.WALL_GLACIAL,
  TILE_INDEX.WALL_SIDE_L,
  TILE_INDEX.WALL_SIDE_R,
  TILE_INDEX.WALL_CORNER_TL,
  TILE_INDEX.WALL_CORNER_TR,
  TILE_INDEX.WALL_CORNER_BL,
  TILE_INDEX.WALL_CORNER_BR,
  TILE_INDEX.WALL_END_BL,
  TILE_INDEX.WALL_END_BR,
]);

export function isTileInFamily(tileId: number, family: SmartBrushFamily): boolean {
  switch (family) {
    case 'path':
      return PATH_TILES.has(tileId);
    case 'water':
      return WATER_TILES.has(tileId);
    case 'cobble':
      return COBBLE_TILES.has(tileId);
    case 'cliff':
      return CLIFF_TILES.has(tileId);
    case 'wall':
      return WALL_TILES.has(tileId);
  }
}

export function getFamilyForTile(tileId: number): SmartBrushFamily | null {
  if (PATH_TILES.has(tileId)) return 'path';
  if (WATER_TILES.has(tileId)) return 'water';
  if (COBBLE_TILES.has(tileId)) return 'cobble';
  if (CLIFF_TILES.has(tileId)) return 'cliff';
  if (WALL_TILES.has(tileId)) return 'wall';
  return null;
}

export function getBaseTileForFamily(family: SmartBrushFamily): number {
  switch (family) {
    case 'path':
      return TILE_INDEX.DIRT_1;
    case 'water':
      return TILE_INDEX.WATER_DEEP;
    case 'cobble':
      return TILE_INDEX.RUIN_STONE;
    case 'cliff':
      return TILE_INDEX.CLIFF_MID_M;
    case 'wall':
      return TILE_INDEX.WALL_DUNGEON;
  }
}

export function calculateAutotileCell(grid: number[][], r: number, c: number, family: SmartBrushFamily): number {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  const isMatch = (nr: number, nc: number): boolean => {
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return true; // match map bounds
    const tileVal = grid[nr]?.[nc];
    if (tileVal === undefined) return true;
    return isTileInFamily(tileVal, family);
  };

  const T = isMatch(r - 1, c);
  const B = isMatch(r + 1, c);
  const L = isMatch(r, c - 1);
  const R = isMatch(r, c + 1);

  const TL = isMatch(r - 1, c - 1);
  const TR = isMatch(r - 1, c + 1);
  const BL = isMatch(r + 1, c - 1);
  const BR = isMatch(r + 1, c + 1);

  switch (family) {
    case 'path': {
      // 1. Outer 4 Corners
      if (!T && !L) return TILE_INDEX.PATH_TL;
      if (!T && !R) return TILE_INDEX.PATH_TR;
      if (!B && !L) return TILE_INDEX.PATH_BL;
      if (!B && !R) return TILE_INDEX.PATH_BR;

      // 2. Straight Borders
      if (!T) return TILE_INDEX.PATH_T;
      if (!B) return TILE_INDEX.PATH_B;
      if (!L) return TILE_INDEX.PATH_L;
      if (!R) return TILE_INDEX.PATH_R;

      // 3. Inner Corners (when adjacent orthogonals are path, but diagonal corner is grass)
      if (T && L && !TL) return TILE_INDEX.PATH_INNER_TL;
      if (T && R && !TR) return TILE_INDEX.PATH_INNER_TR;
      if (B && L && !BL) return TILE_INDEX.PATH_INNER_BL;
      if (B && R && !BR) return TILE_INDEX.PATH_INNER_BR;

      return TILE_INDEX.DIRT_1;
    }

    case 'water': {
      // 1. Outer 4 Corners
      if (!T && !L) return TILE_INDEX.WATER_SHORE_TL;
      if (!T && !R) return TILE_INDEX.WATER_SHORE_TR;
      if (!B && !L) return TILE_INDEX.WATER_SHORE_BL;
      if (!B && !R) return TILE_INDEX.WATER_SHORE_BR;

      // 2. Straight Borders
      if (!T) return TILE_INDEX.WATER_SHORE_T;
      if (!B) return TILE_INDEX.WATER_SHORE_B;
      if (!L) return TILE_INDEX.WATER_SHORE_L;
      if (!R) return TILE_INDEX.WATER_SHORE_R;

      // 3. Inner Shore Corners
      if (T && L && !TL) return TILE_INDEX.WATER_SHORE_TL;
      if (T && R && !TR) return TILE_INDEX.WATER_SHORE_TR;
      if (B && L && !BL) return TILE_INDEX.WATER_SHORE_BL;
      if (B && R && !BR) return TILE_INDEX.WATER_SHORE_BR;

      return TILE_INDEX.WATER_DEEP;
    }

    case 'cobble': {
      // 1. Outer 4 Corners
      if (!T && !L) return TILE_INDEX.COBBLE_TL;
      if (!T && !R) return TILE_INDEX.COBBLE_TR;
      if (!B && !L) return TILE_INDEX.COBBLE_BL;
      if (!B && !R) return TILE_INDEX.COBBLE_BR;

      // 2. Straight Borders
      if (!T) return TILE_INDEX.COBBLE_T;
      if (!B) return TILE_INDEX.COBBLE_B;
      if (!L) return TILE_INDEX.COBBLE_L;
      if (!R) return TILE_INDEX.COBBLE_R;

      // 3. Inner Corners
      if (T && L && !TL) return TILE_INDEX.COBBLE_INNER_TL;
      if (T && R && !TR) return TILE_INDEX.COBBLE_INNER_TR;
      if (B && L && !BL) return TILE_INDEX.COBBLE_INNER_BL;
      if (B && R && !BR) return TILE_INDEX.COBBLE_INNER_BR;

      return TILE_INDEX.RUIN_STONE;
    }

    case 'cliff': {
      if (!T && !L) return TILE_INDEX.CLIFF_TOP_TL;
      if (!T && !R) return TILE_INDEX.CLIFF_TOP_TR;
      if (!T) return TILE_INDEX.CLIFF_TOP_TM;

      if (!B && !L) return TILE_INDEX.CLIFF_BOT_BL;
      if (!B && !R) return TILE_INDEX.CLIFF_BOT_BR;
      if (!B) return TILE_INDEX.CLIFF_BOT_BM;

      if (!L) return TILE_INDEX.CLIFF_MID_L;
      if (!R) return TILE_INDEX.CLIFF_MID_R;

      if (T && L && !TL) return TILE_INDEX.CLIFF_INNER_TL;
      if (T && R && !TR) return TILE_INDEX.CLIFF_INNER_TR;

      return TILE_INDEX.CLIFF_MID_M;
    }

    case 'wall': {
      if (!T && !L) return TILE_INDEX.WALL_CORNER_TL;
      if (!T && !R) return TILE_INDEX.WALL_CORNER_TR;
      if (!B && !L) return TILE_INDEX.WALL_CORNER_BL;
      if (!B && !R) return TILE_INDEX.WALL_CORNER_BR;

      if (!L) return TILE_INDEX.WALL_SIDE_L;
      if (!R) return TILE_INDEX.WALL_SIDE_R;

      return TILE_INDEX.WALL_DUNGEON;
    }
  }
}

/**
 * Recalculates autotiling in the neighborhood of (centerR, centerC).
 * Modifies the grid in-place and returns the list of updated cells.
 */
export function autotileNeighborhood(
  grid: number[][],
  centerR: number,
  centerC: number,
  radius = 2
): Array<{ row: number; col: number; val: number }> {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const updates: Array<{ row: number; col: number; val: number }> = [];

  const minR = Math.max(0, centerR - radius);
  const maxR = Math.min(rows - 1, centerR + radius);
  const minC = Math.max(0, centerC - radius);
  const maxC = Math.min(cols - 1, centerC + radius);

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const currentVal = grid[r][c];
      const family = getFamilyForTile(currentVal);
      if (family) {
        const newVal = calculateAutotileCell(grid, r, c, family);
        if (newVal !== currentVal) {
          grid[r][c] = newVal;
          updates.push({ row: r, col: c, val: newVal });
        }
      }
    }
  }

  return updates;
}
