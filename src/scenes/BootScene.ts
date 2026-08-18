import Phaser from 'phaser';
import { defineSpritesheet } from '../gfx/PixelArtFactory';
import { buildDungeonTileset } from '../gfx/tiles';
import { buildTorchFrames, TORCH_LEGEND } from '../gfx/decor';
import { buildPropsAtlas } from '../gfx/props';
import { buildChestTexture } from '../gfx/chest';
import { buildStairsTexture } from '../gfx/stairs';
import { ACTORS, createActorAnims, preloadActor } from '../gfx/actors';
import { buildHudAtlas } from '../gfx/hud';
import { PACK, LEGACY_PACK } from '../gfx/pack';
import { ANIM, TEXTURE } from '../gfx/registry';
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

    preloadActor(this, ACTORS.HERO);
    preloadActor(this, ACTORS.ORC);
    preloadActor(this, ACTORS.SKELETON);
  }

  create(): void {
    buildDungeonTileset(this, TEXTURE.DUNGEON_TILES);
    buildPropsAtlas(this, TEXTURE.PROPS);
    buildChestTexture(this, TEXTURE.CHEST);
    buildStairsTexture(this, TEXTURE.STAIRS);
    buildHudAtlas(this, TEXTURE.HUD_ICONS);
    defineSpritesheet(this, TEXTURE.TORCH, buildTorchFrames(), TORCH_LEGEND);
    this.buildParticleTexture();
    this.buildVignetteTexture();

    this.anims.create({
      key: ANIM.TORCH_FLICKER,
      frames: this.anims.generateFrameNumbers(TEXTURE.TORCH, { start: 0, end: 3 }),
      frameRate: 9,
      repeat: -1,
    });

    createActorAnims(this, ACTORS.HERO);
    createActorAnims(this, ACTORS.ORC);
    createActorAnims(this, ACTORS.SKELETON);

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
    g.addColorStop(0, 'rgba(255,210,120,0.95)');
    g.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 4);
    this.textures.addCanvas(TEXTURE.PARTICLE_SPARK, canvas);
  }

  private buildVignetteTexture(): void {
    const size = 700;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.24, size / 2, size / 2, size * 0.6);
    g.addColorStop(0, 'rgba(7,5,12,0)');
    g.addColorStop(1, 'rgba(5,3,9,0.94)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    this.textures.addCanvas(TEXTURE.VIGNETTE, canvas);
  }
}
