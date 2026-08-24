import { describe, it, expect } from 'vitest';
import {
  validateLevelData,
  exportLevelToTypeScript,
  exportLevelToPresetTypeScript,
  createEmptyLevel,
  serializeLevelToJson,
  deserializeLevelFromJson,
  EDITOR_TILE,
  rotateBrushMatrixClockwise,
  applyBrushShapeMask,
} from '../src/admin/mapEditorHelper';
import { buildLevel1 } from '../src/world/level1';
import { getBakedLevel1, hasBakedLevel1 } from '../src/world/customLevelPreset';

describe('mapEditorHelper: createEmptyLevel', () => {
  it('creates an empty level for forest biome with proper border walls', () => {
    const level = createEmptyLevel('forest', 30, 20);
    expect(level.cols).toBe(30);
    expect(level.rows).toBe(20);
    expect(level.biome.id).toBe('forest');
    expect(level.data.length).toBe(20);
    expect(level.data[0].length).toBe(30);
    // Outer wall check
    expect(level.data[0][0]).toBe(EDITOR_TILE.WALL);
    // Inner floor check
    expect(level.data[10][15]).toBe(EDITOR_TILE.FLOOR);
  });
});

describe('mapEditorHelper: validateLevelData', () => {
  it('passes validation for official game levels (depth 1 to 5)', () => {
    for (let depth = 1; depth <= 5; depth++) {
      const level = buildLevel1(depth);
      const res = validateLevelData(level);
      expect(res.valid, `Level ${depth} validation failed: ${res.errors.join(', ')}`).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.reachableCellsCount).toBeGreaterThan(0);
    }
  });

  it('detects when spawn is enclosed in a wall', () => {
    const level = createEmptyLevel('forest', 20, 20);
    level.data[level.spawn.row][level.spawn.col] = EDITOR_TILE.WALL;
    const res = validateLevelData(level);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Точка спавна'))).toBe(true);
  });

  it('detects when altar is unreachable via BFS pathfinding', () => {
    const level = createEmptyLevel('forest', 25, 25);
    // Wall off the altar completely
    const ar = level.altar.row;
    const ac = level.altar.col;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) {
          level.data[ar + dr][ac + dc] = EDITOR_TILE.WALL;
        }
      }
    }
    const res = validateLevelData(level);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('недостижим'))).toBe(true);
  });

  it('warns about enemies placed inside walls', () => {
    const level = createEmptyLevel('ruins', 20, 20);
    level.enemies.push({ col: 0, row: 0, kind: 'wolf' }); // 0,0 is wall
    const res = validateLevelData(level);
    expect(res.warnings.some((w) => w.includes('непроходимой клетке'))).toBe(true);
  });
});

describe('mapEditorHelper: exportLevelToTypeScript', () => {
  it('generates valid TypeScript code containing level structures', () => {
    const level = createEmptyLevel('catacombs', 40, 25);
    const tsCode = exportLevelToTypeScript(level, 'buildTestLevel');
    expect(tsCode).toContain('export function buildTestLevel');
    expect(tsCode).toContain('const COLS = 40;');
    expect(tsCode).toContain('const ROWS = 25;');
    expect(tsCode).toContain('spawn: { col: 5, row: 12 }');
    expect(tsCode).toContain('altar:');
    expect(tsCode).toContain('exit:');
  });
});

describe('mapEditorHelper: JSON serialization roundtrip', () => {
  it('correctly serializes and deserializes LevelData', () => {
    const level = buildLevel1(2);
    const jsonStr = serializeLevelToJson(level);
    const restored = deserializeLevelFromJson(jsonStr);
    expect(restored.cols).toBe(level.cols);
    expect(restored.rows).toBe(level.rows);
    expect(restored.spawn).toEqual(level.spawn);
    expect(restored.altar).toEqual(level.altar);
    expect(restored.exit).toEqual(level.exit);
    expect(restored.enemies.length).toBe(level.enemies.length);
  });
});

