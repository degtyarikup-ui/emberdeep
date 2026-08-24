import type { LevelData } from '../world/level1';
import type { PropKey } from '../gfx/propKeys';
import { getBiomeForDepth, type BiomeId } from '../world/biomes';
import { FLOOR_INDICES, TILE_INDEX } from '../gfx/tileIndex';

export const EDITOR_TILE = {
  FLOOR: 0,
  WALL: 64,
  PATH: 3,
  RUIN_FLOOR: 5,
  WATER_DEEP: 19,
  BRIDGE: 21,
  SNOW: 14,
  ICE: 19,
  CANYON_DIRT: 10,
  RAIL: 23,
  GRATE: 22,
} as const;

export type EditorTileType = number;

export type TileSubCategory = 'all' | 'ground' | 'paths' | 'water' | 'cliffs' | 'walls' | 'cobble';

export interface TileMeta {
  id: number;
  name: string;
  color: string;
  solid: boolean;
  walkable: boolean;
  subCategory?: TileSubCategory;
}

export const TILE_METAS: Record<number, TileMeta> = {
  // Ground & Grass
  [TILE_INDEX.GRASS_1]: { id: TILE_INDEX.GRASS_1, name: 'Трава 1', color: '#166534', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.GRASS_2]: { id: TILE_INDEX.GRASS_2, name: 'Трава 2 (Цветы)', color: '#15803d', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.GRASS_3]: { id: TILE_INDEX.GRASS_3, name: 'Трава 3 (Кустики)', color: '#16a34a', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.DIRT_1]: { id: TILE_INDEX.DIRT_1, name: 'Земля / Грязь 1', color: '#78350f', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.DIRT_2]: { id: TILE_INDEX.DIRT_2, name: 'Земля / Грязь 2', color: '#92400e', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.CANYON_DIRT_1]: { id: TILE_INDEX.CANYON_DIRT_1, name: 'Земля каньона 1', color: '#57534e', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.CANYON_DIRT_2]: { id: TILE_INDEX.CANYON_DIRT_2, name: 'Земля каньона 2', color: '#78716c', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.SNOW_1]: { id: TILE_INDEX.SNOW_1, name: 'Снег 1', color: '#94a3b8', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.SNOW_2]: { id: TILE_INDEX.SNOW_2, name: 'Снег 2 (Сугроб)', color: '#cbd5e1', solid: false, walkable: true, subCategory: 'ground' },
  [TILE_INDEX.RUIN_STONE]: { id: TILE_INDEX.RUIN_STONE, name: 'Каменный пол руин', color: '#475569', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.DUNGEON_1]: { id: TILE_INDEX.DUNGEON_1, name: 'Пол подземелья 1', color: '#334155', solid: false, walkable: true, subCategory: 'walls' },
  [TILE_INDEX.DUNGEON_2]: { id: TILE_INDEX.DUNGEON_2, name: 'Пол подземелья 2', color: '#3f3f46', solid: false, walkable: true, subCategory: 'walls' },
  [TILE_INDEX.DUNGEON_3]: { id: TILE_INDEX.DUNGEON_3, name: 'Пол подземелья 3', color: '#27272a', solid: false, walkable: true, subCategory: 'walls' },
  [TILE_INDEX.DUNGEON_4]: { id: TILE_INDEX.DUNGEON_4, name: 'Пол подземелья 4', color: '#18181b', solid: false, walkable: true, subCategory: 'walls' },

  // Water & Shores
  [TILE_INDEX.WATER_DEEP]: { id: TILE_INDEX.WATER_DEEP, name: 'Глубокая вода / Озеро', color: '#1e3a8a', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WATER_SHORE_T]: { id: TILE_INDEX.WATER_SHORE_T, name: 'Берег верх (Север)', color: '#2563eb', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WATER_SHORE_B]: { id: TILE_INDEX.WATER_SHORE_B, name: 'Берег низ (Юг)', color: '#2563eb', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WATER_SHORE_L]: { id: TILE_INDEX.WATER_SHORE_L, name: 'Берег лево (Запад)', color: '#2563eb', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WATER_SHORE_R]: { id: TILE_INDEX.WATER_SHORE_R, name: 'Берег право (Восток)', color: '#2563eb', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WATER_SHORE_TL]: { id: TILE_INDEX.WATER_SHORE_TL, name: 'Берег угол верх-лево', color: '#3b82f6', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WATER_SHORE_TR]: { id: TILE_INDEX.WATER_SHORE_TR, name: 'Берег угол верх-право', color: '#3b82f6', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WATER_SHORE_BL]: { id: TILE_INDEX.WATER_SHORE_BL, name: 'Берег угол низ-лево', color: '#3b82f6', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WATER_SHORE_BR]: { id: TILE_INDEX.WATER_SHORE_BR, name: 'Берег угол низ-право', color: '#3b82f6', solid: true, walkable: false, subCategory: 'water' },
  [TILE_INDEX.WOOD_BRIDGE]: { id: TILE_INDEX.WOOD_BRIDGE, name: 'Мост деревянный верх', color: '#92400e', solid: false, walkable: true, subCategory: 'water' },
  [TILE_INDEX.WOOD_BRIDGE_BOT]: { id: TILE_INDEX.WOOD_BRIDGE_BOT, name: 'Мост деревянный низ', color: '#78350f', solid: false, walkable: true, subCategory: 'water' },

  // Organic Paths (Grass-to-Dirt)
  [TILE_INDEX.PATH_T]: { id: TILE_INDEX.PATH_T, name: 'Тропа граница верх', color: '#a16207', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_B]: { id: TILE_INDEX.PATH_B, name: 'Тропа граница низ', color: '#a16207', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_L]: { id: TILE_INDEX.PATH_L, name: 'Тропа граница лево', color: '#a16207', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_R]: { id: TILE_INDEX.PATH_R, name: 'Тропа граница право', color: '#a16207', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_TL]: { id: TILE_INDEX.PATH_TL, name: 'Тропа угол верх-лево', color: '#ca8a04', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_TR]: { id: TILE_INDEX.PATH_TR, name: 'Тропа угол верх-право', color: '#ca8a04', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_BL]: { id: TILE_INDEX.PATH_BL, name: 'Тропа угол низ-лево', color: '#ca8a04', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_BR]: { id: TILE_INDEX.PATH_BR, name: 'Тропа угол низ-право', color: '#ca8a04', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_INNER_TL]: { id: TILE_INDEX.PATH_INNER_TL, name: 'Тропа внутр. угол ВЛ', color: '#eab308', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_INNER_TR]: { id: TILE_INDEX.PATH_INNER_TR, name: 'Тропа внутр. угол ВП', color: '#eab308', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_INNER_BL]: { id: TILE_INDEX.PATH_INNER_BL, name: 'Тропа внутр. угол НЛ', color: '#eab308', solid: false, walkable: true, subCategory: 'paths' },
  [TILE_INDEX.PATH_INNER_BR]: { id: TILE_INDEX.PATH_INNER_BR, name: 'Тропа внутр. угол НП', color: '#eab308', solid: false, walkable: true, subCategory: 'paths' },

  // Mountain Rock Cliffs (Dark Forest)
  [TILE_INDEX.CLIFF_TOP_TL]: { id: TILE_INDEX.CLIFF_TOP_TL, name: 'Скала вершина угол ВЛ', color: '#334155', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_TOP_TM]: { id: TILE_INDEX.CLIFF_TOP_TM, name: 'Скала вершина край верх', color: '#334155', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_TOP_TR]: { id: TILE_INDEX.CLIFF_TOP_TR, name: 'Скала вершина угол ВП', color: '#334155', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_MID_L]: { id: TILE_INDEX.CLIFF_MID_L, name: 'Скала склон лево', color: '#475569', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_MID_M]: { id: TILE_INDEX.CLIFF_MID_M, name: 'Скала склон центр', color: '#475569', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_MID_R]: { id: TILE_INDEX.CLIFF_MID_R, name: 'Скала склон право', color: '#475569', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_BOT_BL]: { id: TILE_INDEX.CLIFF_BOT_BL, name: 'Скала основание угол НЛ', color: '#64748b', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_BOT_BM]: { id: TILE_INDEX.CLIFF_BOT_BM, name: 'Скала основание низ', color: '#64748b', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_BOT_BR]: { id: TILE_INDEX.CLIFF_BOT_BR, name: 'Скала основание угол НП', color: '#64748b', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_FACE]: { id: TILE_INDEX.CLIFF_FACE, name: 'Скала отвесная стена', color: '#1e293b', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_INNER_TL]: { id: TILE_INDEX.CLIFF_INNER_TL, name: 'Скала внутр. угол ВЛ', color: '#475569', solid: true, walkable: false, subCategory: 'cliffs' },
  [TILE_INDEX.CLIFF_INNER_TR]: { id: TILE_INDEX.CLIFF_INNER_TR, name: 'Скала внутр. угол ВП', color: '#475569', solid: true, walkable: false, subCategory: 'cliffs' },

  // Cobblestone / Ruin Transitions
  [TILE_INDEX.COBBLE_T]: { id: TILE_INDEX.COBBLE_T, name: 'Брусчатка верх', color: '#64748b', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_B]: { id: TILE_INDEX.COBBLE_B, name: 'Брусчатка низ', color: '#64748b', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_L]: { id: TILE_INDEX.COBBLE_L, name: 'Брусчатка лево', color: '#64748b', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_R]: { id: TILE_INDEX.COBBLE_R, name: 'Брусчатка право', color: '#64748b', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_TL]: { id: TILE_INDEX.COBBLE_TL, name: 'Брусчатка угол ВЛ', color: '#94a3b8', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_TR]: { id: TILE_INDEX.COBBLE_TR, name: 'Брусчатка угол ВП', color: '#94a3b8', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_BL]: { id: TILE_INDEX.COBBLE_BL, name: 'Брусчатка угол НЛ', color: '#94a3b8', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_BR]: { id: TILE_INDEX.COBBLE_BR, name: 'Брусчатка угол НП', color: '#94a3b8', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_INNER_TL]: { id: TILE_INDEX.COBBLE_INNER_TL, name: 'Брусчатка внутр. ВЛ', color: '#cbd5e1', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_INNER_TR]: { id: TILE_INDEX.COBBLE_INNER_TR, name: 'Брусчатка внутр. ВП', color: '#cbd5e1', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_INNER_BL]: { id: TILE_INDEX.COBBLE_INNER_BL, name: 'Брусчатка внутр. НЛ', color: '#cbd5e1', solid: false, walkable: true, subCategory: 'cobble' },
  [TILE_INDEX.COBBLE_INNER_BR]: { id: TILE_INDEX.COBBLE_INNER_BR, name: 'Брусчатка внутр. НП', color: '#cbd5e1', solid: false, walkable: true, subCategory: 'cobble' },

  // Walls & Infrastructure
  [TILE_INDEX.WALL_DUNGEON]: { id: TILE_INDEX.WALL_DUNGEON, name: 'Стена подземелья', color: '#0f172a', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_RUIN]: { id: TILE_INDEX.WALL_RUIN, name: 'Стена руин', color: '#1e293b', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_CANYON]: { id: TILE_INDEX.WALL_CANYON, name: 'Стена каньона', color: '#44403c', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_GLACIAL]: { id: TILE_INDEX.WALL_GLACIAL, name: 'Ледяная стена', color: '#0369a1', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_SIDE_L]: { id: TILE_INDEX.WALL_SIDE_L, name: 'Стена торец лево', color: '#334155', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_SIDE_R]: { id: TILE_INDEX.WALL_SIDE_R, name: 'Стена торец право', color: '#334155', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_CORNER_TL]: { id: TILE_INDEX.WALL_CORNER_TL, name: 'Стена угол ВЛ', color: '#475569', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_CORNER_TR]: { id: TILE_INDEX.WALL_CORNER_TR, name: 'Стена угол ВП', color: '#475569', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_CORNER_BL]: { id: TILE_INDEX.WALL_CORNER_BL, name: 'Стена угол НЛ', color: '#475569', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_CORNER_BR]: { id: TILE_INDEX.WALL_CORNER_BR, name: 'Стена угол НП', color: '#475569', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_END_BL]: { id: TILE_INDEX.WALL_END_BL, name: 'Стена выступ НЛ', color: '#1e293b', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.WALL_END_BR]: { id: TILE_INDEX.WALL_END_BR, name: 'Стена выступ НП', color: '#1e293b', solid: true, walkable: false, subCategory: 'walls' },
  [TILE_INDEX.RAIL_TRACK_TILE]: { id: TILE_INDEX.RAIL_TRACK_TILE, name: 'Рельсы шахты', color: '#71717a', solid: false, walkable: true, subCategory: 'walls' },
  [TILE_INDEX.SEWER_GRATE_TILE]: { id: TILE_INDEX.SEWER_GRATE_TILE, name: 'Решетка канализации', color: '#27272a', solid: false, walkable: true, subCategory: 'walls' },
};

