import Phaser from 'phaser';

// "Pixel Crawler" (Free Pack) by Anokolisa — see vendor/pixel-crawler/CREDIT.md.
export const PACK = {
  DUNGEON_TILES: { key: 'raw-pc-dungeon-tiles', url: '/assets/pc-dungeon-tiles.png' },
  RESOURCES: { key: 'raw-pc-resources', url: '/assets/pc-resources.png' },
  DUNGEON_PROPS: { key: 'raw-pc-dungeon-props', url: '/assets/pc-dungeon-props.png' },
} as const;

// 0x72's CC0 pack — kept only for the small HUD heart icons.
// See vendor/0x72-dungeon-tileset-ii/CREDIT.md.
export const LEGACY_PACK = { key: 'raw-dungeon-pack', url: '/assets/dungeon-pack.png' };

export function getPackSource(scene: Phaser.Scene, sourceKey: string): CanvasImageSource {
  return scene.textures.get(sourceKey).getSourceImage() as CanvasImageSource;
}

export type Rect = [sourceKey: string, x: number, y: number, w: number, h: number];

/**
 * Crops named rects (each from its own source sheet) into one packed canvas,
 * one per cell, bottom-aligned so mismatched heights still sit on the
 * "ground" consistently. Registers both string and numeric frame names.
 */
export function buildAtlasFromPack(
  scene: Phaser.Scene,
  outKey: string,
  order: string[],
  rects: Record<string, Rect>
): void {
  const cellW = Math.max(...order.map((name) => rects[name][3]));
  const cellH = Math.max(...order.map((name) => rects[name][4]));

  const canvas = document.createElement('canvas');
  canvas.width = cellW * order.length;
  canvas.height = cellH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  order.forEach((name, i) => {
    const [sourceKey, sx, sy, sw, sh] = rects[name];
    const source = getPackSource(scene, sourceKey);
    ctx.drawImage(source, sx, sy, sw, sh, i * cellW, cellH - sh, sw, sh);
  });

  if (scene.textures.exists(outKey)) scene.textures.remove(outKey);
  const texture = scene.textures.addCanvas(outKey, canvas)!;
  order.forEach((name, i) => {
    // register each frame at its OWN crop size (not the shared cell size) —
    // otherwise sprite.width/height reads as the largest prop in the atlas
    // for every prop, which throws off origin centering and any collision
    // box computed from those dimensions (e.g. barrels)
    const [, , , sw, sh] = rects[name];
    texture.add(name, 0, i * cellW, cellH - sh, sw, sh);
    texture.add(i, 0, i * cellW, cellH - sh, sw, sh);
  });
}
