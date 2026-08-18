export type BiomeId = 'ruins' | 'catacombs' | 'magma' | 'void';

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  subtitle: string;
  depth: number;
  ambientColor: number;
  dustColor: number;
  generationType: 'outdoor' | 'bsp_dungeon' | 'cavern';
  wallTile: number;
  floorTiles: number[];
  pathTile?: number;
}

export function getBiomeForDepth(depth: number): BiomeConfig {
  if (depth === 1) {
    return {
      id: 'ruins',
      name: 'Забытые Руины',
      subtitle: 'Глубина 1 · Поверхность под луной',
      depth: 1,
      ambientColor: 0x5a6e8c, // Clear, crisp moonlight
      dustColor: 0x86efac,   // Forest firefly green
      generationType: 'outdoor',
      wallTile: 13,          // Wall Ruin
      floorTiles: [0, 1, 2], // Grass 1..3
      pathTile: 3,           // Dirt
    };
  } else if (depth === 2) {
    return {
      id: 'catacombs',
      name: 'Тёмные Катакомбы',
      subtitle: 'Глубина 2 · Древний склеп',
      depth: 2,
      ambientColor: 0x453a68, // Mystic purple
      dustColor: 0xfef08a,   // Torch spark gold
      generationType: 'bsp_dungeon',
      wallTile: 12,          // Wall Dungeon
      floorTiles: [6, 7, 8, 9], // Dungeon stone 1..4
    };
  } else if (depth === 3) {
    return {
      id: 'magma',
      name: 'Пылающие Недра',
      subtitle: 'Глубина 3 · Лавовое ядро',
      depth: 3,
      ambientColor: 0x8a2c14, // Magma amber red
      dustColor: 0xf97316,   // Fire ember orange
      generationType: 'bsp_dungeon',
      wallTile: 16,          // Wall Magma (Volcanic obsidian with lava cracks)
      floorTiles: [10, 11],  // Magma stone 1..2
    };
  } else {
    return {
      id: 'void',
      name: 'Цитадель Бездны',
      subtitle: `Глубина ${depth} · Эпицентр Тлена`,
      depth,
      ambientColor: 0x241442, // Void dark purple
      dustColor: 0xc084fc,   // Cosmic purple
      generationType: 'bsp_dungeon',
      wallTile: 17,          // Wall Void (Amethyst Astral Wall)
      floorTiles: [14, 15],  // Void astral stone 1..2
    };
  }
}
