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
      name: 'Лесной Хутор и Руины',
      subtitle: 'Глубина 1 · Речной хутор лесоруба и древние руины',
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
      name: 'Катакомбы Тюрьмы и Сток',
      subtitle: 'Глубина 2 · Тюремные блоки с решетками и сточный канал',
      depth: 2,
      ambientColor: 0x3b3352, // Dark dungeon stone
      dustColor: 0xfef08a,   // Torch spark gold
      generationType: 'bsp_dungeon',
      wallTile: 12,          // Wall Dungeon
      floorTiles: [6, 7, 8, 9], // Dungeon slate 1..4
    };
  } else if (depth === 3) {
    return {
      id: 'magma',
      name: 'Горный Каньон и Шахты',
      subtitle: 'Глубина 3 · Скальные террасы, рельсы и штольни',
      depth: 3,
      ambientColor: 0x7c4e32, // Canyon sunlit stone
      dustColor: 0xfbbf24,   // Ore dust gold
      generationType: 'bsp_dungeon',
      wallTile: 16,          // Wall Canyon Cliff
      floorTiles: [10, 11],  // Canyon earth 1..2
    };
  } else {
    return {
      id: 'void',
      name: 'Замерзший Астральный Пик',
      subtitle: `Глубина ${depth} · Ледяные утесы и Цитадель Бездны`,
      depth,
      ambientColor: 0x334168, // Alpine twilight blue
      dustColor: 0x38bdf8,   // Glacial ice sparkle
      generationType: 'bsp_dungeon',
      wallTile: 17,          // Wall Glacial Ice
      floorTiles: [14, 15],  // Alpine snow 1..2
    };
  }
}