export interface CustomBrushTile {
  tileId: number;
  rotation: number; // 0, 90, 180, 270
  flipX?: boolean;
  flipY?: boolean;
}

export interface CustomBrush {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: (CustomBrushTile | null)[][]; // [row][col]
}

export const DEFAULT_CUSTOM_BRUSHES: CustomBrush[] = [
  {
    id: 'pond_3x3',
    name: 'Озеро / Пруд 3x3',
    width: 3,
    height: 3,
    grid: [
      [{ tileId: TILE_INDEX.WATER_SHORE_TL, rotation: 0 }, { tileId: TILE_INDEX.WATER_SHORE_T, rotation: 0 }, { tileId: TILE_INDEX.WATER_SHORE_TR, rotation: 0 }],
      [{ tileId: TILE_INDEX.WATER_SHORE_L, rotation: 0 }, { tileId: TILE_INDEX.WATER_DEEP, rotation: 0 }, { tileId: TILE_INDEX.WATER_SHORE_R, rotation: 0 }],
      [{ tileId: TILE_INDEX.WATER_SHORE_BL, rotation: 0 }, { tileId: TILE_INDEX.WATER_SHORE_B, rotation: 0 }, { tileId: TILE_INDEX.WATER_SHORE_BR, rotation: 0 }],
    ],
  },
  {
    id: 'dirt_road_3x3',
    name: 'Дорога с обочиной 3x3',
    width: 3,
    height: 3,
    grid: [
      [{ tileId: TILE_INDEX.PATH_TL, rotation: 0 }, { tileId: TILE_INDEX.PATH_T, rotation: 0 }, { tileId: TILE_INDEX.PATH_TR, rotation: 0 }],
      [{ tileId: TILE_INDEX.PATH_L, rotation: 0 }, { tileId: TILE_INDEX.DIRT_1, rotation: 0 }, { tileId: TILE_INDEX.PATH_R, rotation: 0 }],
      [{ tileId: TILE_INDEX.PATH_BL, rotation: 0 }, { tileId: TILE_INDEX.PATH_B, rotation: 0 }, { tileId: TILE_INDEX.PATH_BR, rotation: 0 }],
    ],
  },
  {
    id: 'cliff_mountain_3x3',
    name: 'Скала / Гора 3x3',
    width: 3,
    height: 3,
    grid: [
      [{ tileId: TILE_INDEX.CLIFF_TOP_TL, rotation: 0 }, { tileId: TILE_INDEX.CLIFF_TOP_TM, rotation: 0 }, { tileId: TILE_INDEX.CLIFF_TOP_TR, rotation: 0 }],
      [{ tileId: TILE_INDEX.CLIFF_MID_L, rotation: 0 }, { tileId: TILE_INDEX.CLIFF_MID_M, rotation: 0 }, { tileId: TILE_INDEX.CLIFF_MID_R, rotation: 0 }],
      [{ tileId: TILE_INDEX.CLIFF_BOT_BL, rotation: 0 }, { tileId: TILE_INDEX.CLIFF_BOT_BM, rotation: 0 }, { tileId: TILE_INDEX.CLIFF_BOT_BR, rotation: 0 }],
    ],
  },
  {
    id: 'cobble_plaza_3x3',
    name: 'Каменная площадь 3x3',
    width: 3,
    height: 3,
    grid: [
      [{ tileId: TILE_INDEX.COBBLE_TL, rotation: 0 }, { tileId: TILE_INDEX.COBBLE_T, rotation: 0 }, { tileId: TILE_INDEX.COBBLE_TR, rotation: 0 }],
      [{ tileId: TILE_INDEX.COBBLE_L, rotation: 0 }, { tileId: TILE_INDEX.RUIN_STONE, rotation: 0 }, { tileId: TILE_INDEX.COBBLE_R, rotation: 0 }],
      [{ tileId: TILE_INDEX.COBBLE_BL, rotation: 0 }, { tileId: TILE_INDEX.COBBLE_B, rotation: 0 }, { tileId: TILE_INDEX.COBBLE_BR, rotation: 0 }],
    ],
  },
  {
    id: 'wood_bridge_2x3',
    name: 'Деревянный мост 2x3',
    width: 2,
    height: 3,
    grid: [
      [{ tileId: TILE_INDEX.WOOD_BRIDGE, rotation: 0 }, { tileId: TILE_INDEX.WOOD_BRIDGE, rotation: 0 }],
      [{ tileId: TILE_INDEX.WOOD_BRIDGE_BOT, rotation: 0 }, { tileId: TILE_INDEX.WOOD_BRIDGE_BOT, rotation: 0 }],
      [{ tileId: TILE_INDEX.WOOD_BRIDGE_BOT, rotation: 0 }, { tileId: TILE_INDEX.WOOD_BRIDGE_BOT, rotation: 0 }],
    ],
  },
];

