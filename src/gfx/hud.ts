import Phaser from 'phaser';
import { buildAtlasFromPack, Rect, LEGACY_PACK } from './pack';

export const HUD_ICON = {
  HEART_FULL: 'heart_full',
  HEART_HALF: 'heart_half',
  HEART_EMPTY: 'heart_empty',
} as const;

const RECTS: Record<string, Rect> = {
  [HUD_ICON.HEART_FULL]: [LEGACY_PACK.key, 289, 370, 13, 12],
  [HUD_ICON.HEART_HALF]: [LEGACY_PACK.key, 305, 370, 13, 12],
  [HUD_ICON.HEART_EMPTY]: [LEGACY_PACK.key, 321, 370, 13, 12],
};

const ORDER = Object.values(HUD_ICON);

export function buildHudAtlas(scene: Phaser.Scene, outKey: string): void {
  buildAtlasFromPack(scene, outKey, ORDER, RECTS);
}
