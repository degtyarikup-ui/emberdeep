import type { LevelData } from '../world/level1';
import type { PropKey } from '../gfx/propKeys';
import { getBiomeForDepth, type BiomeId } from '../world/biomes';
import { FLOOR_INDICES, TILE_INDEX } from '../gfx/tileIndex';

export const EDITOR_TILE = {
  FLOOR: 0,
  WALL: 1,
  PATH: 2,
  RUIN_FLOOR: 3,
  WATER_DEEP: 5,
  BRIDGE: 7,
  SNOW: 8,
  ICE: 9,
  CANYON_DIRT: 10,
  RAIL: 11,
  GRATE: 12,
} as const;

export type EditorTileType = (typeof EDITOR_TILE)[keyof typeof EDITOR_TILE];

export interface TileMeta {
  id: EditorTileType;
  name: string;
  color: string;
  solid: boolean;
  walkable: boolean;
}

export const TILE_METAS: Record<EditorTileType, TileMeta> = {
  [EDITOR_TILE.FLOOR]: { id: EDITOR_TILE.FLOOR, name: 'Пол / Трава', color: '#166534', solid: false, walkable: true },
  [EDITOR_TILE.WALL]: { id: EDITOR_TILE.WALL, name: 'Стена / Гора', color: '#334155', solid: true, walkable: false },
  [EDITOR_TILE.PATH]: { id: EDITOR_TILE.PATH, name: 'Тропа / Дорога', color: '#78350f', solid: false, walkable: true },
  [EDITOR_TILE.RUIN_FLOOR]: { id: EDITOR_TILE.RUIN_FLOOR, name: 'Каменный пол', color: '#475569', solid: false, walkable: true },
  [EDITOR_TILE.WATER_DEEP]: { id: EDITOR_TILE.WATER_DEEP, name: 'Глубокая вода', color: '#1e3a8a', solid: true, walkable: false },
  [EDITOR_TILE.BRIDGE]: { id: EDITOR_TILE.BRIDGE, name: 'Деревянный мост', color: '#92400e', solid: false, walkable: true },
  [EDITOR_TILE.SNOW]: { id: EDITOR_TILE.SNOW, name: 'Снег', color: '#94a3b8', solid: false, walkable: true },
  [EDITOR_TILE.ICE]: { id: EDITOR_TILE.ICE, name: 'Лед', color: '#38bdf8', solid: true, walkable: false },
  [EDITOR_TILE.CANYON_DIRT]: { id: EDITOR_TILE.CANYON_DIRT, name: 'Земля каньона', color: '#57534e', solid: false, walkable: true },
  [EDITOR_TILE.RAIL]: { id: EDITOR_TILE.RAIL, name: 'Рельсы', color: '#71717a', solid: false, walkable: true },
  [EDITOR_TILE.GRATE]: { id: EDITOR_TILE.GRATE, name: 'Решетка канализации', color: '#27272a', solid: false, walkable: true },
};

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

  // Trees
  { category: 'tree', id: 'tree_pine', name: 'Сосна', icon: 'PN', color: '#15803d' },
  { category: 'tree', id: 'tree_oak', name: 'Дуб', icon: 'OK', color: '#16a34a' },
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
