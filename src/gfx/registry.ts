export const TEXTURE = {
  DUNGEON_TILES: 'tex-dungeon-tiles',
  TORCH: 'tex-torch',
  PROPS: 'tex-props',
  CHEST: 'tex-chest',
  STAIRS: 'tex-stairs',
  HUD_ICONS: 'tex-hud-icons',
  COIN_ANIM: 'tex-coin-anim',
  PARTICLE_SPARK: 'tex-particle-spark',
  PARTICLE_BLOOD: 'tex-particle-blood',
  PARTICLE_BONE: 'tex-particle-bone',
  PARTICLE_WOOD: 'tex-particle-wood',
  DEBRIS_WOOD: 'tex-debris-wood',
  WEAPON_SWORD: 'tex-weapon-sword',
  SLASH_FX: 'tex-slash-fx',
  VIGNETTE: 'tex-vignette',
  BOSS_DEMON: 'tex-boss-demon',
  SKULL: 'tex-skull',
} as const;

export const ANIM = {
  TORCH_FLICKER: 'anim-torch-flicker',
  COIN_SPIN: 'anim-coin-spin',
  BOSS_DEMON_IDLE: 'anim-boss-demon-idle',
  BOSS_DEMON_RUN: 'anim-boss-demon-run',
} as const;

export const FONT = {
  TITLE: '"Cinzel Decorative", serif',
  UI: '"Pixelify Sans", sans-serif',
} as const;

// per-slot tint applied to remote-controlled players so 2-4 knights on
// screen stay visually distinguishable; slot 0 (white) leaves the sprite
// unmodified.
export const PLAYER_TINTS = [0xffffff, 0x8fd0ff, 0x8fffb0, 0xffe08f] as const;
export const PLAYER_LABEL_COLORS = ['#f0e2b8', '#8fd0ff', '#8fffb0', '#ffe08f'] as const;

export const DEPTH = {
  FLOOR: 0,
  DUST: 25,
  DECOR: 15, // static decor outside the y-sorted world (menu torches)
  YSORT_BASE: 100, // GameScene world objects: depth = YSORT_BASE + y, so front/back sorts by position
  OVERLAY: 1000,
  UI: 1001,
} as const;
