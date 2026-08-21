import Phaser from 'phaser';
import { TEXTURE } from './registry';

/**
 * 32rogues Items Map: 11 columns (0..10), 26 rows (0..25) in items-32rogues.png (352x832).
 * Each icon is exactly 32x32 px.
 */
export const ITEM_SPRITE_MAP: Record<string, { col: number; row: number }> = {
  // Common
  whetstone: { col: 4, row: 4 }, // Blacksmith stone / hammer
  boots: { col: 1, row: 13 }, // Leather boots
  crit_dagger: { col: 7, row: 0 }, // Magic dagger
  titan_heart: { col: 6, row: 15 }, // Ruby Heart Gem
  midas_coin: { col: 0, row: 17 }, // Golden Coin Stack
  iron_pauldrons: { col: 2, row: 14 }, // Spiked Iron Armor / Pauldrons
  lucky_horseshoe: { col: 3, row: 17 }, // Lucky Golden Horseshoe
  berserker_wristband: { col: 0, row: 15 }, // Spiked Berserker Ring

  // Uncommon & Elemental
  fire_blade: { col: 10, row: 0 }, // Flame sword
  fire_dash: { col: 3, row: 13 }, // Flame greaves
  oil_lamp: { col: 5, row: 18 }, // Oil potion / lamp
  molten_core: { col: 7, row: 22 }, // Blazing Magma Core / Ore
  frost_edge: { col: 8, row: 0 }, // Crystal frost sword
  frost_dash: { col: 4, row: 13 }, // Ice boots
  blizzard_ring: { col: 8, row: 15 }, // Sapphire Ice Ring
  storm_earring: { col: 2, row: 15 }, // Lightning earring / amulet
  lightning_dash: { col: 2, row: 13 }, // Winged boots
  thunder_talisman: { col: 3, row: 15 }, // Golden Thunder Talisman
  venom_vial: { col: 4, row: 18 }, // Poison potion bottle
  leech_fang: { col: 6, row: 0 }, // Sanguine vampire fang
  toxic_mist_dash: { col: 5, row: 13 }, // Venom boots
  chrono_hourglass: { col: 1, row: 24 }, // Golden Hourglass of Time
  executioner_axe: { col: 2, row: 1 }, // Heavy Executioner Battleaxe

  // Legendary
  immortal_crown: { col: 4, row: 12 }, // Golden Crown
  radiant_shield: { col: 3, row: 11 }, // Golden Radiant Shield
  blood_chalice: { col: 7, row: 17 }, // Royal Sanguine Chalice
  giant_slayer_ring: { col: 5, row: 15 }, // Onyx Giant Slayer Ring
  prismatic_prism: { col: 9, row: 22 }, // Prismatic Diamond Crystal

  // Weapons & Actions
  knight_sword: { col: 3, row: 0 }, // Longsword
  ranger_bow: { col: 0, row: 9 }, // Hunting Bow
  wizard_staff: { col: 0, row: 10 }, // Magic Staff
  supernova_icon: { col: 4, row: 15 }, // Arcane Star Orb
  shield: { col: 1, row: 11 }, // Iron Shield
  dash_icon: { col: 5, row: 13 }, // Swift boots
  interact_icon: { col: 6, row: 17 }, // Hand / key
  potion_hp: { col: 0, row: 18 }, // Red health potion
};

export class UIAtlas {
  /**
   * Builds the procedural 9-slice and ornate frame textures onto Phaser texture manager.
   */
  public static buildAtlas(scene: Phaser.Scene): void {
    UIAtlas.buildPanelNineTexture(scene);
    UIAtlas.buildSlotTexture(scene);
    UIAtlas.buildOrnateBorderTexture(scene);
    UIAtlas.buildSkullTexture(scene);
    UIAtlas.buildEmberTexture(scene);
    UIAtlas.buildHeroPortraits(scene);
  }

