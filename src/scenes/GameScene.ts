import Phaser from 'phaser';
import { SCENE } from './keys';
import { TEXTURE, ANIM, DEPTH, FONT } from '../gfx/registry';
import { FLOOR_INDICES } from '../gfx/tiles';
import { HUD_ICON } from '../gfx/hud';
import { PROP } from '../gfx/props';
import { buildLevel1, TILE_SIZE } from '../world/level1';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BossEnemy } from '../entities/BossEnemy';
import { BossProjectile } from '../entities/BossProjectile';
import { RoomClient } from '../net/RoomClient';
import { InputPayload, WorldSnapshot, PlayerSnapshot, EnemySnapshot, BossSnapshot } from '../net/types';
import { SoundFX } from '../audio/SoundFX';
import { ItemDef } from '../items/types';
import { ITEMS, getRandomItem } from '../items/registry';
import { AchievementManager } from '../achievements/AchievementManager';

export const THREAT_TIERS = [
  { name: 'ЛЕГКО', color: '#4ade80', bg: 0x14532d, threshold: 0 },
  { name: 'ОПАСНО', color: '#facc15', bg: 0x713f12, threshold: 90 }, // 1:30
  { name: 'КОШМАР', color: '#fb923c', bg: 0x7c2d12, threshold: 210 }, // 3:30
  { name: 'БЕЗУМИЕ', color: '#ef4444', bg: 0x7f1d1d, threshold: 360 }, // 6:00
  { name: 'СМЕРТЬ НЕИЗБЕЖНА', color: '#c084fc', bg: 0x581c87, threshold: 540 }, // 9:00
] as const;

interface TorchLight {
  light: Phaser.GameObjects.Light;
  base: number;
  phase: number;
}

interface Pickup {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  collected: boolean;
}

interface Chest {
  sprite: Phaser.GameObjects.Sprite;
  prompt: Phaser.GameObjects.Text;
  x: number;
  y: number;
  cost: number;
  opened: boolean;
}

interface CoinItem {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  collected: boolean;
  spawnTime: number;
}

interface DestructibleProp {
  id: number;
  sprite: Phaser.GameObjects.Sprite;
  body: Phaser.Physics.Arcade.StaticBody;
  x: number;
  y: number;
  broken: boolean;
}

interface NetContext {
  role: 'host' | 'guest';
  room: RoomClient;
}

const ATTACK_RANGE = 46;
const INTERACT_RANGE = 38;
const PICKUP_RANGE = 20;
const SNAPSHOT_INTERVAL = 66; // ~15Hz
const INPUT_SEND_INTERVAL = 50; // ~20Hz
const SPAWN_SPREAD = 20;

export class GameScene extends Phaser.Scene {
  private net?: NetContext;
  private role: 'offline' | 'host' | 'guest' = 'offline';
  private mySlot = 0;

  private players: Player[] = [];
  private myPlayer!: Player;
  private playerLights: Map<Player, Phaser.GameObjects.Light> = new Map();

  private remoteInputs: Map<number, InputPayload> = new Map();
  private lastConsumedSeq: Map<number, { attack: number; interact: number }> = new Map();
  private mySeq = { attack: 0, interact: 0 };
  private snapshotAccum = 0;
  private inputAccum = 0;
  private attackPressed = false;
  private interactPressed = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private torchLights: TorchLight[] = [];
  private enemies: Enemy[] = [];
  private flasks: Pickup[] = [];
  private chests: Chest[] = [];
  private coins: CoinItem[] = [];
  private destructibles: DestructibleProp[] = [];
  private hitSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  private boneSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  private woodSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lightningGfx!: Phaser.GameObjects.Graphics;
  private solids!: Phaser.Physics.Arcade.StaticGroup;

  // Altar & Boss
  private altarSprite!: Phaser.GameObjects.Sprite;
  private altarPrompt!: Phaser.GameObjects.Text;
  private altarX = 0;
  private altarY = 0;
  private altarActivated = false;
  private altarCharged = false;
  private altarLight?: Phaser.GameObjects.Light;
  private boss?: BossEnemy;
  private bossProjectiles: BossProjectile[] = [];
  private bossBarContainer?: Phaser.GameObjects.Container;
  private bossBarFill?: Phaser.GameObjects.Rectangle;
  private bossBarText?: Phaser.GameObjects.Text;

  // Threat Meter (Time Scaling)
  private elapsedRunTime = 0;
  private currentThreatTier = 0;
  private timerLabel!: Phaser.GameObjects.Text;
  private threatContainer!: Phaser.GameObjects.Container;
  private threatBadgeBg!: Phaser.GameObjects.Rectangle;
  private threatBadgeText!: Phaser.GameObjects.Text;

  // A world camera zoomed in on the action, and a separate 1:1 UI camera for
  // the HUD — scrollFactor(0) alone does NOT exempt objects from the world
  // camera's zoom, so screen-fixed UI needs its own unzoomed camera.
  private worldLayer!: Phaser.GameObjects.Layer;
  private worldCam!: Phaser.Cameras.Scene2D.Camera;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private camCenterX = 0;
  private camCenterY = 0;

  private exitSprite!: Phaser.GameObjects.Sprite;
  private exitPrompt!: Phaser.GameObjects.Text;
  private exitX = 0;
  private exitY = 0;

  private hearts: Phaser.GameObjects.GameObject[] = [];
  private goldIcon!: Phaser.GameObjects.Sprite;
  private goldLabel!: Phaser.GameObjects.Text;
  private itemTray: Phaser.GameObjects.Container[] = [];
  private bannerContainer?: Phaser.GameObjects.Container;
  private depthLabel!: Phaser.GameObjects.Text;
  private vignette!: Phaser.GameObjects.Image;
  private damageFlash!: Phaser.GameObjects.Rectangle;
  private hint!: Phaser.GameObjects.Text;
  private spawnX = 0;
  private spawnY = 0;

  private depth = 1;
  private playerHealth: Record<number, { hp: number; maxHp: number }> = {};
  private killCount = 0;
  private gameOver = false;
  private frozen = false;

  constructor() {
    super(SCENE.GAME);
  }

  init(data: { depth?: number; net?: NetContext; playerHealth?: Record<number, { hp: number; maxHp: number }>; elapsedRunTime?: number }): void {
    this.depth = data?.depth ?? 1;
    this.net = data?.net;
    this.role = this.net?.role ?? 'offline';
    this.playerHealth = data?.playerHealth ?? {};
    this.elapsedRunTime = data?.elapsedRunTime ?? 0;
  }

