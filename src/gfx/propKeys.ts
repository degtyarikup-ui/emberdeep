/**
 * Pure prop-key data, deliberately free of any Phaser import.
 *
 * Level generation references these keys but needs no renderer; keeping them
 * separate lets that logic be unit-tested without pulling in Phaser and a
 * canvas. gfx/props.ts re-exports them, so existing imports keep working.
 */

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