describe('mapEditorHelper: CustomBrush transformations', () => {
  it('rotates brush matrix 90 degrees clockwise', () => {
    const testBrush = {
      id: 'test',
      name: 'Test',
      width: 2,
      height: 3,
      grid: [
        [{ tileId: 1, rotation: 0 }, { tileId: 2, rotation: 0 }],
        [{ tileId: 3, rotation: 0 }, { tileId: 4, rotation: 0 }],
        [{ tileId: 5, rotation: 0 }, { tileId: 6, rotation: 0 }],
      ],
    };
    const rotated = rotateBrushMatrixClockwise(testBrush);
    expect(rotated.width).toBe(3);
    expect(rotated.height).toBe(2);
    expect(rotated.grid[0][0]?.tileId).toBe(5);
    expect(rotated.grid[0][0]?.rotation).toBe(90);
    expect(rotated.grid[0][2]?.tileId).toBe(1);
    expect(rotated.grid[1][2]?.tileId).toBe(2);
  });

  it('completes 360-degree rotation back to original shape', () => {
    const testBrush = {
      id: 'test',
      name: 'Test',
      width: 3,
      height: 2,
      grid: [
        [{ tileId: 10, rotation: 0 }, { tileId: 11, rotation: 0 }, { tileId: 12, rotation: 0 }],
        [{ tileId: 13, rotation: 0 }, { tileId: 14, rotation: 0 }, { tileId: 15, rotation: 0 }],
      ],
    };
    let b = rotateBrushMatrixClockwise(testBrush);
    b = rotateBrushMatrixClockwise(b);
    b = rotateBrushMatrixClockwise(b);
    b = rotateBrushMatrixClockwise(b);
    expect(b.width).toBe(3);
    expect(b.height).toBe(2);
    expect(b.grid[0][0]?.tileId).toBe(10);
  });

  it('applies circle shape mask leaving corners transparent (null)', () => {
    const brush = {
      id: 'circ_test',
      name: 'Circle',
      width: 5,
      height: 5,
      grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
    };
    const circleBrush = applyBrushShapeMask(brush, 'circle', 42);
    // Center must be filled
    expect(circleBrush.grid[2][2]?.tileId).toBe(42);
    // Top-left and bottom-right outer corners must be transparent (null)
    expect(circleBrush.grid[0][0]).toBeNull();
    expect(circleBrush.grid[0][4]).toBeNull();
    expect(circleBrush.grid[4][0]).toBeNull();
    expect(circleBrush.grid[4][4]).toBeNull();
  });

  it('applies cross shape mask', () => {
    const brush = {
      id: 'cross_test',
      name: 'Cross',
      width: 5,
      height: 5,
      grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
    };
    const crossBrush = applyBrushShapeMask(brush, 'cross', 99);
    // Middle row and middle column must be filled
    expect(crossBrush.grid[2][0]?.tileId).toBe(99);
    expect(crossBrush.grid[2][4]?.tileId).toBe(99);
    expect(crossBrush.grid[0][2]?.tileId).toBe(99);
    expect(crossBrush.grid[4][2]?.tileId).toBe(99);
    // Corners must be null
    expect(crossBrush.grid[0][0]).toBeNull();
    expect(crossBrush.grid[1][1]).toBeNull();
  });

  it('applies ring / border shape mask with empty center', () => {
    const brush = {
      id: 'ring_test',
      name: 'Ring',
      width: 5,
      height: 5,
      grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
    };
    const ringBrush = applyBrushShapeMask(brush, 'ring', 77);
    // Border filled
    expect(ringBrush.grid[0][0]?.tileId).toBe(77);
    expect(ringBrush.grid[0][4]?.tileId).toBe(77);
    expect(ringBrush.grid[4][4]?.tileId).toBe(77);
    // Inner center must be null
    expect(ringBrush.grid[2][2]).toBeNull();
    expect(ringBrush.grid[1][1]).toBeNull();
  });
});

import {
  calculateAutotileCell,
  autotileNeighborhood,
  isTileInFamily,
  getFamilyForTile,
} from '../src/admin/autotileHelper';
import { TILE_INDEX } from '../src/gfx/tileIndex';