  create(): void {
    const level = buildLevel1(this.depth);
    const world = this.add.layer();
    this.worldLayer = world;
    this.gameOver = false;
    this.frozen = false;
    this.killCount = 0;
    this.chests = [];
    this.destructibles = [];
    this.players = [];
    this.playerLights.clear();
    this.remoteInputs.clear();
    this.lastConsumedSeq.clear();
    this.mySeq = { attack: 0, interact: 0 };

    this.lights.enable();
    this.lights.setAmbientColor(0x453a68);

    const map = this.make.tilemap({ data: level.data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('dungeon', TEXTURE.DUNGEON_TILES, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setCollisionByExclusion(FLOOR_INDICES);
    layer.setPipeline('Light2D');
    layer.setDepth(DEPTH.FLOOR);
    world.add(layer);

    const worldW = level.data[0].length * TILE_SIZE;
    const worldH = level.data.length * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.solids = this.physics.add.staticGroup();

    for (const t of level.torches) {
      const x = t.col * TILE_SIZE + TILE_SIZE / 2;
      const y = t.row * TILE_SIZE + TILE_SIZE / 2;
      const sprite = this.add.sprite(x, y, TEXTURE.TORCH, 0);
      sprite.setScale(2);
      sprite.setDepth(DEPTH.YSORT_BASE + y);
      sprite.setPipeline('Light2D');
      sprite.play({ key: ANIM.TORCH_FLICKER, startFrame: Phaser.Math.Between(0, 3) });
      world.add(sprite);

      const light = this.lights.addLight(x, y - 8, 150, 0xff9a4d, 1.4);
      this.torchLights.push({ light, base: 1.4, phase: Math.random() * Math.PI * 2 });
    }

    for (let i = 0; i < level.decorations.length; i++) {
      const d = level.decorations[i];
      const x = d.col * TILE_SIZE + TILE_SIZE / 2;
      const yBottom = d.row * TILE_SIZE + TILE_SIZE;
      const sprite = this.add.sprite(x, yBottom, TEXTURE.PROPS, d.key);
      sprite.setOrigin(0.5, 1);
      sprite.setPipeline('Light2D');
      sprite.setDepth(DEPTH.YSORT_BASE + yBottom);
      world.add(sprite);
      if (d.solid) {
        this.physics.add.existing(sprite, true);
        const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(16, 12);
        body.setOffset((sprite.width - 16) / 2, sprite.height - 12);
        this.solids.add(sprite);

        const isDestructible = d.key === PROP.CRATE || d.key === PROP.BARREL;
        if (isDestructible) {
          this.destructibles.push({
            id: i,
            sprite,
            body,
            x,
            y: yBottom,
            broken: false,
          });
        }
      }
    }

    this.flasks = level.flasks.map((f) => {
      const x = f.col * TILE_SIZE + TILE_SIZE / 2;
      const yBottom = f.row * TILE_SIZE + TILE_SIZE;
      const sprite = this.add.sprite(x, yBottom, TEXTURE.PROPS, f.key);
      sprite.setOrigin(0.5, 1);
      sprite.setPipeline('Light2D');
      sprite.setDepth(DEPTH.YSORT_BASE + yBottom);
      world.add(sprite);
      this.tweens.add({ targets: sprite, y: yBottom - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { sprite, x, y: yBottom, collected: false };
    });

    for (const c of level.chests) {
      const x = c.col * TILE_SIZE + TILE_SIZE / 2;
      const y = c.row * TILE_SIZE + TILE_SIZE;
      const sprite = this.add.sprite(x, y, TEXTURE.CHEST, 0);
      sprite.setOrigin(0.5, 1);
      sprite.setPipeline('Light2D');
      sprite.setDepth(DEPTH.YSORT_BASE + y);
      world.add(sprite);

      const prompt = this.add
        .text(x, y - 26, 'E — СУНДУК (10 🪙)', { fontFamily: FONT.UI, fontSize: '10px', color: '#fbbf24' })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.YSORT_BASE + y + 1000)
        .setVisible(false);
      world.add(prompt);

      this.chests.push({ sprite, prompt, x, y, cost: 10, opened: false });
    }

    // Altar of the Void (Teleporter Event)
    this.altarX = level.altar.col * TILE_SIZE + TILE_SIZE / 2;
    this.altarY = level.altar.row * TILE_SIZE + TILE_SIZE;
    this.altarActivated = false;
    this.altarCharged = false;

    this.altarSprite = this.add.sprite(this.altarX, this.altarY, TEXTURE.PROPS, 'tombstone');
    this.altarSprite.setOrigin(0.5, 1);
    this.altarSprite.setScale(1.5);
    this.altarSprite.setPipeline('Light2D');
    this.altarSprite.setDepth(DEPTH.YSORT_BASE + this.altarY);
    world.add(this.altarSprite);

    this.altarLight = this.lights.addLight(this.altarX, this.altarY - 16, 120, 0xa855f7, 0.7);

    this.altarPrompt = this.add
      .text(this.altarX, this.altarY - 32, 'E — АКТИВИРОВАТЬ АЛТАРЬ БЕЗДНЫ', {
        fontFamily: FONT.UI,
        fontSize: '10px',
        color: '#c084fc',
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.YSORT_BASE + this.altarY + 1000)
      .setVisible(false);
    world.add(this.altarPrompt);

    this.exitX = level.exit.col * TILE_SIZE + TILE_SIZE / 2;
    this.exitY = level.exit.row * TILE_SIZE + TILE_SIZE;
    this.exitSprite = this.add.sprite(this.exitX, this.exitY, TEXTURE.STAIRS, 0);
    this.exitSprite.setOrigin(0.5, 1);
    this.exitSprite.setPipeline('Light2D');
    this.exitSprite.setDepth(DEPTH.YSORT_BASE + this.exitY - 20);
    world.add(this.exitSprite);
    this.lights.addLight(this.exitX, this.exitY - 16, 90, 0xffce6b, 0.5);

    this.exitPrompt = this.add
      .text(this.exitX, this.exitY - 26, '', { fontFamily: FONT.UI, fontSize: '10px', color: '#f0e2b8', align: 'center' })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.YSORT_BASE + this.exitY + 1000)
      .setVisible(false);
    world.add(this.exitPrompt);

    this.spawnX = level.spawn.col * TILE_SIZE + TILE_SIZE / 2;
    this.spawnY = level.spawn.row * TILE_SIZE + TILE_SIZE;

    const roster = this.net ? this.net.room.currentRoster : [{ peerId: 'local', slot: 0, name: 'Игрок' }];
    this.mySlot = this.role === 'guest' ? (this.net!.room.mySlot ?? 0) : 0;

    for (const entry of roster.slice().sort((a, b) => a.slot - b.slot)) {
      const angle = (entry.slot / 4) * Math.PI * 2;
      const px = this.spawnX + (entry.slot === 0 ? 0 : Math.cos(angle) * SPAWN_SPREAD);
      const py = this.spawnY + (entry.slot === 0 ? 0 : Math.sin(angle) * SPAWN_SPREAD);
      const initialHp = this.playerHealth[entry.slot];
      const p = new Player(this, px, py, entry.slot, initialHp);
      world.add(p);
      world.add(p.sword);
      world.add(p.label);
      p.setLabelVisible(roster.length > 1);

      const isMine = entry.slot === this.mySlot;
      const isRemotePuppet = this.role === 'guest' && !isMine;
      if (!isRemotePuppet) {
        this.physics.add.collider(p, layer);
        this.physics.add.collider(p, this.solids);
      }

      const light = this.lights.addLight(px, py, 150, 0xfbe3b8, isMine ? 0.7 : 0.45);
      this.playerLights.set(p, light);

      this.players.push(p);
      if (isMine) this.myPlayer = p;
    }

    this.enemies = level.enemies.map((e, id) => {
      const enemy = new Enemy(this, e.col * TILE_SIZE + TILE_SIZE / 2, e.row * TILE_SIZE + TILE_SIZE, e.kind, id);
      if (this.role !== 'guest') {
        this.physics.add.collider(enemy, layer);
        this.physics.add.collider(enemy, this.solids);
      }
      world.add(enemy);
      return enemy;
    });

    this.hitSpark = this.add.particles(0, 0, TEXTURE.PARTICLE_SPARK, {
      lifespan: 260,
      speed: { min: 40, max: 110 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.hitSpark.setDepth(DEPTH.YSORT_BASE + worldH + 10);
    world.add(this.hitSpark);

    this.bloodSpark = this.add.particles(0, 0, TEXTURE.PARTICLE_BLOOD, {
      lifespan: { min: 220, max: 420 },
      speed: { min: 60, max: 190 },
      scale: { start: 1.4, end: 0.2 },
      alpha: { start: 1, end: 0 },
      gravityY: 170,
      emitting: false,
    });
    this.bloodSpark.setDepth(DEPTH.YSORT_BASE + worldH + 12);
    world.add(this.bloodSpark);

    this.boneSpark = this.add.particles(0, 0, TEXTURE.PARTICLE_BONE, {
      lifespan: { min: 220, max: 450 },
      speed: { min: 50, max: 160 },
      scale: { start: 1.2, end: 0.25 },
      alpha: { start: 1, end: 0 },
      rotate: { start: 0, end: 360 },
      gravityY: 180,
      emitting: false,
    });
    this.boneSpark.setDepth(DEPTH.YSORT_BASE + worldH + 12);
    world.add(this.boneSpark);

    this.woodSpark = this.add.particles(0, 0, TEXTURE.PARTICLE_WOOD, {
      lifespan: { min: 220, max: 460 },
      speed: { min: 60, max: 190 },
      scale: { start: 1.3, end: 0.25 },
      alpha: { start: 1, end: 0 },
      rotate: { start: 0, end: 360 },
      gravityY: 190,
      emitting: false,
    });
    this.woodSpark.setDepth(DEPTH.YSORT_BASE + worldH + 12);
    world.add(this.woodSpark);

    this.fireSpark = this.add.particles(0, 0, TEXTURE.PARTICLE_SPARK, {
      lifespan: { min: 250, max: 480 },
      speed: { min: 60, max: 190 },
      scale: { start: 2.0, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xff4500, 0xff8c00, 0xffd700],
      blendMode: 'ADD',
      emitting: false,
    });
    this.fireSpark.setDepth(DEPTH.YSORT_BASE + worldH + 15);
    world.add(this.fireSpark);

    this.lightningGfx = this.add.graphics();
    this.lightningGfx.setDepth(DEPTH.YSORT_BASE + worldH + 16);
    world.add(this.lightningGfx);

    // Ambient dust motes drifting across the whole level — fixed world-space,
    // deliberately NOT following the player.
    const dust = this.add.particles(0, 0, TEXTURE.PARTICLE_SPARK, {
      x: { min: 0, max: worldW },
      y: { min: 0, max: worldH },
      lifespan: 6000,
      speedY: { min: -10, max: -3 },
      speedX: { min: -4, max: 4 },
      scale: { start: 1, end: 0.1 },
      alpha: { start: 0.4, end: 0 },
      frequency: 220,
      blendMode: 'ADD',
    });
    dust.setDepth(DEPTH.DUST);
    world.add(dust);

    this.camCenterX = this.myPlayer.x;
    this.camCenterY = this.myPlayer.y;
    this.worldCam = this.cameras.main;
    this.worldCam.setBounds(0, 0, worldW, worldH);
    this.worldCam.setZoom(2);
    this.worldCam.centerOn(this.camCenterX, this.camCenterY);
    this.worldCam.setRoundPixels(true);

    // UI camera: unzoomed, fixed, sits on top — only ever shows HUD elements.
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCam.setScroll(0, 0);
    this.uiCam.ignore(world);

    this.vignette = this.add
      .image(this.scale.width / 2, this.scale.height / 2, TEXTURE.VIGNETTE)
      .setDepth(DEPTH.OVERLAY)
      .setDisplaySize(this.scale.width * 1.15, this.scale.height * 1.15);
    this.worldCam.ignore(this.vignette);

    this.damageFlash = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x7a1f2b, 0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.worldCam.ignore(this.damageFlash);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey('W'),
      down: this.input.keyboard!.addKey('S'),
      left: this.input.keyboard!.addKey('A'),
      right: this.input.keyboard!.addKey('D'),
    };
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Attack on LMB (Left Mouse Click)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.frozen || this.myPlayer.isDowned) return;
      if (pointer.leftButtonDown()) {
        const worldPoint = this.worldCam.getWorldPoint(pointer.x, pointer.y);
        if (worldPoint.x !== this.myPlayer.x) {
          this.myPlayer.setFlipX(worldPoint.x < this.myPlayer.x);
        }
        this.attackPressed = true;
        this.mySeq.attack++;
        this.handlePlayerAttack(this.myPlayer);
      }
    });

    this.buildHeartsUI();

    this.goldIcon = this.add.sprite(22, 46, TEXTURE.PROPS, 'coin');
    this.goldIcon.setOrigin(0.5, 0.5);
    this.goldIcon.setScale(1.2);
    this.goldIcon.setScrollFactor(0);
    this.goldIcon.setDepth(DEPTH.UI);
    this.worldCam.ignore(this.goldIcon);

    this.goldLabel = this.add.text(34, 39, '0', {
      fontFamily: FONT.UI,
      fontSize: '13px',
      fontStyle: '700',
      color: '#fbbf24',
    });
    this.goldLabel.setStroke('#451a03', 3);
    this.goldLabel.setScrollFactor(0);
    this.goldLabel.setDepth(DEPTH.UI);
    this.worldCam.ignore(this.goldLabel);

    this.updateInventoryHUD();

    this.depthLabel = this.add
      .text(this.scale.width - 16, 18, `ПОДЗЕМЕЛЬЕ ${this.depth}`, {
        fontFamily: FONT.UI,
        fontSize: '11px',
        color: '#cfc6dd',
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.UI);
    this.worldCam.ignore(this.depthLabel);

    this.timerLabel = this.add
      .text(this.scale.width - 16, 36, '⏱️ 00:00', {
        fontFamily: FONT.UI,
        fontSize: '11px',
        fontStyle: '700',
        color: '#cfc6dd',
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.UI);
    this.worldCam.ignore(this.timerLabel);

    this.threatContainer = this.add.container(this.scale.width - 60, 60);
    this.threatContainer.setDepth(DEPTH.UI);
    this.worldCam.ignore(this.threatContainer);

    this.threatBadgeBg = this.add.rectangle(0, 0, 90, 17, 0x14532d, 0.9);
    this.threatBadgeBg.setStrokeStyle(1.5, 0x4ade80);

    this.threatBadgeText = this.add.text(0, 0, 'ЛЕГКО', {
      fontFamily: FONT.UI,
      fontSize: '9px',
      fontStyle: '700',
      color: '#4ade80',
    }).setOrigin(0.5, 0.5);
    this.threatContainer.add([this.threatBadgeBg, this.threatBadgeText]);

    this.hint = this.add
      .text(this.scale.width / 2, this.scale.height - 20, 'WASD — ДВИЖЕНИЕ   SHIFT — РЫВОК   ПРОБЕЛ / ЛКМ — АТАКА   E — ДЕЙСТВИЕ   ESC — МЕНЮ', {
        fontFamily: FONT.UI,
        fontSize: '11px',
        color: '#cfc6dd',
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.UI);
    this.worldCam.ignore(this.hint);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 3600, duration: 900 });

    this.input.keyboard!.on('keydown-ESC', () => {
      void this.net?.room.leave();
      this.scene.start(SCENE.MENU);
    });

    if (this.net) {
      this.net.room.onInput((peerId, input) => {
        const slot = this.net!.room.currentRoster.find((r) => r.peerId === peerId)?.slot;
        if (slot !== undefined) this.remoteInputs.set(slot, input);
      });
      if (this.role === 'guest') {
        this.net.room.onSnapshot((snapshot) => this.applySnapshot(snapshot));
        this.net.room.onTransition((msg) => {
          this.scene.restart({ depth: msg.nextDepth, net: this.net, playerHealth: msg.playerHealth, elapsedRunTime: this.elapsedRunTime });
        });
      }
    }

    const handleResize = (size: Phaser.Structs.Size) => this.handleResize(size.width, size.height);
    this.scale.on('resize', handleResize);

    this.events.once('shutdown', () => {
      this.scale.off('resize', handleResize);
      this.enemies = [];
      this.flasks = [];
      this.chests = [];
      this.players = [];
      this.bossProjectiles = [];
    });
  }

  private handleResize(width: number, height: number): void {
    this.uiCam.setSize(width, height);
    this.vignette.setPosition(width / 2, height / 2).setDisplaySize(width * 1.15, height * 1.15);
    this.damageFlash.setPosition(width / 2, height / 2).setSize(width, height);
    this.hint.setPosition(width / 2, height - 20);
    this.depthLabel.setPosition(width - 16, 18);
    this.timerLabel.setPosition(width - 16, 36);
    this.threatContainer.setPosition(width - 60, 60);
    if (this.bossBarContainer) this.bossBarContainer.setPosition(width / 2, 28);
  }

  update(_time: number, delta: number): void {
    if (this.frozen) return;

    const localInput = {
      up: this.cursors.up.isDown || this.wasd.up.isDown,
      down: this.cursors.down.isDown || this.wasd.down.isDown,
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
      shift: this.shiftKey.isDown,
    };
    this.myPlayer.update(localInput, delta);
    if (this.myPlayer.isSprinting) {
      AchievementManager.get().unlock('speedrunner', this);
    }

    this.attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKey);
    this.interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey);
    if (this.attackPressed) this.mySeq.attack++;
    if (this.interactPressed) this.mySeq.interact++;

    const t = this.time.now / 1000;
    for (const tl of this.torchLights) {
      tl.light.intensity = tl.base + Math.sin(t * 6 + tl.phase) * 0.25 + Math.sin(t * 13 + tl.phase) * 0.08;
    }
    for (const [player, light] of this.playerLights) {
      light.x = player.x;
      light.y = player.y - 8;
    }

    if (this.role === 'guest') {
      this.updateGuestFrame(delta);
    } else {
      this.updateHostFrame(delta);
    }

    this.updateThreatMeter(delta);
    this.updateBossProjectiles(delta);
    this.updateCoins(delta);
    this.updateCamera();
  }

  private updateHostFrame(delta: number): void {
    for (const player of this.players) {
      if (player === this.myPlayer) continue;
      const latest = this.remoteInputs.get(player.slot);
      if (latest) player.update({ up: latest.up, down: latest.down, left: latest.left, right: latest.right, shift: latest.shift }, delta);
    }

    if (this.attackPressed) this.handlePlayerAttack(this.myPlayer);
    for (const player of this.players) {
      if (player === this.myPlayer) continue;
      if (this.consumeRemoteEdge(player.slot, 'attack')) this.handlePlayerAttack(player);
    }

    this.enemies = this.enemies.filter((e) => e.active);
    for (const enemy of this.enemies) {
      const target = this.nearestAlivePlayer(enemy.x, enemy.y);
      if (!target) continue;
      const landedHit = enemy.update(target.x, target.y, delta);
      if (landedHit) this.handlePlayerHurt(target, enemy);
    }

    if (this.boss && !this.boss.isDead) {
      const target = this.nearestAlivePlayer(this.boss.x, this.boss.y);
      if (target) {
        const action = this.boss.updateBoss(target.x, target.y, delta);
        if (action.landedMelee) {
          this.handlePlayerHurt(target, { contactDamage: this.boss.contactDamage, x: this.boss.x, y: this.boss.y } as Enemy);
        }
        for (const p of action.projectiles) {
          this.worldLayer.add(p);
          this.bossProjectiles.push(p);
        }
        for (const m of action.minionSpawns) {
          const enemy = new Enemy(this, m.x, m.y, m.kind, this.enemies.length + 100);
          this.physics.add.collider(enemy, this.solids);
          this.worldLayer.add(enemy);
          this.enemies.push(enemy);
        }
      }
      this.updateBossHealthBar();
    }

    this.updateFlaskPickups();
    this.updateChestInteractions();
    this.updateAltarInteraction();
    this.updateExitInteraction();

    if (this.net) {
      this.snapshotAccum += delta;
      if (this.snapshotAccum >= SNAPSHOT_INTERVAL) {
        this.snapshotAccum = 0;
        this.net.room.sendSnapshot(this.buildSnapshot());
      }
    }
  }

  private updateGuestFrame(delta: number): void {
    if (this.attackPressed) this.myPlayer.tryAttack();
    for (const player of this.players) {
      if (player === this.myPlayer) continue;
      player.interpolate(delta);
    }
    for (const enemy of this.enemies) enemy.interpolate(delta);
    if (this.boss) this.boss.interpolate(delta);
    this.updateLocalPrompts();

    this.inputAccum += delta;
    if (this.inputAccum >= INPUT_SEND_INTERVAL) {
      this.inputAccum = 0;
      this.net!.room.sendInput({
        up: this.cursors.up.isDown || this.wasd.up.isDown,
        down: this.cursors.down.isDown || this.wasd.down.isDown,
        left: this.cursors.left.isDown || this.wasd.left.isDown,
        right: this.cursors.right.isDown || this.wasd.right.isDown,
        shift: this.shiftKey.isDown,
        attackSeq: this.mySeq.attack,
        interactSeq: this.mySeq.interact,
      });
    }
  }

  private nearestAlivePlayer(x: number, y: number): Player | undefined {
    let best: Player | undefined;
    let bestDist = Infinity;
    for (const p of this.players) {
      if (p.isDowned) continue;
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  /** Host-only: consumes a fresh attack/interact press from a remote peer's
   * latest input, mirroring Phaser's JustDown consume-on-read semantics. */
  private consumeRemoteEdge(slot: number, kind: 'attack' | 'interact'): boolean {
    const latest = this.remoteInputs.get(slot);
    if (!latest) return false;
    const seenValue = latest[kind === 'attack' ? 'attackSeq' : 'interactSeq'];
    const prev = this.lastConsumedSeq.get(slot) ?? { attack: 0, interact: 0 };
    const prevValue = prev[kind];
    if (seenValue === prevValue) return false;
    prev[kind] = seenValue;
    this.lastConsumedSeq.set(slot, prev);
    return true;
  }

  private updateCamera(): void {
    const alive = this.players.filter((p) => !p.isDowned);
    const pts = alive.length ? alive : this.players;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const targetCx = (minX + maxX) / 2;
    const targetCy = (minY + maxY) / 2;
    const spread = Math.max(maxX - minX, maxY - minY, 40);
    const targetZoom = Phaser.Math.Clamp(560 / spread, 1.35, 2.1);

    this.camCenterX = Phaser.Math.Linear(this.camCenterX, targetCx, 0.08);
    this.camCenterY = Phaser.Math.Linear(this.camCenterY, targetCy, 0.08);
    this.worldCam.zoom = Phaser.Math.Linear(this.worldCam.zoom, targetZoom, 0.05);
    this.worldCam.centerOn(this.camCenterX, this.camCenterY);
  }

  private spawnDamageNumber(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y - 10, text, {
        fontFamily: FONT.UI,
        fontSize: '11px',
        fontStyle: '700',
        color,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.YSORT_BASE + y + 2000);
    this.worldLayer.add(label);
    this.tweens.add({
      targets: label,
      y: label.y - 12,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private handlePlayerAttack(player: Player): void {
    if (!player.tryAttack()) return;

    this.hitSpark.setPosition(player.x, player.y);
    this.hitSpark.explode(5);

    for (const prop of this.destructibles) {
      if (prop.broken) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, prop.x, prop.y);
      if (dist <= ATTACK_RANGE) {
        this.breakProp(prop);
      }
    }

    // Attack Boss
    if (this.boss && !this.boss.isDead) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, this.boss.x, this.boss.y);
      if (dist <= ATTACK_RANGE + 14) {
        const isCrit = Math.random() < player.critChance;
        const dmg = Math.max(1, Math.round(player.attackDamage * (isCrit ? 2 : 1)));

        const killed = this.boss.takeDamage(dmg, player.x, player.y);

        if (isCrit) {
          SoundFX.playCritHit();
          if (player === this.myPlayer) {
            this.spawnDamageNumber(this.boss.x, this.boss.y - 16, `КРИТ! -${dmg}`, '#f87171');
            this.worldCam.shake(80, 0.003);
          }
        } else {
          SoundFX.playEnemyHit('demon');
          if (player === this.myPlayer) this.spawnDamageNumber(this.boss.x, this.boss.y - 16, `-${dmg}`, '#ffe28a');
          if (player === this.myPlayer) this.worldCam.shake(50, 0.0015);
        }

        this.hitSpark.setPosition(this.boss.x, this.boss.y - 14);
        this.hitSpark.explode(10);
        this.bloodSpark.setPosition(this.boss.x, this.boss.y - 14);
        this.bloodSpark.explode(killed ? 35 : 14);

        this.updateBossHealthBar();

        if (killed) {
          this.killCount += 1;
          AchievementManager.get().unlock('boss_slayer', this);
          this.onBossDefeated();
        }
      }
    }

    // Attack normal enemies
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist <= ATTACK_RANGE) {
        const isCrit = Math.random() < player.critChance;
        const dmg = Math.max(1, Math.round(player.attackDamage * (isCrit ? 2 : 1)));

        const killed = enemy.takeDamage(dmg, player.x, player.y);

        if (isCrit) {
          SoundFX.playCritHit();
          if (player === this.myPlayer) {
            this.spawnDamageNumber(enemy.x, enemy.y, `КРИТ! -${dmg}`, '#f87171');
            this.worldCam.shake(70, 0.002);
          }
          if (player.stormTargets > 0) {
            this.triggerChainLightning(enemy, player.stormTargets, Math.round(dmg * 0.75));
          }
        } else {
          SoundFX.playEnemyHit(enemy.kind);
          if (player === this.myPlayer) this.spawnDamageNumber(enemy.x, enemy.y, `-${dmg}`, '#ffe28a');
          if (player === this.myPlayer) this.worldCam.shake(50, 0.0012);
        }

        this.hitSpark.setPosition(enemy.x, enemy.y);
        this.hitSpark.explode(6);

        if (enemy.kind === 'skeleton') {
          this.boneSpark.setPosition(enemy.x, enemy.y - 8);
          this.boneSpark.explode(killed ? 18 : 10);
        } else {
          this.bloodSpark.setPosition(enemy.x, enemy.y - 8);
          this.bloodSpark.explode(killed ? 22 : 12);
        }

        if (killed) {
          SoundFX.playEnemyDeath(enemy.kind);
          this.killCount += 1;

          AchievementManager.get().enemiesKilled += 1;
          AchievementManager.get().unlock('first_blood', this);

          // Enemy drops coins
          const coinCount = enemy.kind === 'skeleton' ? Phaser.Math.Between(3, 6) : Phaser.Math.Between(2, 4);
          this.spawnCoins(enemy.x, enemy.y, coinCount);

          // Leech Fang life steal
          if (player.leechChance > 0 && Math.random() < player.leechChance) {
            player.heal(1);
            this.buildHeartsUI();
            this.spawnDamageNumber(player.x, player.y - 12, '+1 HP', '#4ade80');
          }

          // Oil Lamp death fire explosion
          if (player.hasOilLamp) {
            this.triggerOilExplosion(enemy.x, enemy.y);
          }
        }
      }
    }
  }

  private triggerChainLightning(sourceEnemy: Enemy, maxTargets: number, dmg: number): void {
    const nearby = this.enemies
      .filter((e) => !e.isDead && e !== sourceEnemy)
      .sort((a, b) => Phaser.Math.Distance.Between(sourceEnemy.x, sourceEnemy.y, a.x, a.y) - Phaser.Math.Distance.Between(sourceEnemy.x, sourceEnemy.y, b.x, b.y))
      .slice(0, maxTargets);

    if (nearby.length === 0) return;

    SoundFX.playLightningZap();
    this.lightningGfx.clear();
    this.lightningGfx.lineStyle(2, 0x38bdf8, 0.95);

    for (const target of nearby) {
      this.lightningGfx.beginPath();
      this.lightningGfx.moveTo(sourceEnemy.x, sourceEnemy.y - 10);
      const midX = (sourceEnemy.x + target.x) / 2 + Phaser.Math.Between(-8, 8);
      const midY = (sourceEnemy.y + target.y) / 2 + Phaser.Math.Between(-8, 8);
      this.lightningGfx.lineTo(midX, midY);
      this.lightningGfx.lineTo(target.x, target.y - 10);
      this.lightningGfx.strokePath();

      const dead = target.takeDamage(dmg, sourceEnemy.x, sourceEnemy.y);
      this.spawnDamageNumber(target.x, target.y, `⚡ -${dmg}`, '#38bdf8');
      this.hitSpark.setPosition(target.x, target.y - 8);
      this.hitSpark.explode(8);
      if (dead) {
        SoundFX.playEnemyDeath(target.kind);
        this.killCount += 1;
      }
    }

    this.time.delayedCall(140, () => this.lightningGfx.clear());
  }

  private triggerOilExplosion(x: number, y: number): void {
    SoundFX.playFireExplosion();
    this.fireSpark.setPosition(x, y - 8);
    this.fireSpark.explode(26);

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < 48) {
        const dead = enemy.takeDamage(2, x, y);
        this.spawnDamageNumber(enemy.x, enemy.y, '🔥 -2', '#fb923c');
        if (dead) {
          SoundFX.playEnemyDeath(enemy.kind);
          this.killCount += 1;
        }
      }
    }
  }

