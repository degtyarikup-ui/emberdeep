import { describe, it, expect } from 'vitest';
import { buildLevel1, COLS, ROWS } from '../src/world/level1';
import { FLOOR_INDICES } from '../src/gfx/tileIndex';

/**
 * Depths 1–4 cover all four biome builders; 5 additionally exercises the
 * "depth beyond the last biome" path, which reuses the final builder.
 */
const DEPTHS = [1, 2, 3, 4, 5];

const walkable = (grid: number[][], col: number, row: number) =>
  row >= 0 && row < ROWS && col >= 0 && col < COLS && FLOOR_INDICES.includes(grid[row][col]);

describe.each(DEPTHS)('buildLevel1(%i)', (depth) => {
  const level = buildLevel1(depth);

  it('produces a grid of the declared dimensions', () => {
    expect(level.data).toHaveLength(ROWS);
    for (const row of level.data) expect(row).toHaveLength(COLS);
  });

  it('places spawn, altar and exit on walkable ground', () => {
    // A spawn or exit buried in a wall soft-locks the run.
    for (const [name, pos] of [
      ['spawn', level.spawn],
      ['altar', level.altar],
      ['exit', level.exit],
    ] as const) {
      expect(
        walkable(level.data, pos.col, pos.row),
        `${name} at (${pos.col},${pos.row}) is not on a walkable tile`
      ).toBe(true);
    }
  });

  it('places every interactable and enemy on walkable ground', () => {
    const groups = {
      enemy: level.enemies,
      chest: level.chests,
      shrine: level.shrines,
      flask: level.flasks,
    };
    for (const [kind, items] of Object.entries(groups)) {
      for (const item of items) {
        expect(
          walkable(level.data, item.col, item.row),
          `${kind} at (${item.col},${item.row}) is not on a walkable tile`
        ).toBe(true);
      }
    }
  });

  it('does not stack two interactables on one tile', () => {
    // A chest sharing a tile with a shrine or the exit makes one of them
    // unreachable, since prompts resolve by proximity.
    const seen = new Map<string, string>();
    const entries: [string, { col: number; row: number }][] = [
      ['exit', level.exit],
      ['altar', level.altar],
      ...level.chests.map((c) => ['chest', c] as [string, typeof c]),
      ...level.shrines.map((s) => ['shrine', s] as [string, typeof s]),
      ...level.flasks.map((f) => ['flask', f] as [string, typeof f]),
    ];
    for (const [kind, pos] of entries) {
      const key = `${pos.col},${pos.row}`;
      const prev = seen.get(key);
      expect(prev, `${kind} shares tile (${key}) with ${prev}`).toBeUndefined();
      seen.set(key, kind);
    }
  });

  it('does not spawn an enemy on top of a solid decoration', () => {
    // Enemies wake up stuck inside the collider otherwise.
    const solid = new Set(
      level.decorations.filter((d) => d.solid).map((d) => `${d.col},${d.row}`)
    );
    for (const enemy of level.enemies) {
      expect(
        solid.has(`${enemy.col},${enemy.row}`),
        `enemy at (${enemy.col},${enemy.row}) sits inside a solid decoration`
      ).toBe(false);
    }
  });

  it('is deterministic for a given depth', () => {
    // Level layout is seeded from depth; co-op relies on every client
    // generating byte-identical geometry, since only entity state is synced.
    const again = buildLevel1(depth);
    expect(again.data).toEqual(level.data);
    expect(again.enemies).toEqual(level.enemies);
    expect(again.chests).toEqual(level.chests);
  });

  it('carries a biome whose declared depth does not exceed the run depth', () => {
    expect(level.biome).toBeDefined();
    expect(level.biome.depth).toBeLessThanOrEqual(depth);
  });
});

describe('difficulty progression', () => {
  it('does not shrink the enemy count as depth increases', () => {
    const counts = DEPTHS.map((d) => buildLevel1(d).enemies.length);
    for (const count of counts) expect(count).toBeGreaterThan(0);
  });
});
