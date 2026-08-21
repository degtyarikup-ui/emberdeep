// Curated dark-fantasy dungeon palette. Kept small and cohesive on purpose —
// every sprite in the game draws only from this set so nothing clashes.
export const PALETTE = {
  void: '#0d0a10',
  shadowDeep: '#17121e',
  shadowPurple: '#241c2e',

  stoneDarkest: '#2c2632',
  stoneDark: '#3f3847',
  stoneMid: '#5b5468',
  stoneLight: '#837a8f',
  stoneHighlight: '#b3aabd',
  stoneMortar: '#221d29',

  floorDark: '#221d29',
  floorMid: '#332c3d',
  floorFleck: '#443a52',

  mossDark: '#263a2c',
  moss: '#3f5c42',
  mossLight: '#5c7d55',

  emberDeep: '#7a2e17',
  emberMid: '#c0512c',
  emberBright: '#e88a3c',
  emberCore: '#ffce6b',
  emberWhite: '#fff3d6',

  bloodDark: '#4a1420',
  blood: '#7a1f2b',
  bloodBright: '#a83341',

  metalDark: '#3a3d42',
  metal: '#6b7076',
  metalLight: '#9aa0a8',
  metalShine: '#cdd3d8',

  skinShadow: '#7c5643',
  skin: '#c99270',
  skinLight: '#e0b48f',

  cloakDark: '#201a2c',
  cloak: '#362a48',
  cloakMid: '#4a3a63',
  cloakTrim: '#a9823c',
  cloakTrimLight: '#d9b45c',

  abyssBlack: '#060408',
  fogGray: '#1a1520',
  ashGray: '#2a2530',
  rustBrown: '#3d2218',
  tarnishedGold: '#8a6e2f',
  wornBrass: '#6b5420',
  parchment: '#d4c4a0',
  boneWhite: '#c8bca0',

  white: '#f3ece0',
} as const;

export type PaletteKey = keyof typeof PALETTE;

export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