  private updateThreatMeter(delta: number): void {
    this.elapsedRunTime += delta;
    const totalSec = Math.floor(this.elapsedRunTime / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    this.timerLabel.setText(`⏱️ ${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);

    // Determine current threat tier
    let newTier = 0;
    for (let i = THREAT_TIERS.length - 1; i >= 0; i--) {
      if (totalSec >= THREAT_TIERS[i].threshold) {
        newTier = i;
        break;
      }
    }

    if (newTier !== this.currentThreatTier) {
      this.currentThreatTier = newTier;
      const tier = THREAT_TIERS[newTier];
      const colorHex = Phaser.Display.Color.HexStringToColor(tier.color).color;
      this.threatBadgeBg.setFillStyle(tier.bg, 0.9);
      this.threatBadgeBg.setStrokeStyle(1.5, colorHex);
      this.threatBadgeText.setText(tier.name);
      this.threatBadgeText.setColor(tier.color);

      SoundFX.playThreatLevelUp();
      this.showThreatLevelUpBanner(tier);
    }
  }

  private showThreatLevelUpBanner(tier: typeof THREAT_TIERS[number]): void {
    const banner = this.add.container(this.scale.width / 2, 45);
    banner.setDepth(DEPTH.UI + 80);

    const bg = this.add.rectangle(0, 0, 320, 36, 0x0f0a17, 0.95);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(tier.color).color);

    const title = this.add
      .text(0, -6, `УРОВЕНЬ УГРОЗЫ: ${tier.name}`, {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '700',
        color: tier.color,
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(0, 8, 'Враги стали сильнее и яростнее!', {
        fontFamily: FONT.UI,
        fontSize: '9px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    banner.add([bg, title, sub]);
    banner.setScale(0.8);
    banner.setAlpha(0);
    this.worldCam.ignore(banner);

    this.tweens.add({
      targets: banner,
      scale: 1,
      alpha: 1,
      y: 55,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: banner,
            alpha: 0,
            y: 40,
            duration: 300,
            onComplete: () => banner.destroy(),
          });
        });
      },
    });
  }

  private updateAltarInteraction(): void {
    if (this.altarCharged) {
      this.altarPrompt.setVisible(false);
      return;
    }

    let anyMineInRange = false;
    for (const player of this.players) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, this.altarX, this.altarY);
      const inRange = dist < INTERACT_RANGE + 10;
      if (!inRange) continue;
      if (player === this.myPlayer) anyMineInRange = true;

      const pressed = player === this.myPlayer ? this.interactPressed : this.consumeRemoteEdge(player.slot, 'interact');
      if (pressed && !this.altarActivated) {
        this.triggerAltarEvent();
        break;
      }
    }

    if (!this.altarActivated) {
      this.altarPrompt.setVisible(anyMineInRange);
    }
  }

  private triggerAltarEvent(): void {
    if (this.altarActivated) return;
    this.altarActivated = true;
    this.altarPrompt.setVisible(false);

    SoundFX.playBossSpawn();
    this.damageFlash.setFillStyle(0x581c87, 0.45);
    this.damageFlash.setAlpha(0.45);
    this.tweens.add({ targets: this.damageFlash, alpha: 0, duration: 800 });
    this.worldCam.shake(250, 0.005);

    // Altar glow
    if (this.altarLight) {
      this.altarLight.setColor(0xef4444);
      this.altarLight.setIntensity(1.2);
    }

    // Spawn Boss: Архидемон Бездны
    const bossHp = 45 + (this.players.length - 1) * 25 + Math.floor((this.elapsedRunTime / 60000) * 8);
    this.boss = new BossEnemy(this, this.altarX, this.altarY - 32, bossHp);
    this.worldLayer.add(this.boss);

    this.createBossHealthBar(this.boss);
  }

  private createBossHealthBar(boss: BossEnemy): void {
    if (this.bossBarContainer) this.bossBarContainer.destroy();

    const w = 320;
    const h = 18;
    const cx = this.scale.width / 2;
    const cy = 28;

    const cont = this.add.container(cx, cy);
    cont.setDepth(DEPTH.UI + 40);

    const title = this.add
      .text(0, -14, `💀 ${boss.bossName.toUpperCase()} · СТРАЖ БЕЗДНЫ`, {
        fontFamily: FONT.UI,
        fontSize: '11px',
        fontStyle: '700',
        color: '#f87171',
      })
      .setOrigin(0.5);
    title.setStroke('#000000', 3);

    const bg = this.add.rectangle(0, 2, w, h, 0x1f1726, 0.95);
    bg.setStrokeStyle(1.5, 0x7f1d1d);

    const fillBg = this.add.rectangle(-w / 2 + 2, 2, w - 4, h - 4, 0x450a0a, 1).setOrigin(0, 0.5);
    const fill = this.add.rectangle(-w / 2 + 2, 2, w - 4, h - 4, 0xdc2626, 1).setOrigin(0, 0.5);

    const hpText = this.add
      .text(0, 2, `${boss.currentHp} / ${boss.maxHp} HP`, {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: '700',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    hpText.setStroke('#000000', 3);

    cont.add([title, bg, fillBg, fill, hpText]);
    cont.setScale(0.8);
    cont.setAlpha(0);
    this.worldCam.ignore(cont);

    this.tweens.add({
      targets: cont,
      scale: 1,
      alpha: 1,
      duration: 350,
      ease: 'Back.easeOut',
    });

    this.bossBarContainer = cont;
    this.bossBarFill = fill;
    this.bossBarText = hpText;
  }

  private updateBossHealthBar(): void {
    if (!this.boss || !this.bossBarFill || !this.bossBarText) return;
    const w = 316;
    const pct = Phaser.Math.Clamp(this.boss.currentHp / this.boss.maxHp, 0, 1);
    this.bossBarFill.setSize(w * pct, 14);
    this.bossBarText.setText(`${this.boss.currentHp} / ${this.boss.maxHp} HP`);

    if (this.boss.currentPhase === 2) {
      this.bossBarFill.setFillStyle(0xf97316);
    }
  }

  private onBossDefeated(): void {
    this.altarCharged = true;

    if (this.bossBarContainer) {
      this.bossBarText?.setText('СТРАЖ ПОВЕРЖЕН!');
      this.time.delayedCall(1500, () => {
        if (this.bossBarContainer) {
          this.tweens.add({
            targets: this.bossBarContainer,
            alpha: 0,
            y: 15,
            duration: 400,
            onComplete: () => {
              this.bossBarContainer?.destroy();
              this.bossBarContainer = undefined;
            },
          });
        }
      });
    }

    // Spawn Boss Reward Chest (Free Golden Chest!)
    const chestSprite = this.add.sprite(this.altarX, this.altarY, TEXTURE.CHEST, 0);
    chestSprite.setOrigin(0.5, 1);
    chestSprite.setPipeline('Light2D');
    chestSprite.setDepth(DEPTH.YSORT_BASE + this.altarY);
    chestSprite.setTint(0xfacc15);
    this.worldLayer.add(chestSprite);

    const prompt = this.add
      .text(this.altarX, this.altarY - 26, 'E — СУНДУК БОССА (БЕСПЛАТНО)', { fontFamily: FONT.UI, fontSize: '10px', color: '#facc15' })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.YSORT_BASE + this.altarY + 1000)
      .setVisible(false);
    this.worldLayer.add(prompt);

    this.chests.push({ sprite: chestSprite, prompt, x: this.altarX, y: this.altarY, cost: 0, opened: false });

    // Spawn 20 coins
    this.spawnCoins(this.altarX, this.altarY, 20);

    // Flash and chime
    this.hitSpark.setPosition(this.altarX, this.altarY - 20);
    this.hitSpark.explode(30);
  }

  private updateBossProjectiles(delta: number): void {
    for (const proj of this.bossProjectiles) {
      const active = proj.update(delta);
      if (!active) continue;

      for (const player of this.players) {
        if (player.isDowned) continue;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, player.x, player.y - 8);
        if (dist < 16) {
          proj.destroyProjectile();
          const applied = player.takeDamage(proj.damage, proj.x, proj.y);
          if (applied) {
            SoundFX.playPlayerHurt();
            if (player === this.myPlayer) {
              this.spawnDamageNumber(player.x, player.y, `-${proj.damage}`, '#ff7a7a');
              this.damageFlash.setAlpha(0.35);
              this.tweens.add({ targets: this.damageFlash, alpha: 0, duration: 260 });
              this.worldCam.shake(80, 0.0025);
            }
            this.buildHeartsUI();
            if (player.hp <= 0) {
              if (player.immortalCharges > 0) {
                player.items['immortal_crown'] -= 1;
                player.hp = player.maxHp;
                this.buildHeartsUI();
                if (player === this.myPlayer) this.updateInventoryHUD();
                SoundFX.playItemAcquired();
                this.spawnDamageNumber(player.x, player.y - 16, 'ВОСКРЕШЕНИЕ!', '#facc15');
                this.hitSpark.setPosition(player.x, player.y - 12);
                this.hitSpark.explode(20);
              } else {
                player.playDeath(() => {
                  if (this.players.every((p) => p.isDowned)) this.triggerGameOver();
                });
              }
            }
          }
          break;
        }
      }
    }

    this.bossProjectiles = this.bossProjectiles.filter((p) => !p.isDestroyed);
  }

  private breakProp(prop: DestructibleProp): void {
    if (prop.broken) return;
    prop.broken = true;
    prop.body.enable = false;
    this.solids.remove(prop.sprite);

    SoundFX.playWoodBreak();

    AchievementManager.get().cratesBroken += 1;
    if (AchievementManager.get().cratesBroken >= 10) {
      AchievementManager.get().unlock('break_10_crates', this);
    }

    // Wood particle explosion
    this.woodSpark.setPosition(prop.x, prop.y - 8);
    this.woodSpark.explode(18);

    // Hit spark
    this.hitSpark.setPosition(prop.x, prop.y - 8);
    this.hitSpark.explode(6);

    // Spawn flat debris decal on floor
    const debris = this.add.sprite(prop.x, prop.y, TEXTURE.DEBRIS_WOOD);
    debris.setOrigin(0.5, 1);
    debris.setDepth(DEPTH.YSORT_BASE + prop.y - 20);
    debris.setPipeline('Light2D');
    debris.setAngle(Phaser.Math.Between(-15, 15));
    this.worldLayer.add(debris);

    // Break animation: quick squash and fade out
    this.tweens.add({
      targets: prop.sprite,
      scaleX: 1.25,
      scaleY: 0.35,
      alpha: 0,
      y: prop.y - 2,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => prop.sprite.destroy(),
    });

    // 50% chance to drop coins
    if (Math.random() < 0.5) {
      this.spawnCoins(prop.x, prop.y, Phaser.Math.Between(1, 3));
    }

    // 25% chance to drop a healing flask
    if (Math.random() < 0.25) {
      const flaskSprite = this.add.sprite(prop.x, prop.y, TEXTURE.PROPS, 'flask_red');
      flaskSprite.setOrigin(0.5, 1);
      flaskSprite.setPipeline('Light2D');
      flaskSprite.setDepth(DEPTH.YSORT_BASE + prop.y);
      this.worldLayer.add(flaskSprite);
      this.tweens.add({ targets: flaskSprite, y: prop.y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.flasks.push({ sprite: flaskSprite, x: prop.x, y: prop.y, collected: false });
    }
  }

  private spawnCoins(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const sprite = this.add.sprite(x, y, TEXTURE.COIN_ANIM, 0);
      sprite.setOrigin(0.5, 0.5);
      sprite.play(ANIM.COIN_SPIN);
      sprite.setDepth(DEPTH.YSORT_BASE + y + 2);
      sprite.setPipeline('Light2D');
      this.worldLayer.add(sprite);

      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(25, 75);

      this.coins.push({
        sprite,
        x,
        y,
        z: -Phaser.Math.Between(6, 14),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        vz: -Phaser.Math.Between(90, 160),
        collected: false,
        spawnTime: this.time.now,
      });
    }
  }

  private updateCoins(delta: number): void {
    const dt = delta / 1000;
    for (const coin of this.coins) {
      if (coin.collected) continue;

      if (coin.z < 0 || Math.abs(coin.vz) > 10) {
        coin.vz += 400 * dt;
        coin.z += coin.vz * dt;
        coin.x += coin.vx * dt;
        coin.y += coin.vy * dt;

        if (coin.z >= 0) {
          coin.z = 0;
          coin.vz = -coin.vz * 0.45;
          coin.vx *= 0.7;
          coin.vy *= 0.7;
        }
      }

      coin.sprite.setPosition(coin.x, coin.y + coin.z);

      if (!this.myPlayer.isDowned) {
        const dist = Phaser.Math.Distance.Between(this.myPlayer.x, this.myPlayer.y - 6, coin.x, coin.y);
        if (dist < 42) {
          const t = Math.min(1, (12 * delta) / 1000);
          coin.x = Phaser.Math.Linear(coin.x, this.myPlayer.x, t);
          coin.y = Phaser.Math.Linear(coin.y, this.myPlayer.y - 6, t);

          if (dist < 14) {
            coin.collected = true;
            coin.sprite.destroy();
            this.myPlayer.addGold(1);
            AchievementManager.get().coinsCollected += 1;
            if (this.myPlayer.gold >= 50 || AchievementManager.get().coinsCollected >= 50) {
              AchievementManager.get().unlock('gold_rush', this);
            }
            SoundFX.playCoinPickup();
            this.spawnDamageNumber(this.myPlayer.x, this.myPlayer.y - 16, '+1 🪙', '#fbbf24');
            this.goldLabel.setText(`${this.myPlayer.gold}`);
          }
        }
      }
    }

    this.coins = this.coins.filter((c) => !c.collected);
  }

  private handlePlayerHurt(player: Player, enemy: Enemy): void {
    const applied = player.takeDamage(enemy.contactDamage, enemy.x, enemy.y);
    if (!applied) return;

    SoundFX.playPlayerHurt();

    if (player === this.myPlayer) {
      this.spawnDamageNumber(player.x, player.y, `-${enemy.contactDamage}`, '#ff7a7a');
      this.damageFlash.setAlpha(0.35);
      this.tweens.add({ targets: this.damageFlash, alpha: 0, duration: 260 });
      this.worldCam.shake(80, 0.0025);
    }
    this.buildHeartsUI();

    if (player.hp <= 0) {
      if (player.immortalCharges > 0) {
        player.items['immortal_crown'] -= 1;
        player.hp = player.maxHp;
        this.buildHeartsUI();
        if (player === this.myPlayer) {
          this.updateInventoryHUD();
          AchievementManager.get().unlock('near_death', this);
        }
        SoundFX.playItemAcquired();
        this.spawnDamageNumber(player.x, player.y - 16, 'ВОСКРЕШЕНИЕ!', '#facc15');
        this.hitSpark.setPosition(player.x, player.y - 12);
        this.hitSpark.explode(20);
        return;
      }

      player.playDeath(() => {
        if (this.players.every((p) => p.isDowned)) this.triggerGameOver();
      });
    }
  }

  private triggerGameOver(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.frozen = true;
    for (const enemy of this.enemies) (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    this.showEndScreen({
      title: 'ВЫ ПОГИБЛИ',
      titleColor: '#c94f3d',
      stats: `Повержено врагов: ${this.killCount}`,
      buttonText: 'ИГРАТЬ СНОВА',
      onConfirm: () => {
        this.net?.room.sendTransition({ kind: 'gameover', nextDepth: 1 });
        this.scene.restart({ depth: 1, net: this.net });
      },
    });
  }

  private triggerLevelComplete(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.frozen = true;

    const nextHealth: Record<number, { hp: number; maxHp: number }> = {};
    for (const p of this.players) {
      nextHealth[p.slot] = { hp: p.hp, maxHp: p.maxHp };
    }

    this.showEndScreen({
      title: 'ПОДЗЕМЕЛЬЕ ПРОЙДЕНО',
      titleColor: '#9ee08a',
      stats: `Повержено врагов: ${this.killCount}   ·   Глубина: ${this.depth}`,
      buttonText: 'СПУСТИТЬСЯ ГЛУБЖЕ',
      onConfirm: () => {
        this.net?.room.sendTransition({ kind: 'levelcomplete', nextDepth: this.depth + 1, playerHealth: nextHealth });
        this.scene.restart({ depth: this.depth + 1, net: this.net, playerHealth: nextHealth, elapsedRunTime: this.elapsedRunTime });
      },
    });
  }

  private showEndScreen(opts: {
    title: string;
    titleColor: string;
    stats: string;
    buttonText: string;
    onConfirm: () => void;
  }): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const container = this.add.container(0, 0).setDepth(DEPTH.UI + 100);
    this.worldCam.ignore(container);

    const backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x07050c, 0).setDepth(0);
    const title = this.add
      .text(w / 2, h / 2 - 40, opts.title, {
        fontFamily: FONT.TITLE,
        fontSize: '36px',
        fontStyle: '700',
        color: opts.titleColor,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setStroke('#0d0a10', 6);
    const stats = this.add
      .text(w / 2, h / 2 + 8, opts.stats, {
        fontFamily: FONT.UI,
        fontSize: '13px',
        color: '#cfc6dd',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const confirm = this.add
      .text(w / 2, h / 2 + 50, opts.buttonText, {
        fontFamily: FONT.UI,
        fontSize: '16px',
        fontStyle: '600',
        color: '#f0e2b8',
      })
      .setOrigin(0.5)
      .setPadding(14, 10, 14, 10)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    confirm.on('pointerover', () => confirm.setColor('#ffce6b'));
    confirm.on('pointerout', () => confirm.setColor('#f0e2b8'));
    confirm.on('pointerdown', opts.onConfirm);

    container.add([backdrop, title, stats, confirm]);

    this.tweens.add({ targets: backdrop, fillAlpha: 0.82, duration: 500 });
    this.tweens.add({ targets: [title, stats, confirm], alpha: 1, duration: 500, delay: 250 });

    this.input.keyboard!.once('keydown-SPACE', opts.onConfirm);
  }

  private updateFlaskPickups(): void {
    for (const flask of this.flasks) {
      if (flask.collected) continue;
      for (const player of this.players) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, flask.x, flask.y);
        if (dist < PICKUP_RANGE) {
          flask.collected = true;
          player.heal(1);
          SoundFX.playFlaskPickup();
          this.buildHeartsUI();
          if (player === this.myPlayer) this.spawnDamageNumber(flask.x, flask.y, '+1', '#9ee08a');
          this.hitSpark.setPosition(flask.x, flask.y);
          this.hitSpark.explode(8);
          this.tweens.add({
            targets: flask.sprite,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            onComplete: () => flask.sprite.destroy(),
          });
          break;
        }
      }
    }
  }

  private updateChestInteractions(): void {
    for (const chest of this.chests) {
      if (chest.opened) continue;
      let anyMineInRange = false;
      for (const player of this.players) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, chest.x, chest.y);
        const inRange = dist < INTERACT_RANGE;
        if (!inRange) continue;
        if (player === this.myPlayer) {
          anyMineInRange = true;
          const canAfford = player.gold >= chest.cost;
          chest.prompt.setText(canAfford ? `E — СУНДУК (${chest.cost} 🪙)` : `НУЖНО ${chest.cost} 🪙`);
          chest.prompt.setColor(canAfford ? '#fbbf24' : '#ef4444');
        }

        const pressed = player === this.myPlayer ? this.interactPressed : this.consumeRemoteEdge(player.slot, 'interact');
        if (pressed) {
          if (player.gold >= chest.cost) {
            player.gold -= chest.cost;
            chest.opened = true;
            chest.prompt.setVisible(false);
            chest.sprite.setTexture(TEXTURE.CHEST, 1);
            SoundFX.playChestOpen();
            this.tweens.add({ targets: chest.sprite, scale: 1.15, duration: 120, yoyo: true });
            this.hitSpark.setPosition(chest.x, chest.y - 10);
            this.hitSpark.explode(10);

            const item = getRandomItem();
            player.addItem(item.id);
            if (player === this.myPlayer) {
              this.showItemAcquiredBanner(item);
              this.updateInventoryHUD();
              this.goldLabel.setText(`${this.myPlayer.gold}`);
              const uniqueCount = Object.keys(player.items).filter((k) => player.items[k] > 0).length;
              if (uniqueCount >= 3) {
                AchievementManager.get().unlock('collector', this);
              }
            }

            // Rising item float effect
            const itemSprite = this.add.sprite(chest.x, chest.y - 12, TEXTURE.PROPS, item.icon);
            itemSprite.setOrigin(0.5, 0.5);
            itemSprite.setScale(1.4);
            itemSprite.setDepth(DEPTH.YSORT_BASE + chest.y + 10);
            this.worldLayer.add(itemSprite);
            this.tweens.add({
              targets: itemSprite,
              y: chest.y - 32,
              alpha: 0,
              scale: 2.0,
              duration: 1100,
              ease: 'Cubic.easeOut',
              onComplete: () => itemSprite.destroy(),
            });

            SoundFX.playItemAcquired();
            break;
          } else if (player === this.myPlayer) {
            this.spawnDamageNumber(chest.x, chest.y - 14, 'НЕ ХВАТАЕТ ЗОЛОТА!', '#ef4444');
          }
        }
      }
      if (!chest.opened) chest.prompt.setVisible(anyMineInRange);
    }
  }
  private showItemAcquiredBanner(item: ItemDef): void {
    if (this.bannerContainer) this.bannerContainer.destroy();

    const banner = this.add.container(this.scale.width / 2, 50);
    banner.setScrollFactor(0);
    banner.setDepth(DEPTH.UI + 50);

    const bg = this.add.rectangle(0, 0, 360, 44, 0x0f0b1a, 0.92);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(item.color).color);

    const icon = this.add.sprite(-150, 0, TEXTURE.PROPS, item.icon);
    icon.setScale(1.5);

    const title = this.add.text(-125, -14, item.name, {
      fontFamily: FONT.UI,
      fontSize: '13px',
      fontStyle: '700',
      color: item.color,
    });
    title.setStroke('#000000', 3);

    const desc = this.add.text(-125, 2, item.desc, {
      fontFamily: FONT.UI,
      fontSize: '10px',
      color: '#e2e8f0',
    });
    desc.setStroke('#000000', 3);

    banner.add([bg, icon, title, desc]);
    banner.setScale(0.7);
    banner.setAlpha(0);
    this.worldCam.ignore(banner);

    this.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      y: 60,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2400, () => {
          this.tweens.add({
            targets: banner,
            alpha: 0,
            y: 45,
            duration: 300,
            ease: 'Quad.easeIn',
            onComplete: () => banner.destroy(),
          });
        });
      },
    });

    this.bannerContainer = banner;
  }

  private updateInventoryHUD(): void {
    for (const itemCont of this.itemTray) itemCont.destroy();
    this.itemTray = [];

    if (!this.myPlayer) return;
    const items = this.myPlayer.items;
    const itemIds = Object.keys(items).filter((id) => items[id] > 0);
    const startX = 20;
    const startY = 70;
    const slotSize = 22;
    const spacing = 4;

    itemIds.forEach((id, idx) => {
      const count = items[id];
      const itemDef = ITEMS[id];
      if (!itemDef) return;

      const cont = this.add.container(startX + idx * (slotSize + spacing), startY);
      cont.setScrollFactor(0);
      cont.setDepth(DEPTH.UI + 5);

      const bg = this.add.rectangle(0, 0, slotSize, slotSize, 0x181425, 0.85);
      bg.setStrokeStyle(1.5, Phaser.Display.Color.HexStringToColor(itemDef.color).color);

      const icon = this.add.sprite(0, 0, TEXTURE.PROPS, itemDef.icon);
      icon.setScale(1.1);

      cont.add([bg, icon]);

      if (count > 1) {
        const badge = this.add.text(8, 6, `x${count}`, {
          fontFamily: FONT.UI,
          fontSize: '9px',
          fontStyle: '700',
          color: '#ffffff',
        });
        badge.setOrigin(1, 1);
        badge.setStroke('#000000', 3);
        cont.add(badge);
      }

      this.worldCam.ignore(cont);
      this.itemTray.push(cont);
    });
  }

  private updateExitInteraction(): void {
    const cleared = this.enemies.length === 0 && (!this.boss || this.boss.isDead);
    let anyMineInRange = false;

    for (const player of this.players) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, this.exitX, this.exitY);
      const inRange = dist < INTERACT_RANGE;
      if (!inRange) continue;
      if (player === this.myPlayer) anyMineInRange = true;

      const pressed = player === this.myPlayer ? this.interactPressed : this.consumeRemoteEdge(player.slot, 'interact');
      if (inRange && cleared && this.altarCharged && pressed) {
        this.triggerLevelComplete();
        return;
      }
    }

    if (anyMineInRange) {
      if (!this.altarCharged) {
        this.exitPrompt.setText('АКТИВИРУЙ АЛТАРЬ И ПОБЕДИ СТРАЖА БЕЗДНЫ');
        this.exitPrompt.setColor('#ef4444');
      } else {
        this.exitPrompt.setText('E — СПУСТИТЬСЯ ГЛУБЖЕ');
        this.exitPrompt.setColor('#9ee08a');
      }
    }
    this.exitPrompt.setVisible(anyMineInRange);
  }

  /** Guest-only: cosmetic proximity prompts near chests/exit, using only the
   * locally-predicted player — the actual open/exit action is authoritative
   * on the host and arrives back via snapshot. */
  private updateLocalPrompts(): void {
    for (const chest of this.chests) {
      if (chest.opened) continue;
      const dist = Phaser.Math.Distance.Between(this.myPlayer.x, this.myPlayer.y, chest.x, chest.y);
      chest.prompt.setVisible(dist < INTERACT_RANGE);
    }

    const altarDist = Phaser.Math.Distance.Between(this.myPlayer.x, this.myPlayer.y, this.altarX, this.altarY);
    this.altarPrompt.setVisible(!this.altarActivated && altarDist < INTERACT_RANGE + 10);

    const dist = Phaser.Math.Distance.Between(this.myPlayer.x, this.myPlayer.y, this.exitX, this.exitY);
    const inRange = dist < INTERACT_RANGE;
    if (inRange) {
      if (!this.altarCharged) {
        this.exitPrompt.setText('АКТИВИРУЙ АЛТАРЬ И ПОБЕДИ СТРАЖА БЕЗДНЫ');
        this.exitPrompt.setColor('#ef4444');
      } else {
        this.exitPrompt.setText('E — СПУСТИТЬСЯ ГЛУБЖЕ');
        this.exitPrompt.setColor('#9ee08a');
      }
    }
    this.exitPrompt.setVisible(inRange);
  }

  private buildSnapshot(): WorldSnapshot {
    const players: PlayerSnapshot[] = this.players.map((p) => ({
      slot: p.slot,
      x: p.x,
      y: p.y,
      anim: p.currentAnim,
      flipX: p.flipX,
      hp: p.hp,
      maxHp: p.maxHp,
      downed: p.isDowned,
      gold: p.gold,
      items: p.items,
    }));
    const enemies: EnemySnapshot[] = this.enemies.map((e) => ({
      id: e.id,
      kind: e.kind,
      x: e.x,
      y: e.y,
      anim: e.currentAnim,
      flipX: e.flipX,
    }));
    const boss: BossSnapshot | undefined = this.boss
      ? {
          active: this.boss.active,
          x: this.boss.x,
          y: this.boss.y,
          anim: this.boss.currentAnim,
          flipX: this.boss.flipX,
          hp: this.boss.currentHp,
          maxHp: this.boss.maxHp,
          phase: this.boss.currentPhase,
        }
      : undefined;

    return {
      depth: this.depth,
      players,
      enemies,
      boss,
      flasksTaken: this.flasks.map((f, i) => (f.collected ? i : -1)).filter((i) => i >= 0),
      chestsOpened: this.chests.map((c, i) => (c.opened ? i : -1)).filter((i) => i >= 0),
      brokenProps: this.destructibles.filter((d) => d.broken).map((d) => d.id),
      killCount: this.killCount,
      elapsedRunTime: this.elapsedRunTime,
      altarActivated: this.altarActivated,
    };
  }

  private applySnapshot(snapshot: WorldSnapshot): void {
    this.killCount = snapshot.killCount;
    if (snapshot.elapsedRunTime !== undefined) this.elapsedRunTime = snapshot.elapsedRunTime;

    if (snapshot.altarActivated && !this.altarActivated) {
      this.triggerAltarEvent();
    }

    if (snapshot.boss && this.boss) {
      this.boss.applyRemoteState(
        snapshot.boss.x,
        snapshot.boss.y,
        snapshot.boss.anim,
        snapshot.boss.flipX,
        snapshot.boss.hp,
        snapshot.boss.phase
      );
      this.updateBossHealthBar();
    }

    for (const ps of snapshot.players) {
      const player = this.players.find((p) => p.slot === ps.slot);
      if (!player) continue;
      if (ps.gold !== undefined) player.gold = ps.gold;
      if (ps.items !== undefined) player.items = ps.items;

      if (player === this.myPlayer) {
        player.applyRemoteHealth(ps.hp, ps.maxHp, ps.downed);
        this.goldLabel.setText(`${this.myPlayer.gold}`);
        this.updateInventoryHUD();
      } else {
        player.applyRemoteState(ps.x, ps.y, ps.anim, ps.flipX, ps.hp, ps.maxHp, ps.downed);
      }
    }
    this.buildHeartsUI();

    const seenIds = new Set(snapshot.enemies.map((e) => e.id));
    for (const enemy of this.enemies) {
      const es = snapshot.enemies.find((e) => e.id === enemy.id);
      if (es) {
        enemy.applyRemoteState(es.x, es.y, es.anim, es.flipX);
      } else if (!seenIds.has(enemy.id) && !enemy.isDead) {
        enemy.applyRemoteState(enemy.x, enemy.y, 'dead', enemy.flipX);
      }
    }

    if (snapshot.brokenProps) {
      for (const id of snapshot.brokenProps) {
        const prop = this.destructibles.find((d) => d.id === id);
        if (prop && !prop.broken) {
          this.breakProp(prop);
        }
      }
    }

    snapshot.flasksTaken.forEach((i) => {
      const flask = this.flasks[i];
      if (flask && !flask.collected) {
        flask.collected = true;
        this.tweens.add({ targets: flask.sprite, alpha: 0, scale: 1.5, duration: 200, onComplete: () => flask.sprite.destroy() });
      }
    });
    snapshot.chestsOpened.forEach((i) => {
      const chest = this.chests[i];
      if (chest && !chest.opened) {
        chest.opened = true;
        chest.prompt.setVisible(false);
        chest.sprite.setTexture(TEXTURE.CHEST, 1);
      }
    });
  }

  private buildHeartsUI(): void {
    for (const h of this.hearts) h.destroy();
    this.hearts = [];
    const startX = 18;
    const multi = this.players.length > 1;
    const roster = [...this.players].sort((a, b) => a.slot - b.slot);

    roster.forEach((player, row) => {
      const y = 18 + row * 18;
      if (multi) {
        const tag = this.add
          .text(startX - 4, y, `${player.slot + 1}`, { fontFamily: FONT.UI, fontSize: '10px', fontStyle: '700', color: '#cfc6dd' })
          .setOrigin(1, 0.15)
          .setDepth(DEPTH.UI);
        this.worldCam.ignore(tag);
        this.hearts.push(tag);
      }
      for (let i = 0; i < player.maxHp; i++) {
        const full = i < player.hp;
        const heart = this.add
          .sprite(startX + i * 16, y, TEXTURE.HUD_ICONS, full ? HUD_ICON.HEART_FULL : HUD_ICON.HEART_EMPTY)
          .setDepth(DEPTH.UI)
          .setScale(1.6);
        this.worldCam.ignore(heart);
        this.hearts.push(heart);
      }
    });
  }
}

