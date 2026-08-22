import Phaser from 'phaser';
import { buildAtlasFromPack, PACK, LEGACY_PACK, Rect } from './pack';

// Re-exported for existing importers; data lives in a Phaser-free module.
export { PROP } from './propKeys';
export type { PropKey } from './propKeys';
import { PROP } from './propKeys';
import type { PropKey } from './propKeys';


const RECTS: Record<PropKey, Rect> = {
  [PROP.BARREL]: [PACK.DUNGEON_PROPS.key, 96, 0, 16, 22],
  [PROP.CRATE]: [LEGACY_PACK.key, 288, 408, 16, 24],
  [PROP.TOMBSTONE]: [PACK.DUNGEON_PROPS.key, 96, 0, 16, 22],
  [PROP.BANNER_RED]: [PACK.DUNGEON_PROPS.key, 64, 64, 16, 27],
  [PROP.BANNER_BLUE]: [PACK.DUNGEON_PROPS.key, 80, 64, 16, 27],
  [PROP.BANNER_GREEN]: [PACK.DUNGEON_PROPS.key, 96, 64, 16, 27],
  [PROP.FLASK_RED]: [LEGACY_PACK.key, 288, 336, 16, 16],
  [PROP.FLASK_BLUE]: [LEGACY_PACK.key, 304, 336, 16, 16],
  [PROP.FLASK_GREEN]: [LEGACY_PACK.key, 320, 336, 16, 16],
  [PROP.FLASK_YELLOW]: [LEGACY_PACK.key, 336, 336, 16, 16],
  [PROP.COIN]: [LEGACY_PACK.key, 288, 384, 16, 16],
  [PROP.ITEM_WHETSTONE]: [PACK.RESOURCES.key, 0, 64, 16, 16],
  [PROP.ITEM_BOOTS]: [PACK.RESOURCES.key, 64, 80, 16, 16],
  [PROP.ITEM_CRIT_DAGGER]: [PACK.RESOURCES.key, 96, 16, 16, 16],
  [PROP.ITEM_LEECH_FANG]: [PACK.RESOURCES.key, 0, 48, 16, 16],
  [PROP.ITEM_STORM_EARRING]: [PACK.RESOURCES.key, 64, 16, 16, 16],
  [PROP.ITEM_OIL_LAMP]: [PACK.RESOURCES.key, 16, 48, 16, 16],
  [PROP.ITEM_IMMORTAL_CROWN]: [PACK.RESOURCES.key, 64, 48, 16, 16],
};

const ORDER: PropKey[] = Object.values(PROP);

export function buildPropsAtlas(scene: Phaser.Scene, outKey: string): void {
  buildAtlasFromPack(scene, outKey, ORDER, RECTS);
}