  private static buildPanelNineTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE.UI_PANEL_NINE)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    // Dark gothic stone background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 48, 48);

    // Inner bevel gradient
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 4, 40, 40);

    // Deep plate center
    ctx.fillStyle = '#090d16';
    ctx.fillRect(6, 6, 36, 36);

    // Outer golden frame border
    ctx.strokeStyle = '#8a5a15';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 46, 46);

    // Inner bright gold highlight
    ctx.strokeStyle = '#a07820';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, 42, 42);

    // Corner ornate gems (4x4 red ruby corners)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, 5, 5);
    ctx.fillRect(43, 0, 5, 5);
    ctx.fillRect(0, 43, 5, 5);
    ctx.fillRect(43, 43, 5, 5);

    // Gold stud on corners
    ctx.fillStyle = '#fde047';
    ctx.fillRect(1, 1, 3, 3);
    ctx.fillRect(44, 1, 3, 3);
    ctx.fillRect(1, 44, 3, 3);
    ctx.fillRect(44, 44, 3, 3);

    scene.textures.addCanvas(TEXTURE.UI_PANEL_NINE, canvas);
  }

  private static buildSlotTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE.UI_SLOT_FRAME)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 36;
    canvas.height = 36;
    const ctx = canvas.getContext('2d')!;

    // Outer dark shadow
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 36, 36);

    // Inset slot cavity
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(2, 2, 32, 32);

    // Metallic beveled border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 32, 32);

    // Top & Left inner highlight
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3, 33);
    ctx.lineTo(3, 3);
    ctx.lineTo(33, 3);
    ctx.stroke();

    scene.textures.addCanvas(TEXTURE.UI_SLOT_FRAME, canvas);
  }

  private static buildOrnateBorderTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE.UI_HP_BAR_FRAME)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = '#8a5a15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, 14, 14);

    scene.textures.addCanvas(TEXTURE.UI_HP_BAR_FRAME, canvas);
  }

  private static buildSkullTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE.UI_SKULL_ORNAMENT)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    // Cranium
    ctx.fillRect(6, 4, 12, 10);
    // Horns
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(3, 2, 3, 6);
    ctx.fillRect(18, 2, 3, 6);
    ctx.fillRect(1, 0, 3, 4);
    ctx.fillRect(20, 0, 3, 4);
    // Jaw
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(8, 14, 8, 5);
    // Eye sockets
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(7, 8, 3, 4);
    ctx.fillRect(14, 8, 3, 4);
    // Glowing red eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(8, 9, 2, 2);
    ctx.fillRect(14, 9, 2, 2);

    scene.textures.addCanvas(TEXTURE.UI_SKULL_ORNAMENT, canvas);
  }

  private static buildEmberTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE.UI_EMBER_ICON)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    // Glowing Ember Flame
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(8, 1);
    ctx.quadraticCurveTo(15, 7, 13, 12);
    ctx.quadraticCurveTo(10, 15, 8, 15);
    ctx.quadraticCurveTo(6, 15, 3, 12);
    ctx.quadraticCurveTo(1, 7, 8, 1);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.quadraticCurveTo(11, 8, 10, 12);
    ctx.quadraticCurveTo(8, 14, 8, 14);
    ctx.quadraticCurveTo(6, 14, 6, 12);
    ctx.quadraticCurveTo(5, 8, 8, 5);
    ctx.fill();

    scene.textures.addCanvas(TEXTURE.UI_EMBER_ICON, canvas);
  }

  private static buildHeroPortraits(scene: Phaser.Scene): void {
    // 1. Knight Portrait (32x32)
    if (!scene.textures.exists(TEXTURE.UI_HERO_PORTRAIT_KNIGHT)) {
      const kCanvas = document.createElement('canvas');
      kCanvas.width = 32;
      kCanvas.height = 32;
      const kCtx = kCanvas.getContext('2d')!;

      // Blue gradient helmet shield
      kCtx.fillStyle = '#1e293b';
      kCtx.fillRect(0, 0, 32, 32);

      // Steel Helmet Visor
      kCtx.fillStyle = '#94a3b8';
      kCtx.fillRect(6, 4, 20, 22);
      kCtx.fillStyle = '#cbd5e1';
      kCtx.fillRect(8, 6, 16, 18);

      // Golden Crest
      kCtx.fillStyle = '#f59e0b';
      kCtx.fillRect(14, 1, 4, 6);
      kCtx.fillRect(12, 3, 8, 2);

      // Visor slit
      kCtx.fillStyle = '#0f172a';
      kCtx.fillRect(8, 13, 16, 3);
      kCtx.fillStyle = '#38bdf8'; // Blue eye gleam
      kCtx.fillRect(11, 14, 3, 1);
      kCtx.fillRect(18, 14, 3, 1);

      // Gold border
      kCtx.strokeStyle = '#8a5a15';
      kCtx.lineWidth = 2;
      kCtx.strokeRect(1, 1, 30, 30);

      scene.textures.addCanvas(TEXTURE.UI_HERO_PORTRAIT_KNIGHT, kCanvas);
    }

    // 2. Ranger Portrait (32x32)
    if (!scene.textures.exists(TEXTURE.UI_HERO_PORTRAIT_RANGER)) {
      const rCanvas = document.createElement('canvas');
      rCanvas.width = 32;
      rCanvas.height = 32;
      const rCtx = rCanvas.getContext('2d')!;

      // Green forest hood
      rCtx.fillStyle = '#064e3b';
      rCtx.fillRect(0, 0, 32, 32);

      // Green Hood Cloak
      rCtx.fillStyle = '#047857';
      rCtx.beginPath();
      rCtx.moveTo(16, 2);
      rCtx.lineTo(28, 28);
      rCtx.lineTo(4, 28);
      rCtx.closePath();
      rCtx.fill();

      // Shadowed Face under hood
      rCtx.fillStyle = '#0f172a';
      rCtx.fillRect(9, 11, 14, 12);

      // Glowing green eyes
      rCtx.fillStyle = '#4ade80';
      rCtx.fillRect(11, 14, 3, 2);
      rCtx.fillRect(18, 14, 3, 2);

      // Gold border
      rCtx.strokeStyle = '#10b981';
      rCtx.lineWidth = 2;
      rCtx.strokeRect(1, 1, 30, 30);

      scene.textures.addCanvas(TEXTURE.UI_HERO_PORTRAIT_RANGER, rCanvas);
    }

    // 3. Wizard Portrait (32x32)
    if (!scene.textures.exists(TEXTURE.UI_HERO_PORTRAIT_WIZARD)) {
      const wCanvas = document.createElement('canvas');
      wCanvas.width = 32;
      wCanvas.height = 32;
      const wCtx = wCanvas.getContext('2d')!;

      // Deep Arcane Indigo background
      wCtx.fillStyle = '#1e1035';
      wCtx.fillRect(0, 0, 32, 32);

      // Pointed Wizard Hat / Hood
      wCtx.fillStyle = '#6b21a8';
      wCtx.beginPath();
      wCtx.moveTo(16, 2);
      wCtx.lineTo(29, 27);
      wCtx.lineTo(3, 27);
      wCtx.closePath();
      wCtx.fill();

      // Hat Brim
      wCtx.fillStyle = '#9333ea';
      wCtx.fillRect(2, 14, 28, 3);

      // Glowing Arcane Star Crystal on Hat
      wCtx.fillStyle = '#f0abfc';
      wCtx.fillRect(15, 6, 2, 2);
      wCtx.fillStyle = '#ffffff';
      wCtx.fillRect(15, 7, 2, 1);

      // Shadowed Mystic Face under cowl
      wCtx.fillStyle = '#0b0518';
      wCtx.fillRect(8, 16, 16, 10);

      // Glowing Purple-Cyan Arcane Eyes
      wCtx.fillStyle = '#c084fc';
      wCtx.fillRect(10, 18, 3, 2);
      wCtx.fillRect(19, 18, 3, 2);
      wCtx.fillStyle = '#38bdf8';
      wCtx.fillRect(11, 18, 1, 1);
      wCtx.fillRect(20, 18, 1, 1);

      // Arcane Violet / Gold Border
      wCtx.strokeStyle = '#c084fc';
      wCtx.lineWidth = 2;
      wCtx.strokeRect(1, 1, 30, 30);

      scene.textures.addCanvas(TEXTURE.UI_HERO_PORTRAIT_WIZARD, wCanvas);
    }
  }

  /**
   * Helper to create an ornate 9-slice panel container.
   */
  public static createPanel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    strokeColor = 0x8a5a15,
    fillColor = 0x0f172a
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    const bg = scene.add.rectangle(0, 0, width, height, fillColor, 0.92);
    bg.setStrokeStyle(2, strokeColor, 0.95);
    container.add(bg);

    const inner = scene.add.rectangle(0, 0, width - 6, height - 6, 0x090d16, 0.4);
    inner.setStrokeStyle(1, 0xfbbf24, 0.35);
    container.add(inner);

    // 4 Corner Gold Studs
    const hw = width / 2;
    const hh = height / 2;
    const studPositions = [
      [-hw + 4, -hh + 4],
      [hw - 4, -hh + 4],
      [-hw + 4, hh - 4],
      [hw - 4, hh - 4],
    ];

    studPositions.forEach(([sx, sy]) => {
      const stud = scene.add.rectangle(sx, sy, 4, 4, 0xf59e0b);
      stud.setStrokeStyle(1, 0x78350f);
      container.add(stud);
    });

    return container;
  }
}
