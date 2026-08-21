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
      ambientColor: 0x3a4a60, // Dim twilight — oppressive dusk
      dustColor: 0x4a7858,   // Dark swamp wisps
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
      ambientColor: 0x221a38, // Near-total dungeon darkness
      dustColor: 0x8a7a3a,   // Dim torchlight motes
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
      ambientColor: 0x4a2e1e, // Smoldering ember glow
      dustColor: 0x8a5a20,   // Ashen ore dust
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
      ambientColor: 0x1a2040, // Frozen abyss twilight
      dustColor: 0x2a5878,   // Cold haze particles
      generationType: 'bsp_dungeon',
      wallTile: 17,          // Wall Glacial Ice
      floorTiles: [14, 15],  // Alpine snow 1..2
    };
  }
}