export function rotateBrushMatrixClockwise(brush: CustomBrush): CustomBrush {
  const newW = brush.height;
  const newH = brush.width;
  const newGrid: (CustomBrushTile | null)[][] = Array.from({ length: newH }, () =>
    Array.from({ length: newW }, () => null)
  );

  for (let r = 0; r < brush.height; r++) {
    for (let c = 0; c < brush.width; c++) {
      const cell = brush.grid[r][c];
      if (cell) {
        newGrid[c][brush.height - 1 - r] = {
          ...cell,
          rotation: (cell.rotation + 90) % 360,
        };
      }
    }
  }

  return {
    ...brush,
    width: newW,
    height: newH,
    grid: newGrid,
  };
}

export function rotateBrushMatrixCounterClockwise(brush: CustomBrush): CustomBrush {
  return rotateBrushMatrixClockwise(
    rotateBrushMatrixClockwise(rotateBrushMatrixClockwise(brush))
  );
}

export function flipBrushHorizontal(brush: CustomBrush): CustomBrush {
  const newGrid: (CustomBrushTile | null)[][] = Array.from({ length: brush.height }, (_, r) =>
    Array.from({ length: brush.width }, (__, c) => {
      const cell = brush.grid[r][brush.width - 1 - c];
      if (cell) {
        return {
          ...cell,
          flipX: !cell.flipX,
        };
      }
      return null;
    })
  );

  return {
    ...brush,
    grid: newGrid,
  };
}

