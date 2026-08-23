import Phaser from 'phaser';
import { buildDungeonTileset } from '../gfx/tiles';
import { buildPropsAtlas } from '../gfx/props';
import { buildChestTexture } from '../gfx/chest';
import { buildStairsTexture } from '../gfx/stairs';
import { ACTORS, createActorAnims, preloadActor } from '../gfx/actors';
import { buildHudAtlas } from '../gfx/hud';
import { PACK, LEGACY_PACK, asset } from '../gfx/pack';
import { ANIM, TEXTURE } from '../gfx/registry';
import { UIAtlas } from '../gfx/UIAtlas';
import { PixelUI } from '../gfx/PixelUI';
import { SCENE } from './keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.BOOT);
  }

  preload(): void {
    this.load.image(PACK.DUNGEON_TILES.key, PACK.DUNGEON_TILES.url);
    this.load.image(PACK.RESOURCES.key, PACK.RESOURCES.url);
    this.load.image(PACK.DUNGEON_PROPS.key, PACK.DUNGEON_PROPS.url);
    this.load.image(LEGACY_PACK.key, LEGACY_PACK.url);
    this.load.image(TEXTURE.WEAPON_SWORD, asset('weapon-knight-sword.png'));
    this.load.image(TEXTURE.BOW, asset('bow.png'));
    this.load.image(TEXTURE.BOW_DRAWN, asset('bow_drawn.png'));
    this.load.image(TEXTURE.ARROW, asset('arrow.png'));
    this.load.image(TEXTURE.SLASH_WHIRLWIND, asset('slash_whirlwind.png'));
    this.load.spritesheet(TEXTURE.COIN_ANIM, asset('coin-anim.png'), { frameWidth: 8, frameHeight: 8 });
    this.load.spritesheet(TEXTURE.BOSS_DEMON, asset('big_demon.png'), { frameWidth: 32, frameHeight: 36 });
    this.load.image(TEXTURE.SKULL, asset('skull.png'));
    this.load.image(TEXTURE.PROJECTILE_DEMON, asset('projectile_demon.png'));
    this.load.spritesheet(TEXTURE.RANGER_IDLE, asset('ranger-idle.png'), { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet(TEXTURE.RANGER_RUN, asset('ranger-run.png'), { frameWidth: 32, frameHeight: 32 });
    this.load.image(TEXTURE.TILES_BIOME, asset('tiles-biome.png'));
    this.load.image(TEXTURE.TREE_PINE, asset('tree_pine.png'));
    this.load.image(TEXTURE.TREE_OAK, asset('tree_oak.png'));
    this.load.image(TEXTURE.PROP_ROCK, asset('prop_rock.png'));
    this.load.image(TEXTURE.PROP_ROCK_LARGE, asset('prop_rock_large.png'));
    this.load.image(TEXTURE.PROP_BUSH, asset('prop_bush.png'));
    this.load.image(TEXTURE.PROP_CRATE, asset('prop_crate.png'));
    this.load.image(TEXTURE.PROP_BARREL, asset('prop_barrel.png'));
    this.load.image(TEXTURE.PROP_REEDS, asset('prop_reeds.png'));
    this.load.image(TEXTURE.PROP_STATUE, asset('prop_statue.png'));
    this.load.spritesheet(TEXTURE.BONFIRE, asset('bonfire-sheet.png'), { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet(TEXTURE.TORCH, asset('torch-sheet.png'), { frameWidth: 16, frameHeight: 16 });
    this.load.image(TEXTURE.PROP_CABIN, asset('prop_cabin.png'));
    this.load.image(TEXTURE.PROP_FENCE, asset('prop_fence.png'));
    this.load.image(TEXTURE.PROP_WORKBENCH, asset('prop_workbench.png'));
    this.load.image(TEXTURE.PROP_PRISON_BARS, asset('prop_prison_bars.png'));
    this.load.image(TEXTURE.PROP_CHAINS, asset('prop_chains.png'));
    this.load.image(TEXTURE.PROP_BLOOD_SPILL, asset('prop_blood_spill.png'));
    this.load.image(TEXTURE.PROP_MINE_SHAFT, asset('prop_mine_shaft.png'));
    this.load.image(TEXTURE.PROP_MINECART, asset('prop_minecart.png'));
    this.load.image(TEXTURE.PROP_LUPINE, asset('prop_lupine.png'));
    this.load.image(TEXTURE.PROP_MUSHROOM_GIANT, asset('prop_mushroom_giant.png'));
    this.load.image(TEXTURE.PROP_ICE_CRYSTAL, asset('prop_ice_crystal.png'));
    this.load.image(TEXTURE.PROP_VOID_OBELISK, asset('prop_void_obelisk.png'));
    this.load.image(TEXTURE.GAME_EMBLEM, asset('emblem.png'));

    // Phase 3 Prop Animations. These frames originate from the 0x72 pack, but
    // load from public/assets like everything else — vendor/ is a source
    // library that is NOT copied into the production build, and raw paths
    // there also bypass the base-URL rewrite the deployed site needs.
    for (let i = 0; i <= 3; i++) {
      this.load.image(`${TEXTURE.PROP_SPIKES}_f${i}`, asset(`floor_spikes_anim_f${i}.png`));
      this.load.image(`${TEXTURE.WIZARD_IDLE}_f${i}`, asset(`wizzard_m_idle_anim_f${i}.png`));
      this.load.image(`${TEXTURE.WIZARD_RUN}_f${i}`, asset(`wizzard_m_run_anim_f${i}.png`));
      this.load.image(`${TEXTURE.BOSS_ORC_IDLE}_f${i}`, asset(`ogre_idle_anim_f${i}.png`));
      this.load.image(`${TEXTURE.BOSS_ORC_RUN}_f${i}`, asset(`ogre_run_anim_f${i}.png`));
    }
    for (let i = 0; i <= 2; i++) {
      this.load.image(`${TEXTURE.FOUNTAIN_BLUE}_f${i}`, asset(`wall_fountain_mid_blue_anim_f${i}.png`));
      this.load.image(`${TEXTURE.FOUNTAIN_RED}_f${i}`, asset(`wall_fountain_mid_red_anim_f${i}.png`));
      this.load.image(`${TEXTURE.CHEST_ANIM}_f${i}`, asset(`chest_full_open_anim_f${i}.png`));
    }
    this.load.image(TEXTURE.STAFF, asset('weapon_red_magic_staff.png'));
    this.load.image(TEXTURE.WEAPON_BOSS_ORC_AXE, asset('weapon-boss-orc-axe.png'));
    this.load.spritesheet(TEXTURE.WATER_WAVES, asset('water-waves-32rogues.png'), { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet(TEXTURE.ITEMS_32ROGUES, asset('items-32rogues.png'), { frameWidth: 32, frameHeight: 32 });

    preloadActor(this, ACTORS.HERO);
    preloadActor(this, ACTORS.ORC);
    preloadActor(this, ACTORS.SKELETON);
    preloadActor(this, ACTORS.WOLF);
  }

  create(): void {
    buildDungeonTileset(this, TEXTURE.DUNGEON_TILES);
    buildPropsAtlas(this, TEXTURE.PROPS);
    buildChestTexture(this, TEXTURE.CHEST);
    buildStairsTexture(this, TEXTURE.STAIRS);
    buildHudAtlas(this, TEXTURE.HUD_ICONS);
    UIAtlas.buildAtlas(this);
    PixelUI.buildTextures(this);
    this.buildParticleTexture();
    this.buildBloodParticleTexture();
    this.buildBoneParticleTexture();
    this.buildWoodParticleTexture();
    this.buildWoodDebrisTexture();
    this.buildSlashFxTexture();
    this.buildEnergyProjectileTexture();
    this.buildVignetteTexture();
    this.buildDustParticleTexture();
    this.buildSmokeParticleTexture();
    this.buildLeafParticleTexture();
    this.buildShadowTexture();

    this.anims.create({
      key: ANIM.TORCH_FLICKER,
      frames: this.anims.generateFrameNumbers(TEXTURE.TORCH, { start: 0, end: 3 }),
      frameRate: 9,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.COIN_SPIN,
      frames: this.anims.generateFrameNumbers(TEXTURE.COIN_ANIM, { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.BOSS_DEMON_IDLE,
      frames: this.anims.generateFrameNumbers(TEXTURE.BOSS_DEMON, { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.BOSS_DEMON_RUN,
      frames: this.anims.generateFrameNumbers(TEXTURE.BOSS_DEMON, { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.BOSS_ORC_IDLE,
      frames: [0, 1, 2, 3].map(i => ({ key: `${TEXTURE.BOSS_ORC_IDLE}_f${i}` })),
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.BOSS_ORC_RUN,
      frames: [0, 1, 2, 3].map(i => ({ key: `${TEXTURE.BOSS_ORC_RUN}_f${i}` })),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.RANGER_IDLE,
      frames: this.anims.generateFrameNumbers(TEXTURE.RANGER_IDLE, { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.RANGER_RUN,
      frames: this.anims.generateFrameNumbers(TEXTURE.RANGER_RUN, { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.WIZARD_IDLE,
      frames: [0, 1, 2, 3].map(i => ({ key: `${TEXTURE.WIZARD_IDLE}_f${i}` })),
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.WIZARD_RUN,
      frames: [0, 1, 2, 3].map(i => ({ key: `${TEXTURE.WIZARD_RUN}_f${i}` })),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.BONFIRE_FLICKER,
      frames: this.anims.generateFrameNumbers(TEXTURE.BONFIRE, { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.SPIKES_CYCLE,
      frames: [0, 1, 2, 3].map(i => ({ key: `${TEXTURE.PROP_SPIKES}_f${i}` })),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.FOUNTAIN_BLUE_FLOW,
      frames: [0, 1, 2].map(i => ({ key: `${TEXTURE.FOUNTAIN_BLUE}_f${i}` })),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.FOUNTAIN_RED_FLOW,
      frames: [0, 1, 2].map(i => ({ key: `${TEXTURE.FOUNTAIN_RED}_f${i}` })),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: ANIM.CHEST_OPENING,
      frames: [0, 1, 2].map(i => ({ key: `${TEXTURE.CHEST_ANIM}_f${i}` })),
      frameRate: 10,
    });

    this.anims.create({
      key: ANIM.WATER_WAVE_CYCLE,
      frames: this.anims.generateFrameNumbers(TEXTURE.WATER_WAVES, { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });

    createActorAnims(this, ACTORS.HERO);
    createActorAnims(this, ACTORS.ORC);
    createActorAnims(this, ACTORS.SKELETON);
    createActorAnims(this, ACTORS.WOLF);

    void this.loadFontsThenStart();
  }

  private async loadFontsThenStart(): Promise<void> {
    try {
      await Promise.all([
        document.fonts.load('900 48px "Cinzel Decorative"'),
        document.fonts.load('16px "Pixelify Sans"'),
        document.fonts.load('700 16px "Pixelify Sans"'),
      ]);
    } catch {
      // fonts failed to load — Phaser will fall back to a default font
    }

    this.scene.start(SCENE.MENU);
  }

  private buildParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(2, 2, 0, 2, 2, 2);
    g.addColorStop(0, 'rgba(220,170,80,0.95)');
    g.addColorStop(1, 'rgba(220,170,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 4);
    this.textures.addCanvas(TEXTURE.PARTICLE_SPARK, canvas);
  }

  private buildBloodParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 5;
    canvas.height = 5;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(2.5, 2.5, 0, 2.5, 2.5, 2.5);
    g.addColorStop(0, 'rgba(235, 25, 45, 1)');
    g.addColorStop(0.5, 'rgba(175, 12, 28, 0.95)');
    g.addColorStop(1, 'rgba(100, 4, 15, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 5, 5);
    this.textures.addCanvas(TEXTURE.PARTICLE_BLOOD, canvas);
  }

  private buildBoneParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f2ebe0';
    ctx.fillRect(1, 1, 2, 2);
    ctx.fillStyle = '#b3a794';
    ctx.fillRect(0, 1, 1, 2);
    ctx.fillRect(2, 0, 1, 1);
    this.textures.addCanvas(TEXTURE.PARTICLE_BONE, canvas);
  }

  private buildWoodParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#945f37';
    ctx.fillRect(0, 0, 3, 3);
    ctx.fillStyle = '#c48956';
    ctx.fillRect(1, 1, 2, 1);
    ctx.fillStyle = '#543217';
    ctx.fillRect(0, 2, 3, 1);
    this.textures.addCanvas(TEXTURE.PARTICLE_WOOD, canvas);
  }

  private buildWoodDebrisTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 14;
    const ctx = canvas.getContext('2d')!;

    // Broken wooden planks lying flat on the ground
    // Plank 1 (tilted left)
    ctx.fillStyle = '#422411';
    ctx.fillRect(2, 6, 12, 5);
    ctx.fillStyle = '#7a4722';
    ctx.fillRect(3, 7, 10, 3);
    ctx.fillStyle = '#9e6234';
    ctx.fillRect(4, 7, 8, 1);

    // Plank 2 (shattered right)
    ctx.fillStyle = '#381e0e';
    ctx.fillRect(11, 4, 11, 6);
    ctx.fillStyle = '#6e3e1c';
    ctx.fillRect(12, 5, 9, 4);
    ctx.fillStyle = '#94582a';
    ctx.fillRect(13, 5, 7, 1);

    // Broken iron hoop fragment
    ctx.fillStyle = '#262429';
    ctx.fillRect(5, 10, 6, 2);
    ctx.fillStyle = '#5c5866';
    ctx.fillRect(6, 10, 4, 1);

    // Splinters
    ctx.fillStyle = '#b87c48';
    ctx.fillRect(1, 8, 2, 1);
    ctx.fillRect(15, 3, 3, 1);
    ctx.fillRect(20, 9, 2, 1);

    this.textures.addCanvas(TEXTURE.DEBRIS_WOOD, canvas);
  }

  private buildSlashFxTexture(): void {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size * 0.35;
    const cy = size * 0.5;

    // Draw stylized crescent slash arc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, -Math.PI * 0.38, Math.PI * 0.38, false);
    ctx.arc(cx, cy, 14, Math.PI * 0.35, -Math.PI * 0.35, true);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.3, 'rgba(176, 184, 196, 0.9)');
    grad.addColorStop(0.7, 'rgba(106, 112, 128, 0.75)');
    grad.addColorStop(1, 'rgba(58, 64, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Sharp white inner blade edge
    ctx.beginPath();
    ctx.arc(cx, cy, 21.5, -Math.PI * 0.32, Math.PI * 0.32, false);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.stroke();

    ctx.restore();
    this.textures.addCanvas(TEXTURE.SLASH_FX, canvas);
  }

  private buildVignetteTexture(): void {
    const size = 700;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.50);
    g.addColorStop(0, 'rgba(7,5,12,0)');
    g.addColorStop(1, 'rgba(5,3,9,0.97)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    this.textures.addCanvas(TEXTURE.VIGNETTE, canvas);
  }

  private buildDustParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 3;
    canvas.height = 3;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(1.5, 1.5, 0, 1.5, 1.5, 1.5);
    g.addColorStop(0, 'rgba(180,160,130,0.8)');
    g.addColorStop(1, 'rgba(180,160,130,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 3, 3);
    this.textures.addCanvas(TEXTURE.PARTICLE_DUST, canvas);
  }

  private buildSmokeParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 5;
    canvas.height = 5;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(2.5, 2.5, 0, 2.5, 2.5, 2.5);
    g.addColorStop(0, 'rgba(120,115,110,0.25)');
    g.addColorStop(0.6, 'rgba(100,95,90,0.12)');
    g.addColorStop(1, 'rgba(80,75,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 5, 5);
    this.textures.addCanvas(TEXTURE.PARTICLE_SMOKE, canvas);
  }

  private buildLeafParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 3;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3a5a28';
    ctx.fillRect(1, 0, 2, 1);
    ctx.fillRect(0, 1, 4, 1);
    ctx.fillRect(1, 2, 2, 1);
    ctx.fillStyle = '#4a6a30';
    ctx.fillRect(2, 0, 1, 1);
    ctx.fillRect(1, 1, 2, 1);
    this.textures.addCanvas(TEXTURE.PARTICLE_LEAF, canvas);
  }

  private buildShadowTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.ellipse(8, 4, 7, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
    this.textures.addCanvas(TEXTURE.SHADOW, canvas);
  }

  private buildEnergyProjectileTexture(): void {
    const size = 18;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    // Glowing mystical aura
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.35, 'rgba(240, 171, 252, 0.95)');
    g.addColorStop(0.7, 'rgba(168, 85, 247, 0.7)');
    g.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // 4-point radiant energy cross/diamond flare
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 2, cy + 2);
    ctx.lineTo(cx - 6, cy);
    ctx.lineTo(cx - 2, cy - 2);
    ctx.closePath();
    ctx.fill();

    // Hot center pixel core
    ctx.fillStyle = '#e0e7ff';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);

    this.textures.addCanvas(TEXTURE.PROJECTILE_ENERGY, canvas);
  }
}