describe('autotileHelper: Smart Autotiling Rules', () => {
  it('correctly categorizes tiles into families', () => {
    expect(isTileInFamily(TILE_INDEX.PATH_TL, 'path')).toBe(true);
    expect(isTileInFamily(TILE_INDEX.DIRT_1, 'path')).toBe(true);
    expect(isTileInFamily(TILE_INDEX.WATER_SHORE_TL, 'water')).toBe(true);
    expect(isTileInFamily(TILE_INDEX.COBBLE_INNER_BR, 'cobble')).toBe(true);
    expect(isTileInFamily(TILE_INDEX.CLIFF_TOP_TL, 'cliff')).toBe(true);
    expect(getFamilyForTile(TILE_INDEX.PATH_INNER_TL)).toBe('path');
    expect(getFamilyForTile(TILE_INDEX.WATER_DEEP)).toBe('water');
  });

  it('calculates path outer corners, straight borders, and center dirt', () => {
    // 3x3 path block on 5x5 grass map (row 1..3, col 1..3)
    const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => TILE_INDEX.GRASS_1));
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        grid[r][c] = TILE_INDEX.DIRT_1;
      }
    }

    // Top-left corner (1,1): above is grass, left is grass -> PATH_TL
    expect(calculateAutotileCell(grid, 1, 1, 'path')).toBe(TILE_INDEX.PATH_TL);
    // Top-right corner (1,3): above is grass, right is grass -> PATH_TR
    expect(calculateAutotileCell(grid, 1, 3, 'path')).toBe(TILE_INDEX.PATH_TR);
    // Bottom-left corner (3,1): below is grass, left is grass -> PATH_BL
    expect(calculateAutotileCell(grid, 3, 1, 'path')).toBe(TILE_INDEX.PATH_BL);
    // Bottom-right corner (3,3): below is grass, right is grass -> PATH_BR
    expect(calculateAutotileCell(grid, 3, 3, 'path')).toBe(TILE_INDEX.PATH_BR);

    // Top edge (1,2): above is grass, left and right are path -> PATH_T
    expect(calculateAutotileCell(grid, 1, 2, 'path')).toBe(TILE_INDEX.PATH_T);
    // Left edge (2,1) -> PATH_L
    expect(calculateAutotileCell(grid, 2, 1, 'path')).toBe(TILE_INDEX.PATH_L);
    // Center (2,2): all 8 neighbors are path -> DIRT_1
    expect(calculateAutotileCell(grid, 2, 2, 'path')).toBe(TILE_INDEX.DIRT_1);
  });

  it('calculates water shores and deep water', () => {
    // 3x3 water block on 5x5 map (row 1..3, col 1..3)
    const grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => TILE_INDEX.GRASS_1));
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        grid[r][c] = TILE_INDEX.WATER_DEEP;
      }
    }

    expect(calculateAutotileCell(grid, 1, 1, 'water')).toBe(TILE_INDEX.WATER_SHORE_TL);
    expect(calculateAutotileCell(grid, 1, 3, 'water')).toBe(TILE_INDEX.WATER_SHORE_TR);
    expect(calculateAutotileCell(grid, 3, 1, 'water')).toBe(TILE_INDEX.WATER_SHORE_BL);
    expect(calculateAutotileCell(grid, 3, 3, 'water')).toBe(TILE_INDEX.WATER_SHORE_BR);
    expect(calculateAutotileCell(grid, 2, 2, 'water')).toBe(TILE_INDEX.WATER_DEEP);
  });

  it('autotileNeighborhood automatically shapes borders in real-time', () => {
    const grid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => TILE_INDEX.GRASS_1));
    // Paint a 2x2 patch at (2,2)..(3,3)
    grid[2][2] = TILE_INDEX.DIRT_1;
    grid[2][3] = TILE_INDEX.DIRT_1;
    grid[3][2] = TILE_INDEX.DIRT_1;
    grid[3][3] = TILE_INDEX.DIRT_1;

    autotileNeighborhood(grid, 2, 2, 2);

    expect(grid[2][2]).toBe(TILE_INDEX.PATH_TL);
    expect(grid[2][3]).toBe(TILE_INDEX.PATH_TR);
    expect(grid[3][2]).toBe(TILE_INDEX.PATH_BL);
    expect(grid[3][3]).toBe(TILE_INDEX.PATH_BR);
  });

  it('calculates inner corner for path and water turns', () => {
    // 3x3 path with missing top-left corner (0,0)
    const grid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => TILE_INDEX.DIRT_1));
    grid[0][0] = TILE_INDEX.GRASS_1;

    // (1,1) has T, B, L, R all path, but TL is grass -> PATH_INNER_TL
    expect(calculateAutotileCell(grid, 1, 1, 'path')).toBe(TILE_INDEX.PATH_INNER_TL);

    // For water: (1,1) surrounded by water on all 4 sides stays WATER_DEEP
    const waterGrid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => TILE_INDEX.WATER_DEEP));
    waterGrid[0][0] = TILE_INDEX.GRASS_1;
    expect(calculateAutotileCell(waterGrid, 1, 1, 'water')).toBe(TILE_INDEX.WATER_DEEP);
  });
});

describe('mapEditor: Baking & Custom Level Integration', () => {
  it('generates a valid TypeScript preset file content via exportLevelToPresetTypeScript', () => {
    const level = createEmptyLevel('forest', 40, 30);
    const tsCode = exportLevelToPresetTypeScript(level);
    expect(tsCode).toContain("import type { LevelData } from './level1';");
    expect(tsCode).toContain('export const BAKED_LEVEL_1: LevelData | null =');
    expect(tsCode).toContain('export function getBakedLevel1(): LevelData | null');
    expect(tsCode).toContain('export function hasBakedLevel1(): boolean');
  });

  it('correctly reports baked level state', () => {
    const isBaked = hasBakedLevel1();
    expect(typeof isBaked).toBe('boolean');
    if (isBaked) {
      const baked = getBakedLevel1();
      expect(baked).not.toBeNull();
      expect(baked?.biome.id).toBe('forest');
    } else {
      expect(getBakedLevel1()).toBeNull();
    }
  });

  it('serializes and deserializes level without data corruption', () => {
    const original = createEmptyLevel('forest', 40, 30);
    original.trees = [{ col: 10, row: 10, kind: 'oak' }];
    original.decorations = [{ col: 12, row: 12, key: 'rock_large', solid: true }];

    const jsonStr = serializeLevelToJson(original);
    const restored = deserializeLevelFromJson(jsonStr);

    expect(restored.cols).toBe(40);
    expect(restored.rows).toBe(30);
    expect(restored.trees).toEqual([{ col: 10, row: 10, kind: 'oak' }]);
    expect(restored.decorations).toEqual([{ col: 12, row: 12, key: 'rock_large', solid: true }]);
  });
});



