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
};

const ORDER: PropKey[] = Object.values(PROP);

export function buildPropsAtlas(scene: Phaser.Scene, outKey: string): void {
  buildAtlasFromPack(scene, outKey, ORDER, RECTS);
}