export function flipBrushVertical(brush: CustomBrush): CustomBrush {
  const newGrid: (CustomBrushTile | null)[][] = Array.from({ length: brush.height }, (_, r) =>
    Array.from({ length: brush.width }, (__, c) => {
      const cell = brush.grid[brush.height - 1 - r][c];
      if (cell) {
        return {
          ...cell,
          flipY: !cell.flipY,
        };
      }
      return null;
    })
  );

  return {
    ...brush,
    grid: newGrid,
  };
}

export interface EditorEntityItem {
  category: 'poi' | 'npc' | 'enemy' | 'pickup' | 'prop' | 'tree';
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const ENTITY_PALETTE: EditorEntityItem[] = [
  // POIs
  { category: 'poi', id: 'spawn', name: 'Точка спавна', icon: 'SP', color: '#22c55e' },
  { category: 'poi', id: 'altar', name: 'Алтарь босса', icon: 'AL', color: '#eab308' },
  { category: 'poi', id: 'exit', name: 'Выход / Лестница', icon: 'EX', color: '#38bdf8' },
  { category: 'poi', id: 'portal_angel', name: 'Портал Ангела', icon: 'AG', color: '#fef08a' },
  { category: 'poi', id: 'portal_ladder', name: 'Люк в полу', icon: 'LD', color: '#cbd5e1' },
  { category: 'poi', id: 'portal_hole', name: 'Провал в Бездну', icon: 'HL', color: '#64748b' },

  // NPCs & Allies
  { category: 'npc', id: 'npc_knight_m', name: 'Рыцарь (Муж)', icon: 'KM', color: '#60a5fa' },
  { category: 'npc', id: 'npc_knight_f', name: 'Дева-рыцарь', icon: 'KF', color: '#93c5fd' },
  { category: 'npc', id: 'npc_wizard_m', name: 'Верховный маг', icon: 'WM', color: '#c084fc' },
  { category: 'npc', id: 'npc_wizard_f', name: 'Волшебница', icon: 'WF', color: '#e879f9' },
  { category: 'npc', id: 'npc_elf_m', name: 'Лесной эльф', icon: 'EM', color: '#4ade80' },
  { category: 'npc', id: 'npc_elf_f', name: 'Эльфийка', icon: 'EF', color: '#86efac' },
  { category: 'npc', id: 'npc_dwarf_m', name: 'Гном-кузнец', icon: 'DM', color: '#fb923c' },
  { category: 'npc', id: 'npc_dwarf_f', name: 'Гномиха', icon: 'DF', color: '#fdba74' },
  { category: 'npc', id: 'npc_lizard_m', name: 'Ящер-воин', icon: 'LM', color: '#34d399' },
  { category: 'npc', id: 'npc_lizard_f', name: 'Ящерица-жрица', icon: 'LF', color: '#6ee7b7' },
  { category: 'npc', id: 'npc_doctor', name: 'Чумной доктор', icon: 'DC', color: '#a1a1aa' },

  // Enemies & Bosses
  { category: 'enemy', id: 'wolf', name: 'Волк', icon: 'WF', color: '#a8a29e' },
  { category: 'enemy', id: 'direwolf', name: 'Лютоволк', icon: 'DW', color: '#e2e8f0' },
  { category: 'enemy', id: 'skeleton', name: 'Скелет', icon: 'SK', color: '#f8fafc' },
  { category: 'enemy', id: 'imp', name: 'Бес', icon: 'IM', color: '#f87171' },
  { category: 'enemy', id: 'orc_grunt', name: 'Орк-пехотинец', icon: 'OG', color: '#4ade80' },
  { category: 'enemy', id: 'orc_shield', name: 'Орк со щитом', icon: 'OS', color: '#60a5fa' },
  { category: 'enemy', id: 'orc_archer', name: 'Орк-лучник', icon: 'OA', color: '#fb923c' },
  { category: 'enemy', id: 'orc_shaman', name: 'Орк-шаман', icon: 'SH', color: '#a855f7' },
  { category: 'enemy', id: 'bandit_assassin', name: 'Бандит', icon: 'BA', color: '#c084fc' },
  { category: 'enemy', id: 'boss_demon', name: 'Архидемон (Босс)', icon: 'BD', color: '#dc2626' },
  { category: 'enemy', id: 'boss_ogre', name: 'Огр-великан (Босс)', icon: 'BO', color: '#ea580c' },
  { category: 'enemy', id: 'necromancer', name: 'Некромант', icon: 'NC', color: '#9333ea' },
  { category: 'enemy', id: 'big_zombie', name: 'Большой зомби', icon: 'BZ', color: '#15803d' },
  { category: 'enemy', id: 'tiny_zombie', name: 'Малый зомби', icon: 'TZ', color: '#22c55e' },
  { category: 'enemy', id: 'ice_zombie', name: 'Ледяной зомби', icon: 'IZ', color: '#38bdf8' },
  { category: 'enemy', id: 'chort', name: 'Рогатый чёрт', icon: 'CT', color: '#b91c1c' },
  { category: 'enemy', id: 'goblin', name: 'Гоблин', icon: 'GB', color: '#65a30d' },
  { category: 'enemy', id: 'pumpkin_dude', name: 'Тыквенный Джек', icon: 'PK', color: '#d97706' },
  { category: 'enemy', id: 'wogol', name: 'Вогол / Тень', icon: 'WG', color: '#475569' },
  { category: 'enemy', id: 'muddy', name: 'Грязевик', icon: 'MD', color: '#78350f' },
  { category: 'enemy', id: 'swampy', name: 'Болотник', icon: 'SW', color: '#166534' },
  { category: 'enemy', id: 'slug', name: 'Пещерный слизень', icon: 'SL', color: '#0284c7' },
  { category: 'enemy', id: 'tiny_slug', name: 'Малый слизень', icon: 'TS', color: '#38bdf8' },

  // Pickups & Interactive
  { category: 'pickup', id: 'chest', name: 'Сундук сокровищ', icon: 'CH', color: '#f59e0b' },
  { category: 'pickup', id: 'chest_empty', name: 'Открытый сундук', icon: 'CE', color: '#d97706' },
  { category: 'pickup', id: 'chest_mimic', name: 'Сундук-Мимик', icon: 'CM', color: '#ef4444' },
  { category: 'pickup', id: 'shrine_blood', name: 'Кровавое святилище', icon: 'SB', color: '#ef4444' },
  { category: 'pickup', id: 'shrine_chance', name: 'Святилище шанса', icon: 'SC', color: '#38bdf8' },
  { category: 'pickup', id: 'fountain_basin_blue', name: 'Чаша синего фонтана', icon: 'FB', color: '#0ea5e9' },
  { category: 'pickup', id: 'fountain_basin_red', name: 'Чаша красного фонтана', icon: 'FR', color: '#f43f5e' },
  { category: 'pickup', id: 'flask_red', name: 'Колба здоровья (HP)', icon: 'HP', color: '#f43f5e' },
  { category: 'pickup', id: 'flask_yellow', name: 'Солнечная колба (Свет)', icon: 'LT', color: '#facc15' },
  { category: 'pickup', id: 'flask_blue', name: 'Колба маны (MP)', icon: 'MP', color: '#60a5fa' },
  { category: 'pickup', id: 'flask_green', name: 'Колба яда (Выносливость)', icon: 'GP', color: '#22c55e' },
  { category: 'pickup', id: 'flask_big_red', name: 'Великое зелье HP', icon: 'BH', color: '#e11d48' },
  { category: 'pickup', id: 'flask_big_blue', name: 'Великое зелье маны', icon: 'BM', color: '#2563eb' },
  { category: 'pickup', id: 'flask_big_green', name: 'Великое зелье яда', icon: 'BG', color: '#16a34a' },
  { category: 'pickup', id: 'flask_big_yellow', name: 'Великое зелье света', icon: 'BY', color: '#ca8a04' },
  { category: 'pickup', id: 'coin_gold', name: 'Золотая монета', icon: 'CN', color: '#eab308' },
  { category: 'pickup', id: 'bomb', name: 'Бомба с фитилем', icon: 'BB', color: '#71717a' },

  // Props & Dungeon Obstacles
  { category: 'prop', id: 'torch', name: 'Факел', icon: 'TC', color: '#f97316' },
  { category: 'prop', id: 'bonfire', name: 'Костер лагеря', icon: 'BF', color: '#fb923c' },
  { category: 'prop', id: 'spikes', name: 'Шипы-ловушка', icon: 'SK', color: '#dc2626' },
  { category: 'prop', id: 'barrel', name: 'Бочка', icon: 'BR', color: '#b45309' },
  { category: 'prop', id: 'crate', name: 'Ящик', icon: 'CR', color: '#d97706' },
  { category: 'prop', id: 'fence', name: 'Забор', icon: 'FN', color: '#78350f' },
  { category: 'prop', id: 'rock', name: 'Валун / Камень', icon: 'RK', color: '#64748b' },
  { category: 'prop', id: 'rock_large', name: 'Большой валун', icon: 'RL', color: '#475569' },
  { category: 'prop', id: 'bush', name: 'Куст', icon: 'BS', color: '#15803d' },
  { category: 'prop', id: 'reeds', name: 'Тростник', icon: 'RD', color: '#166534' },
  { category: 'prop', id: 'cabin', name: 'Лесная хижина', icon: 'CB', color: '#78350f' },
  { category: 'prop', id: 'statue', name: 'Каменная статуя', icon: 'ST', color: '#94a3b8' },
  { category: 'prop', id: 'workbench', name: 'Верстак', icon: 'WB', color: '#a16207' },
  { category: 'prop', id: 'tombstone', name: 'Могильная плита', icon: 'TB', color: '#94a3b8' },
  { category: 'prop', id: 'obelisk', name: 'Обелиск Бездны', icon: 'OB', color: '#818cf8' },
  { category: 'prop', id: 'minecart', name: 'Вагонетка', icon: 'MC', color: '#a1a1aa' },
  { category: 'prop', id: 'mushroom', name: 'Гигантский гриб', icon: 'MS', color: '#a855f7' },
  { category: 'prop', id: 'column', name: 'Каменная колонна', icon: 'CL', color: '#64748b' },
  { category: 'prop', id: 'column_wall', name: 'Пристенная колонна', icon: 'CW', color: '#475569' },
  { category: 'prop', id: 'door_closed', name: 'Закрытая дверь', icon: 'DC', color: '#92400e' },
  { category: 'prop', id: 'door_open', name: 'Открытая дверь', icon: 'DO', color: '#b45309' },
  { category: 'prop', id: 'button_blue', name: 'Синяя нажимная плита', icon: 'BB', color: '#0284c7' },
  { category: 'prop', id: 'button_red', name: 'Красная нажимная плита', icon: 'BR', color: '#dc2626' },
  { category: 'prop', id: 'lever_left', name: 'Рычаг (влево)', icon: 'LL', color: '#d97706' },
  { category: 'prop', id: 'lever_right', name: 'Рычаг (вправо)', icon: 'LR', color: '#d97706' },
  { category: 'prop', id: 'banner_blue', name: 'Синее настенное знамя', icon: 'BL', color: '#2563eb' },
  { category: 'prop', id: 'banner_red', name: 'Красное настенное знамя', icon: 'RD', color: '#dc2626' },
  { category: 'prop', id: 'banner_green', name: 'Зеленое настенное знамя', icon: 'GN', color: '#16a34a' },
  { category: 'prop', id: 'banner_yellow', name: 'Желтое настенное знамя', icon: 'YL', color: '#ca8a04' },
  { category: 'prop', id: 'wall_goo', name: 'Слизь на стене', icon: 'WG', color: '#84cc16' },
  { category: 'prop', id: 'wall_hole', name: 'Пролом в стене', icon: 'WH', color: '#334155' },
  { category: 'prop', id: 'skull_prop', name: 'Череп', icon: 'SK', color: '#f8fafc' },
  { category: 'prop', id: 'prison_bars', name: 'Тюремная решетка', icon: 'PB', color: '#52525b' },
  { category: 'prop', id: 'chains', name: 'Цепи', icon: 'CH', color: '#71717a' },
  { category: 'prop', id: 'blood_spill', name: 'Пятно крови', icon: 'BS', color: '#991b1b' },
  { category: 'prop', id: 'mine_shaft', name: 'Вход в шахту', icon: 'MS', color: '#3f3f46' },
  { category: 'prop', id: 'lupine', name: 'Цветы люпина', icon: 'LP', color: '#c084fc' },
  { category: 'prop', id: 'ice_crystal', name: 'Кристалл льда', icon: 'IC', color: '#38bdf8' },

  // Trees & Foliage
  { category: 'tree', id: 'tree_pine', name: 'Сосна классическая', icon: 'PN', color: '#15803d' },
  { category: 'tree', id: 'tree_oak', name: 'Дуб классический', icon: 'OK', color: '#16a34a' },
  { category: 'tree', id: 'tree_pine_sm', name: 'Малая сосна', icon: 'P1', color: '#15803d' },
  { category: 'tree', id: 'tree_pine_md', name: 'Средняя сосна', icon: 'P2', color: '#15803d' },
  { category: 'tree', id: 'tree_pine_lg', name: 'Большая сосна', icon: 'P3', color: '#15803d' },
  { category: 'tree', id: 'tree_pine_xl', name: 'Вековая сосна (XL)', icon: 'P4', color: '#15803d' },
  { category: 'tree', id: 'tree_oak_sm', name: 'Молодой дуб', icon: 'O1', color: '#16a34a' },
  { category: 'tree', id: 'tree_oak_md', name: 'Средний дуб', icon: 'O2', color: '#16a34a' },
  { category: 'tree', id: 'tree_oak_lg', name: 'Большой дуб', icon: 'O3', color: '#16a34a' },
  { category: 'tree', id: 'tree_oak_xl', name: 'Древний дуб (XL)', icon: 'O4', color: '#16a34a' },
  { category: 'tree', id: 'tree_birch_sm', name: 'Береза малая', icon: 'B1', color: '#4ade80' },
  { category: 'tree', id: 'tree_birch_md', name: 'Береза средняя', icon: 'B2', color: '#4ade80' },
  { category: 'tree', id: 'tree_birch_lg', name: 'Береза большая', icon: 'B3', color: '#4ade80' },
  { category: 'tree', id: 'tree_birch_xl', name: 'Темное дерево (XL)', icon: 'B4', color: '#4ade80' },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  reachableCellsCount: number;
  totalWalkableCount: number;
}

/**
 * Validates a level using BFS pathfinding to guarantee accessibility
 * and check for placement inconsistencies.
 */
export function validateLevelData(level: LevelData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rows = level.rows;
  const cols = level.cols;

  // 1. Basic Dimension Checks
  if (cols < 10 || rows < 10) {
    errors.push(`Недопустимый размер карты: ${cols}x${rows} (минимум 10x10).`);
  }

  // Detect whether level.data has been autotiled (contains tile indices > 12 or known autotile wall indices)
  const isAutotiled = level.data.some((row) =>
    row.some((val) => val > 12 || val === TILE_INDEX.WALL_DUNGEON)
  );

  // Helper to test if a grid cell is walkable
  const isWalkable = (c: number, r: number): boolean => {
    if (c < 0 || c >= cols || r < 0 || r >= rows) return false;
    const tileVal = level.data[r]?.[c] ?? 1;
    if (isAutotiled) {
      return FLOOR_INDICES.includes(tileVal);
    }
    return (
      tileVal !== EDITOR_TILE.WALL &&
      tileVal !== EDITOR_TILE.WATER_DEEP &&
      tileVal !== EDITOR_TILE.ICE
    );
  };

  // 2. Check Key POIs
  if (!level.spawn || typeof level.spawn.col !== 'number' || typeof level.spawn.row !== 'number') {
    errors.push('Точка спавна игрока (spawn) не установлена.');
  } else if (!isWalkable(level.spawn.col, level.spawn.row)) {
    errors.push(`Точка спавна [${level.spawn.col}, ${level.spawn.row}] находится внутри стены или препятствия.`);
  }

  if (!level.altar || typeof level.altar.col !== 'number' || typeof level.altar.row !== 'number') {
    errors.push('Алтарь босса (altar) не установлен.');
  } else if (!isWalkable(level.altar.col, level.altar.row)) {
    errors.push(`Алтарь босса [${level.altar.col}, ${level.altar.row}] находится внутри стены.`);
  }

  if (!level.exit || typeof level.exit.col !== 'number' || typeof level.exit.row !== 'number') {
    errors.push('Выход из уровня (exit) не установлен.');
  } else if (!isWalkable(level.exit.col, level.exit.row)) {
    errors.push(`Выход из уровня [${level.exit.col}, ${level.exit.row}] находится внутри стены.`);
  }

  // 3. BFS Reachability from Spawn
  let reachableCellsCount = 0;
  let totalWalkableCount = 0;
  const visited: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isWalkable(c, r)) totalWalkableCount++;
    }
  }

  if (level.spawn && isWalkable(level.spawn.col, level.spawn.row)) {
    const queue: [number, number][] = [[level.spawn.col, level.spawn.row]];
    visited[level.spawn.row][level.spawn.col] = true;

    while (queue.length > 0) {
      const [currC, currR] = queue.shift()!;
      reachableCellsCount++;

      const neighbors = [
        [currC + 1, currR],
        [currC - 1, currR],
        [currC, currR + 1],
        [currC, currR - 1],
      ];

      for (const [nc, nr] of neighbors) {
        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
          if (!visited[nr][nc] && isWalkable(nc, nr)) {
            visited[nr][nc] = true;
            queue.push([nc, nr]);
          }
        }
      }
    }

    if (level.altar && !visited[level.altar.row]?.[level.altar.col]) {
      errors.push(`Алтарь босса [${level.altar.col}, ${level.altar.row}] недостижим от точки спавна.`);
    }

    if (level.exit && !visited[level.exit.row]?.[level.exit.col]) {
      errors.push(`Выход из уровня [${level.exit.col}, ${level.exit.row}] недостижим от точки спавна.`);
    }
  }

  // 4. Entity Placement Validation
  level.enemies.forEach((enemy, i) => {
    if (!isWalkable(enemy.col, enemy.row)) {
      warnings.push(`Враг #${i + 1} (${enemy.kind}) [${enemy.col}, ${enemy.row}] находится в непроходимой клетке.`);
    } else if (!visited[enemy.row]?.[enemy.col]) {
      warnings.push(`Враг #${i + 1} (${enemy.kind}) [${enemy.col}, ${enemy.row}] заблокирован в изолированной зоне.`);
    }
  });

  level.chests.forEach((chest, i) => {
    if (!isWalkable(chest.col, chest.row)) {
      warnings.push(`Сундук #${i + 1} [${chest.col}, ${chest.row}] находится в стене.`);
    } else if (!visited[chest.row]?.[chest.col]) {
      warnings.push(`Сундук #${i + 1} [${chest.col}, ${chest.row}] недостижим от спавна.`);
    }
  });

  level.shrines.forEach((shrine, i) => {
    if (!isWalkable(shrine.col, shrine.row)) {
      warnings.push(`Святилище #${i + 1} (${shrine.kind}) [${shrine.col}, ${shrine.row}] находится в стене.`);
    }
  });

  level.flasks.forEach((flask, i) => {
    if (!isWalkable(flask.col, flask.row)) {
      warnings.push(`Колба #${i + 1} (${flask.key}) [${flask.col}, ${flask.row}] находится в стене.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    reachableCellsCount,
    totalWalkableCount,
  };
}

/**
 * Exports LevelData to formatted TypeScript code ready to paste into `level1.ts`.
 */
export function exportLevelToTypeScript(level: LevelData, functionName = 'buildCustomLevel'): string {
  const cols = level.cols;
  const rows = level.rows;

  let code = `// =========================================================================\n`;
  code += `// ${level.biome.name.toUpperCase()} (Generated by Emberdeep Map Editor)\n`;
  code += `// =========================================================================\n`;
  code += `export function ${functionName}(biome: BiomeConfig, depth: number): LevelData {\n`;
  code += `  const COLS = ${cols};\n`;
  code += `  const ROWS = ${rows};\n\n`;

  code += `  // 1. Semantic Grid Matrix\n`;
  code += `  const data: number[][] = [\n`;
  for (let r = 0; r < rows; r++) {
    const rowValues = level.data[r] || [];
    code += `    [${rowValues.join(', ')}],\n`;
  }
  code += `  ];\n\n`;

  code += `  // 2. Torches (${level.torches.length})\n`;
  code += `  const torches = [\n`;
  level.torches.forEach((t) => {
    code += `    { col: ${t.col}, row: ${t.row} },\n`;
  });
  code += `  ];\n\n`;

  if (level.bonfires && level.bonfires.length > 0) {
    code += `  // 3. Campfires (${level.bonfires.length})\n`;
    code += `  const bonfires = [\n`;
    level.bonfires.forEach((b) => {
      code += `    { col: ${b.col}, row: ${b.row} },\n`;
    });
    code += `  ];\n\n`;
  }

  if (level.trees && level.trees.length > 0) {
    code += `  // 4. Trees (${level.trees.length})\n`;
    code += `  const trees: TreeObject[] = [\n`;
    level.trees.forEach((tr) => {
      code += `    { col: ${tr.col}, row: ${tr.row}, kind: '${tr.kind}' },\n`;
    });
    code += `  ];\n\n`;
  }

  code += `  // 5. Decorations & Obstacles (${level.decorations.length})\n`;
  code += `  const decorations: DecorationObject[] = [\n`;
  level.decorations.forEach((d) => {
    const scaleStr = d.scale ? `, scale: ${d.scale}` : '';
    code += `    { col: ${d.col}, row: ${d.row}, key: '${d.key}', solid: ${d.solid}${scaleStr} },\n`;
  });
  code += `  ];\n\n`;

  code += `  // 6. Chests (${level.chests.length})\n`;
  code += `  const chests = [\n`;
  level.chests.forEach((c) => {
    code += `    { col: ${c.col}, row: ${c.row} },\n`;
  });
  code += `  ];\n\n`;

  code += `  // 7. Shrines (${level.shrines.length})\n`;
  code += `  const shrines = [\n`;
  level.shrines.forEach((s) => {
    code += `    { col: ${s.col}, row: ${s.row}, kind: '${s.kind}' as const },\n`;
  });
  code += `  ];\n\n`;

  code += `  // 8. Supply Flasks (${level.flasks.length})\n`;
  code += `  const flasks = [\n`;
  level.flasks.forEach((f) => {
    code += `    { col: ${f.col}, row: ${f.row}, key: PROP.${f.key.toUpperCase()} },\n`;
  });
  code += `  ];\n\n`;

  code += `  // 9. Enemies (${level.enemies.length})\n`;
  code += `  const enemies: { col: number; row: number; kind: EnemyKind }[] = [\n`;
  level.enemies.forEach((e) => {
    code += `    { col: ${e.col}, row: ${e.row}, kind: '${e.kind}' },\n`;
  });
  code += `  ];\n\n`;

  code += `  return {\n`;
  code += `    biome,\n`;
  code += `    cols: COLS,\n`;
  code += `    rows: ROWS,\n`;
  code += `    data,\n`;
  code += `    spawn: { col: ${level.spawn.col}, row: ${level.spawn.row} },\n`;
  code += `    torches,\n`;
  if (level.bonfires && level.bonfires.length > 0) code += `    bonfires,\n`;
  if (level.trees && level.trees.length > 0) code += `    trees,\n`;
  code += `    decorations,\n`;
  code += `    flasks,\n`;
  code += `    chests,\n`;
  code += `    shrines,\n`;
  code += `    altar: { col: ${level.altar.col}, row: ${level.altar.row} },\n`;
  code += `    exit: { col: ${level.exit.col}, row: ${level.exit.row} },\n`;
  code += `    enemies,\n`;
  code += `  };\n`;
  code += `}\n`;

  return code;
}

/**
 * Creates an empty default level for a given biome and size.
 */
export function createEmptyLevel(biomeId: BiomeId = 'forest', cols = 60, rows = 38): LevelData {
  const depthMap: Record<BiomeId, number> = {
    forest: 1,
    ruins: 2,
    catacombs: 3,
    depths: 4,
    void: 5,
  };
  const biome = getBiomeForDepth(depthMap[biomeId]);

  const data: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(EDITOR_TILE.FLOOR));

  // Build outer mountain/wall border
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < 2 || r >= rows - 2 || c < 2 || c >= cols - 2) {
        data[r][c] = EDITOR_TILE.WALL;
      }
    }
  }

  return {
    biome,
    cols,
    rows,
    data,
    spawn: { col: 5, row: Math.floor(rows / 2) },
    altar: { col: Math.floor(cols * 0.75), row: Math.floor(rows / 2) },
    exit: { col: cols - 5, row: Math.floor(rows / 2) },
    torches: [
      { col: 4, row: Math.floor(rows / 2) - 2 },
      { col: 4, row: Math.floor(rows / 2) + 2 },
    ],
    bonfires: [{ col: 7, row: Math.floor(rows / 2) }],
    trees: [],
    decorations: [],
    flasks: [{ col: 6, row: Math.floor(rows / 2) - 1, key: 'flask_red' as PropKey }],
    chests: [{ col: Math.floor(cols * 0.5), row: Math.floor(rows / 2) }],
    shrines: [{ col: Math.floor(cols * 0.4), row: Math.floor(rows / 2) - 4, kind: 'chance' }],
    enemies: [{ col: Math.floor(cols * 0.6), row: Math.floor(rows / 2), kind: 'skeleton' }],
  };
}

export function serializeLevelToJson(level: LevelData): string {
  return JSON.stringify(level, null, 2);
}

export function deserializeLevelFromJson(jsonStr: string): LevelData {
  const parsed = JSON.parse(jsonStr) as LevelData;
  if (!parsed.cols || !parsed.rows || !parsed.data || !parsed.spawn || !parsed.altar || !parsed.exit) {
    throw new Error('Некорректный JSON формат карты Emberdeep.');
  }
  return parsed;
}
