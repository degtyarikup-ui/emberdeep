import Phaser from 'phaser';
import { buildAtlasFromPack, PACK, LEGACY_PACK, Rect } from './pack';

export const PROP = {
  BARREL: 'barrel',
  CRATE: 'crate',
  TOMBSTONE: 'tombstone',
  BANNER_RED: 'banner_red',
  BANNER_BLUE: 'banner_blue',
  BANNER_GREEN: 'banner_green',
  FLASK_RED: 'flask_red',
  FLASK_BLUE: 'flask_blue',
  FLASK_GREEN: 'flask_green',
  FLASK_YELLOW: 'flask_yellow',
  COIN: 'coin',
  ITEM_WHETSTONE: 'item_whetstone',
  ITEM_BOOTS: 'item_boots',
  ITEM_CRIT_DAGGER: 'item_crit_dagger',
  ITEM_LEECH_FANG: 'item_leech_fang',
  ITEM_STORM_EARRING: 'item_storm_earring',
  ITEM_OIL_LAMP: 'item_oil_lamp',
  ITEM_IMMORTAL_CROWN: 'item_immortal_crown',
} as const;

export type PropKey = (typeof PROP)[keyof typeof PROP];

const RECTS: Record<PropKey, Rect> = {
  [PROP.BARREL]: [PACK.RESOURCES.key, 14, 154, 17, 22],
  [PROP.CRATE]: [LEGACY_PACK.key, 288, 408, 16, 24],
  [PROP.TOMBSTONE]: [PACK.DUNGEON_PROPS.key, 96, 1, 15, 25],
  [PROP.BANNER_RED]: [PACK.DUNGEON_PROPS.key, 60, 60, 16, 30],
  [PROP.BANNER_BLUE]: [PACK.DUNGEON_PROPS.key, 76, 60, 16, 30],
  [PROP.BANNER_GREEN]: [PACK.DUNGEON_PROPS.key, 92, 60, 16, 30],
  [PROP.FLASK_RED]: [PACK.RESOURCES.key, 6, 51, 6, 9],
  [PROP.FLASK_BLUE]: [PACK.RESOURCES.key, 38, 51, 5, 9],
  [PROP.FLASK_GREEN]: [PACK.RESOURCES.key, 54, 51, 5, 9],
  [PROP.FLASK_YELLOW]: [PACK.RESOURCES.key, 21, 51, 5, 9],
  [PROP.COIN]: [PACK.RESOURCES.key, 0, 0, 16, 16],
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
