import { describe, it, expect } from 'vitest';
import {
  validateLevelData,
  exportLevelToTypeScript,
  createEmptyLevel,
  serializeLevelToJson,
  deserializeLevelFromJson,
  EDITOR_TILE,
  rotateBrushMatrixClockwise,
} from '../src/admin/mapEditorHelper';
import { buildLevel1 } from '../src/world/level1';

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
});

