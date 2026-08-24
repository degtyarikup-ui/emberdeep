import type { LevelData } from './level1';

/**
 * Baked Level 1 preset for Emberdeep production build.
 * When this is non-null, the game will use this exact level data
 * as the official Depth 1 map instead of procedural generation.
 */
export const BAKED_LEVEL_1: LevelData | null = null;

export function hasBakedLevel1(): boolean {
  return BAKED_LEVEL_1 !== null;
}

export function getBakedLevel1(): LevelData | null {
  if (!BAKED_LEVEL_1) return null;
  // Return deep clone so runtime mutations (e.g. chest opening) do not corrupt the static preset
  return JSON.parse(JSON.stringify(BAKED_LEVEL_1)) as LevelData;
}
