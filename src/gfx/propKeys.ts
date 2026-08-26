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
  ITEM_TITAN_HEART: 'item_titan_heart',
  ITEM_IRON_PAULDRONS: 'item_iron_pauldrons',
  ITEM_LUCKY_HORSESHOE: 'item_lucky_horseshoe',
  ITEM_BERSERKER_WRISTBAND: 'item_berserker_wristband',
  ITEM_FIRE_BLADE: 'item_fire_blade',
  ITEM_FIRE_DASH: 'item_fire_dash',
  ITEM_MOLTEN_CORE: 'item_molten_core',
  ITEM_FROST_EDGE: 'item_frost_edge',
  ITEM_FROST_DASH: 'item_frost_dash',
  ITEM_BLIZZARD_RING: 'item_blizzard_ring',
  ITEM_LIGHTNING_DASH: 'item_lightning_dash',
  ITEM_THUNDER_TALISMAN: 'item_thunder_talisman',
  ITEM_VENOM_VIAL: 'item_venom_vial',
  ITEM_TOXIC_MIST_DASH: 'item_toxic_mist_dash',
  ITEM_CHRONO_HOURGLASS: 'item_chrono_hourglass',
  ITEM_EXECUTIONER_AXE: 'item_executioner_axe',
  ITEM_RADIANT_SHIELD: 'item_radiant_shield',
  ITEM_BLOOD_CHALICE: 'item_blood_chalice',
  ITEM_GIANT_SLAYER_RING: 'item_giant_slayer_ring',
  ITEM_PRISMATIC_PRISM: 'item_prismatic_prism',
} as const;

export type PropKey = (typeof PROP)[keyof typeof PROP];
