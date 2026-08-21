export type BiomeId = 'forest' | 'ruins' | 'catacombs' | 'depths' | 'void';

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
      id: 'forest',
      name: 'Темный Лес',
      subtitle: 'Глубина 1 · Дремучая чаща, речной хутор и лесные тропы',
      depth: 1,
      ambientColor: 0x2e3c48, // Nocturnal forest gloom
      dustColor: 0x4a7858,   // Mossy forest wisps
      generationType: 'outdoor',
      wallTile: 13,          // Wall Ruin / Dense forest edge
      floorTiles: [0, 1, 2], // Grass 1..3
      pathTile: 3,           // Dirt
    };
  } else if (depth === 2) {
    return {
      id: 'ruins',
      name: 'Руины',
      subtitle: 'Глубина 2 · Забытая каменная крепость, часовня и некрополь',
      depth: 2,
      ambientColor: 0x323a48, // Cold stone moonlight
      dustColor: 0x6b7280,   // Ancient ash & masonry dust
      generationType: 'outdoor',
      wallTile: 13,          // Wall Ruin
      floorTiles: [5],       // Ruin stone / Cobble
      pathTile: 3,           // Earth
    };
  } else if (depth === 3) {
    return {
      id: 'catacombs',
      name: 'Катакомбы',
      subtitle: 'Глубина 3 · Тюремные блоки, железные решетки и сточный канал',
      depth: 3,
      ambientColor: 0x221a38, // Near-total dungeon darkness
      dustColor: 0x8a7a3a,   // Dim torchlight motes
      generationType: 'bsp_dungeon',
      wallTile: 12,          // Wall Dungeon
      floorTiles: [6, 7, 8, 9], // Dungeon slate 1..4
    };
  } else if (depth === 4) {
    return {
      id: 'depths',
      name: 'Глубины Катакомб',
      subtitle: 'Глубина 4 · Заброшенные штольни, склепы и подземные рельсы',
      depth: 4,
      ambientColor: 0x382218, // Deep subterranean ore haze
      dustColor: 0x8a5a20,   // Ashen ore dust
      generationType: 'bsp_dungeon',
      wallTile: 16,          // Wall Canyon Cliff
      floorTiles: [10, 11],  // Subterranean earth 1..2
    };
  } else {
    return {
      id: 'void',
      name: 'Бездна',
      subtitle: `Глубина ${depth} · Замерзший астральный разлом и Цитадель Бездны`,
      depth,
      ambientColor: 0x141830, // Glacial void twilight
      dustColor: 0x2a5878,   // Cold astral haze particles
      generationType: 'bsp_dungeon',
      wallTile: 17,          // Wall Glacial Ice
      floorTiles: [14, 15],  // Alpine snow 1..2
    };
  }
}
