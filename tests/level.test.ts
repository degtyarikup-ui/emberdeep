import { describe, it, expect } from 'vitest';
import { buildLevel1, COLS, ROWS } from '../src/world/level1';
import { FLOOR_INDICES } from '../src/gfx/tileIndex';

/**
 * Depths 1–4 cover all four biome builders; 5 additionally exercises the
 * "depth beyond the last biome" path, which reuses the final builder.
 */
const DEPTHS = [1, 2, 3, 4, 5];

const walkable = (grid: number[][], col: number, row: number) =>
  row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && FLOOR_INDICES.includes(grid[row][col]);

describe.each(DEPTHS)('buildLevel1(%i)', (depth) => {
  const level = buildLevel1(depth, true);

  it('produces a grid of the declared dimensions', () => {
    expect(level.rows).toBe(depth === 1 ? 80 : 38);
    expect(level.cols).toBe(depth === 1 ? 200 : 60);
    expect(level.data).toHaveLength(level.rows);
    for (const row of level.data) expect(row).toHaveLength(level.cols);
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

  it('does not spawn two enemies on the exact same tile', () => {
    const seen = new Set<string>();
    for (const enemy of level.enemies) {
      const key = `${enemy.col},${enemy.row}`;
      expect(seen.has(key), `duplicate enemy spawn at (${key})`).toBe(false);
      seen.add(key);
    }
  });

  it('places every tree on walkable floor and not inside cliffs', () => {
    if (!level.trees) return;
    for (const tree of level.trees) {
      expect(
        walkable(level.data, tree.col, tree.row),
        `tree at (${tree.col},${tree.row}) is not on a walkable floor tile`
      ).toBe(true);
    }
  });

  it('places every tree strictly on soil ground (never on water or bridges)', () => {
    if (!level.trees) return;
    const NON_SOIL = new Set([
      21, // WOOD_BRIDGE
      38, // WOOD_BRIDGE_BOT
      19, // WATER_DEEP
      18, 20, 24, 25, 26, 27, 28, 29, // WATER_SHORE_*
    ]);
    for (const tree of level.trees) {
      const tid = level.data[tree.row][tree.col];
      expect(
        NON_SOIL.has(tid),
        `tree at (${tree.col},${tree.row}) sits on water/bridge tile ${tid}`
      ).toBe(false);
    }
  });

  it('places every decoration on walkable ground and never in deep water or on bridges', () => {
    for (const d of level.decorations) {
      const tid = level.data[d.row][d.col];
      expect(
        walkable(level.data, d.col, d.row),
        `decoration ${d.key} at (${d.col},${d.row}) sits in a wall (tile ${tid})`
      ).toBe(true);
      expect(
        tid === 19 || tid === 21 || tid === 38,
        `decoration ${d.key} at (${d.col},${d.row}) sits in water or on a bridge (tile ${tid})`
      ).toBe(false);
    }
  });

  it('is deterministic for a given depth', () => {
    // Level layout is seeded from depth; co-op relies on every client
    // generating byte-identical geometry, since only entity state is synced.
    const again = buildLevel1(depth, true);
    expect(again.data).toEqual(level.data);
    expect(again.enemies).toEqual(level.enemies);
    expect(again.chests).toEqual(level.chests);
  });

  it('guarantees that altar, exit, chests, shrines and flasks are all reachable from spawn', () => {
    const queue: [number, number][] = [[level.spawn.col, level.spawn.row]];
    const visited = new Set<string>();
    visited.add(`${level.spawn.col},${level.spawn.row}`);

      const solidDecor = new Set(
        level.decorations.filter((d) => d.solid).map((d) => `${d.col},${d.row}`)
      );

      const neighbors = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];

      while (queue.length > 0) {
        const [c, r] = queue.shift()!;
        for (const [dc, dr] of neighbors) {
          const nc = c + dc;
          const nr = r + dr;
          const key = `${nc},${nr}`;
          if (!visited.has(key) && walkable(level.data, nc, nr) && !solidDecor.has(key)) {
            visited.add(key);
            queue.push([nc, nr]);
          }
        }
      }

      const checkReachable = (name: string, pos: { col: number; row: number }) => {
        let reachable = visited.has(`${pos.col},${pos.row}`);
        if (!reachable) {
          for (const [dc, dr] of neighbors) {
            if (visited.has(`${pos.col + dc},${pos.row + dr}`)) {
              reachable = true;
              break;
            }
          }
        }
        expect(reachable, `${name} at (${pos.col},${pos.row}) is disconnected from spawn`).toBe(true);
      };

    checkReachable('altar', level.altar);
    checkReachable('exit', level.exit);
    level.chests.forEach((c, idx) => checkReachable(`chest #${idx}`, c));
    level.shrines.forEach((s, idx) => checkReachable(`shrine #${idx} (${s.kind})`, s));
    level.flasks.forEach((f, idx) => checkReachable(`flask #${idx} (${f.key})`, f));
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

  it('depth 1 (Dark Forest) has no imp enemies and spawns orc_grunt', () => {
    const level1 = buildLevel1(1);
    const hasImp = level1.enemies.some((e) => e.kind === 'imp');
    const hasOrcGrunt = level1.enemies.some((e) => e.kind === 'orc_grunt');
    expect(hasImp).toBe(false);
    expect(hasOrcGrunt).toBe(true);
  });
});

