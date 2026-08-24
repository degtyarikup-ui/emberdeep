import Phaser from 'phaser';
import { DEPTH, FONT, PLAYER_TINTS, PLAYER_LABEL_COLORS, TEXTURE, ANIM } from '../gfx/registry';
import { ACTORS } from '../gfx/actors';
import { ActorAnim } from '../net/types';
import { SoundFX, SurfaceType } from '../audio/SoundFX';
import { ArrowProjectile } from './ArrowProjectile';
import { EnergyProjectile } from './EnergyProjectile';
import { MetaManager } from '../meta/MetaManager';
import { EntityAnimController, AnimStateName } from '../gfx/AnimationManager';
import { ElementalSlotConfig, ElementType, ELEMENT_COLORS } from '../combat/ElementalSystem';
import { ITEM_SPRITE_MAP } from '../gfx/UIAtlas';
import { ITEMS } from '../items/registry';
import type { Enemy } from './Enemy';
import type { BossEnemy } from './BossEnemy';

const KNIGHT_SPEED = 130;
const RANGER_SPEED = 145;
const WIZARD_SPEED = 135;
const KNIGHT_ATTACK_COOLDOWN = 360;
const RANGER_ATTACK_COOLDOWN = 620;
const WIZARD_ATTACK_COOLDOWN = 480;
const ATTACK_LOCK = 140;
const KNOCKBACK_LOCK = 150;
const INVULN_DURATION = 900;
const RESPAWN_GRACE = 1400;

export type HeroClass = 'knight' | 'ranger' | 'wizard';

type AnimState = 'idle' | 'run' | 'death';

const BODY_CONFIG: Record<AnimState, { size: [number, number]; offset: [number, number] }> = {
  idle: { size: [16, 12], offset: [8, 20] }, // 32x32 frame -> feet at bottom (16, 32)
  run: { size: [16, 12], offset: [24, 52] }, // 64x64 frame -> feet at bottom (32, 64)
  death: { size: [16, 12], offset: [8, 20] }, // 32x32 frame
};

const RANGER_BODY_CONFIG: Record<AnimState, { size: [number, number]; offset: [number, number] }> = {
  idle: { size: [14, 12], offset: [9, 20] }, // 32x32 frame
  run: { size: [14, 12], offset: [9, 20] },
  death: { size: [14, 12], offset: [9, 20] },
};

const WIZARD_BODY_CONFIG: Record<AnimState, { size: [number, number]; offset: [number, number] }> = {
  idle: { size: [14, 12], offset: [9, 20] }, // 32x32 frame
  run: { size: [14, 12], offset: [9, 20] },
  death: { size: [14, 12], offset: [9, 20] },
};

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shift?: boolean;
}

export interface SpecialResult {
  kind: 'whirlwind' | 'volley' | 'supernova';
  x: number;
  y: number;
  radius?: number;
  damage?: number;
  projectiles?: (ArrowProjectile | EnergyProjectile)[];
  element?: ElementType;
}

export interface ClassSkillResult {
  kind: 'shield_bastion' | 'shadow_dodge' | 'healing_repulse';
  x: number;
  y: number;
  duration?: number;
  radius?: number;
  healAmount?: number;
  element?: ElementType;
}

export interface AttackResult {
  kind: 'melee' | 'arrow' | 'energy';
  projectile?: ArrowProjectile | EnergyProjectile;
  aimAngle?: number;
  element?: ElementType;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  heroClass: HeroClass = 'knight';
  maxHp = 3;
  hp = 3;
  gold = 0;
  items: Record<string, number> = {};
  elementalSlots: ElementalSlotConfig = {};
  isSprinting = false;
  specialCooldown = 0;
  specialMaxCooldown = 4000;
  classSkillCooldown = 0;
  classSkillMaxCooldown = 8000;
  readonly slot: number;
  readonly label: Phaser.GameObjects.Text;
  readonly sword: Phaser.GameObjects.Sprite;

  public knightShieldActive = false;
  public knightShieldTimer = 0;
  public knightShieldHits = 0;
  private knightShieldCont?: Phaser.GameObjects.Container;

  private invuln = 0;
  private attackCooldown = 0;
  private attackLock = 0;
  private knockbackLock = 0;
  private baseScale = 1;
  private animController!: EntityAnimController;
  private shadow!: Phaser.GameObjects.Sprite;
  private dying = false;
  public isAttacking = false;
  private swordOffset = { x: 6, y: -13 };
  private swordAngle = 20;
  private sprintTrailTimer = 0;
  private wasSprinting = false;

  private netTargetX = 0;
  private netTargetY = 0;
  private hasNetTarget = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    slot = 0,
    initialHealth?: { hp?: number; maxHp?: number },
    heroClass: HeroClass = 'knight'
  ) {
    const isKnight = heroClass === 'knight';
    const isRanger = heroClass === 'ranger';
    const initTex = isKnight ? ACTORS.HERO.idle.key : isRanger ? TEXTURE.RANGER_IDLE : `${TEXTURE.WIZARD_IDLE}_f0`;
    super(scene, x, y, initTex, 0);

    this.slot = slot;
    this.heroClass = heroClass;
    this.specialMaxCooldown = isKnight ? 3500 : isRanger ? 4200 : 4000;
    this.classSkillMaxCooldown = isKnight ? 8000 : isRanger ? 4500 : 10000;
    this.specialCooldown = 0;
    this.classSkillCooldown = 0;

    const bonuses = MetaManager.get().getBonuses();

    if (initialHealth?.maxHp !== undefined) {
      this.maxHp = initialHealth.maxHp;
    } else {
      this.maxHp = (isKnight ? 6 : 4) + bonuses.extraHp;
    }

    if (initialHealth?.hp !== undefined) {
      this.hp = initialHealth.hp;
    } else {
      this.hp = this.maxHp;
    }

    this.gold = bonuses.startGold;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.specialMaxCooldown = isKnight ? 8000 : isRanger ? 4200 : 4000;
    this.specialCooldown = 0;

    this.setOrigin(0.5, 1.0);
    this.setPipeline('Light2D');
    this.setTint(PLAYER_TINTS[slot] ?? 0xffffff);
    this.baseScale = isKnight ? 1.0 : isRanger ? 1.22 : 1.35;
    this.setScale(this.baseScale);

    if (isKnight) {
      this.play(ACTORS.HERO.idle.key);
    } else if (isRanger) {
      this.play(ANIM.RANGER_IDLE);
    } else {
      this.play(ANIM.WIZARD_IDLE);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const bodyCfg = isKnight ? BODY_CONFIG.idle : isRanger ? RANGER_BODY_CONFIG.idle : WIZARD_BODY_CONFIG.idle;
    body.setSize(bodyCfg.size[0], bodyCfg.size[1]);
    body.setOffset(bodyCfg.offset[0], bodyCfg.offset[1]);
    body.setCollideWorldBounds(true);
    this.setDepth(DEPTH.YSORT_BASE + y + 16);

    // Weapon sprite: Sword for Knight, Bow for Ranger, Staff for Wizard
    const weaponTex = isKnight ? TEXTURE.WEAPON_SWORD : isRanger ? TEXTURE.BOW : TEXTURE.STAFF;
    this.sword = scene.add.sprite(x + 6, y - 13, weaponTex);
    this.sword.setOrigin(isKnight ? 0.5 : isRanger ? 0.5 : 0.5, isKnight ? 0.88 : isRanger ? 0.5 : 0.85);
    this.sword.setPipeline('Light2D');
    this.sword.setDepth(DEPTH.YSORT_BASE + y + 17);
    this.sword.setScale(isKnight ? 1.0 : isRanger ? 1.15 : 1.25);

    this.shadow = scene.add.sprite(x, y + 2, TEXTURE.SHADOW).setAlpha(0.35).setDepth(DEPTH.SHADOW);
    this.shadow.setScale(isKnight ? 1.0 : isRanger ? 1.15 : 1.25);
    this.animController = new EntityAnimController(this);
    // Setup states onController
    this.animController.registerState('idle', { priority: 10, interruptible: true });
    this.animController.registerState('run', { priority: 20, interruptible: true });
    this.animController.registerState('death', { priority: 100, interruptible: false });
    this.animController.registerState('hit', { priority: 80, interruptible: false, duration: 150 });

    this.label = scene.add
      .text(x, y - 34, `${slot + 1}`, {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: '700',
        color: PLAYER_LABEL_COLORS[slot] ?? '#f0e2b8',
      })
      .setOrigin(0.5, 1)
      .setStroke('#0d0a10', 3)
      .setVisible(false);
  }

  godMode = false;
  speedHack = false;
  private footstepTimer = 0;

  get moveSpeed(): number {
    const metaSpeed = MetaManager.get().getBonuses().speedMultiplier;
    const classSpeed = this.heroClass === 'knight' ? KNIGHT_SPEED : this.heroClass === 'ranger' ? RANGER_SPEED : WIZARD_SPEED;
    const baseSpeed = classSpeed * metaSpeed;
    const base = baseSpeed * (1 + (this.items['boots'] || 0) * 0.15);
    const sprintFactor = this.isSprinting ? 1.55 : 1.0;
    const hackFactor = this.speedHack ? 2.2 : 1.0;
    return base * sprintFactor * hackFactor;
  }

  get attackDamage(): number {
    const metaDmg = MetaManager.get().getBonuses().damageMultiplier;
    const base = this.heroClass === 'knight' ? 2 : 1;
    const whetstoneBonus = (this.items['whetstone'] || 0) * 0.3;
    const prismBonus = (this.items['prismatic_prism'] || 0) * 0.25;
    return (base + whetstoneBonus) * (1 + prismBonus) * metaDmg;
  }

  get critChance(): number {
    const metaCrit = MetaManager.get().getBonuses().extraCrit;
    return (this.items['crit_dagger'] || 0) * 0.15 + metaCrit;
  }

  get attackCooldownMultiplier(): number {
    const wristbandBonus = (this.items['berserker_wristband'] || 0) * 0.20;
    return Math.max(0.4, 1 - wristbandBonus);
  }

  get specialCooldownMultiplier(): number {
    const hourglassBonus = (this.items['chrono_hourglass'] || 0) * 0.25;
    return Math.max(0.4, 1 - hourglassBonus);
  }

  get goldMultiplier(): number {
    const midasBonus = (this.items['midas_coin'] || 0) * 0.50;
    const luckyBonus = (this.items['lucky_horseshoe'] || 0) * 0.15;
    return 1 + midasBonus + luckyBonus;
  }

  get thornsDamage(): number {
    return (this.items['iron_pauldrons'] || 0) * 4;
  }

  get bossDamageMultiplier(): number {
    return 1 + (this.items['giant_slayer_ring'] || 0) * 0.60;
  }

  get hasExecutionerAxe(): boolean {
    return (this.items['executioner_axe'] || 0) > 0;
  }

  get projectilePierceBonus(): number {
    return (this.items['prismatic_prism'] || 0) * 1;
  }

  get hasPrismaticPrism(): boolean {
    return (this.items['prismatic_prism'] || 0) > 0;
  }

  get hasThunderTalisman(): boolean {
    return (this.items['thunder_talisman'] || 0) > 0;
  }

  get hasMoltenCore(): boolean {
    return (this.items['molten_core'] || 0) > 0;
  }

  get hasBlizzardRing(): boolean {
    return (this.items['blizzard_ring'] || 0) > 0;
  }

  get leechChance(): number {
    return Math.min(0.75, (this.items['leech_fang'] || 0) * 0.25);
  }

  get stormTargets(): number {
    return (this.items['storm_earring'] || 0) * 2;
  }

  get hasOilLamp(): boolean {
    return (this.items['oil_lamp'] || 0) > 0;
  }

  get immortalCharges(): number {
    return this.items['immortal_crown'] || 0;
  }

  bloodChaliceKills = 0;
  radiantShieldActive = false;
  radiantShieldTimer = 0;
  private shieldRing?: Phaser.GameObjects.Arc;

  onEnemyKilled(): boolean {
    if ((this.items['blood_chalice'] || 0) > 0) {
      this.bloodChaliceKills += 1;
      if (this.bloodChaliceKills >= 10) {
        this.bloodChaliceKills = 0;
        this.heal(1);
        return true;
      }
    }
    return false;
  }

  addItem(itemId: string): void {
    this.items[itemId] = (this.items[itemId] || 0) + 1;
    if (itemId === 'titan_heart') {
      this.maxHp += 1;
      this.hp = Math.min(this.maxHp, this.hp + 1);
    }
    if (itemId === 'radiant_shield') {
      this.radiantShieldActive = true;
      this.radiantShieldTimer = 0;
    }
    this.updateElementalSlots();
  }

  updateElementalSlots(): void {
    this.elementalSlots = {};
    for (const [id, count] of Object.entries(this.items)) {
      if (count <= 0) continue;
      const def = ITEMS[id];
      if (def && def.element && def.elementSlot) {
        this.elementalSlots[def.elementSlot] = def.element;
      }
    }
  }

  addGold(amount: number): void {
    this.gold += Math.round(amount * this.goldMultiplier);
  }

  get isInvulnerable(): boolean {
    return this.invuln > 0;
  }

  get isDying(): boolean {
    return this.dying;
  }

  get isDowned(): boolean {
    return this.dying;
  }

  get currentAnim(): ActorAnim {
    const s = this.animController ? this.animController.current : 'idle';
    return (s === 'idle' || s === 'run' || s === 'death') ? s : 'idle';
  }

  setLabelVisible(visible: boolean): void {
    this.label.setVisible(visible);
  }

  public activateKnightShield(): void {
    this.knightShieldActive = true;
    this.knightShieldTimer = 2500;
    this.knightShieldHits = 2;
    SoundFX.playShieldBlock();

    if (this.knightShieldCont) {
      this.knightShieldCont.destroy();
    }

    const cont = this.scene.add.container(this.x, this.y - 14);
    cont.setDepth(DEPTH.YSORT_BASE + this.y + 18);

    // 1. Glowing Azure Aura Ring
    const aura = this.scene.add.circle(0, 0, 22, 0x38bdf8, 0.22);
    aura.setStrokeStyle(2, 0x93c5fd, 0.9);
    cont.add(aura);

    // 2. Shield Crest
    const shieldFrame = ITEM_SPRITE_MAP.shield.row * 11 + ITEM_SPRITE_MAP.shield.col;
    const shieldSpr = this.scene.add.sprite(0, -2, TEXTURE.ITEMS_32ROGUES, shieldFrame);
    shieldSpr.setScale(1.2);
    shieldSpr.setAlpha(0.92);
    shieldSpr.setTint(0xe0f2fe);
    cont.add(shieldSpr);

    const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (worldLayer) worldLayer.add(cont);

    this.knightShieldCont = cont;

    this.scene.tweens.add({
      targets: [aura, shieldSpr],
      scaleX: '+=0.15',
      scaleY: '+=0.15',
      alpha: 0.7,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public destroyKnightShield(withShatter = false): void {
    this.knightShieldActive = false;
    this.knightShieldTimer = 0;
    this.knightShieldHits = 0;

    if (this.knightShieldCont) {
      if (withShatter && this.scene) {
        this.scene.tweens.add({
          targets: this.knightShieldCont,
          scaleX: 2.0,
          scaleY: 2.0,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            this.knightShieldCont?.destroy();
            this.knightShieldCont = undefined;
          },
        });
      } else {
        this.knightShieldCont.destroy();
        this.knightShieldCont = undefined;
      }
    }
  }

  private triggerShieldBlockEffect(_fromX?: number, _fromY?: number): void {
    if (!this.scene) return;

    // 1. Floating text "БЛОК"
    const gs = this.scene as unknown as { spawnDamageNumber?: (x: number, y: number, text: string, color: string) => void; enemies?: { isDead?: boolean; x: number; y: number; body?: Phaser.Physics.Arcade.Body }[] };
    if (gs.spawnDamageNumber) {
      gs.spawnDamageNumber(this.x, this.y - 24, 'БЛОК', '#38bdf8');
    }

    // 2. Flash tint
    this.setTint(0x60a5fa);
    this.scene.time.delayedCall(120, () => this.clearTint());

    // 3. Metallic spark burst
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
      const speed = 60 + Math.random() * 80;
      const spark = this.scene.add.rectangle(this.x, this.y - 14, 3, 3, 0xbae6fd);
      spark.setDepth(DEPTH.YSORT_BASE + this.y + 20);
      const wl = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
      if (wl) wl.add(spark);

      this.scene.tweens.add({
        targets: spark,
        x: this.x + Math.cos(angle) * (speed * 0.25),
        y: this.y - 14 + Math.sin(angle) * (speed * 0.25),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 220,
        onComplete: () => spark.destroy(),
      });
    }

    // 4. Expanding shockwave ring
    const shockwave = this.scene.add.circle(this.x, this.y - 14, 16, 0x38bdf8, 0.45);
    shockwave.setStrokeStyle(2.5, 0x93c5fd, 0.9);
    shockwave.setDepth(DEPTH.YSORT_BASE + this.y + 19);
    const wl = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (wl) wl.add(shockwave);

    this.scene.tweens.add({
      targets: shockwave,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => shockwave.destroy(),
    });

    // 5. Knockback nearby enemies in 50px radius
    if (gs.enemies) {
      for (const enemy of gs.enemies) {
        if (enemy.isDead) continue;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist <= 50) {
          const body = enemy.body as Phaser.Physics.Arcade.Body;
          if (body) {
            const edx = enemy.x - this.x;
            const edy = enemy.y - this.y;
            const elen = Math.hypot(edx, edy) || 1;
            body.setVelocity((edx / elen) * 200, (edy / elen) * 200);
          }
        }
      }
    }
  }

  /** Returns true if damage was actually applied (false while invulnerable or in godMode). */
  takeDamage(amount: number, fromX: number, fromY: number): boolean {
    if (this.godMode || this.invuln > 0 || this.dying) return false;

    // Radiant Shield barrier absorbs 1 full hit
    if (this.radiantShieldActive) {
      this.radiantShieldActive = false;
      this.radiantShieldTimer = 0;
      this.invuln = 400; // brief grace period
      SoundFX.playEnergyHit();
      if (this.shieldRing) {
        this.scene.tweens.add({
          targets: this.shieldRing,
          scaleX: 2.2,
          scaleY: 2.2,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            this.shieldRing?.destroy();
            this.shieldRing = undefined;
          },
        });
      }
      return false;
    }

    // 1. Knight Active Shield Bastion Block
    if (this.knightShieldActive) {
      this.knightShieldHits--;
      SoundFX.playShieldBlock();
      this.triggerShieldBlockEffect(fromX, fromY);

      if (this.knightShieldHits <= 0) {
        this.destroyKnightShield(true);
      }
      this.invuln = 350;
      return false; // Complete block!
    }

    // 2. Knight Active Melee Swing Guard
    let finalAmount = amount;
    if (this.heroClass === 'knight' && this.isAttacking) {
      SoundFX.playShieldBlock();
      if (Math.random() < 0.5) {
        this.triggerShieldBlockEffect(fromX, fromY);
        this.invuln = 450;
        return false; // Complete parry block!
      }
      finalAmount = Math.max(1, finalAmount - 1);
    }

    this.hp = Math.max(0, this.hp - finalAmount);
    this.invuln = INVULN_DURATION;
    this.knockbackLock = KNOCKBACK_LOCK;

    // Iron Pauldrons Thorns trigger
    if (this.thornsDamage > 0) {
      this.triggerThornsBurst();
    }
    
    // Hit reaction
    this.setTint(0xff4422);
    this.scene.time.delayedCall(100, () => this.clearTint());
    this.triggerSquash(1.15, 0.85, 80);
    if (this.heroClass === 'knight') {
      this.setAnimState('hit');
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / len) * 150, (dy / len) * 150);

    return true;
  }

  private triggerSquash(scaleXMult: number, scaleYMult: number, duration: number, ease = 'Quad.easeOut'): void {
    if (!this.scene) return;
    this.scene.tweens.killTweensOf(this);
    this.setScale(this.baseScale);
    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * scaleXMult,
      scaleY: this.baseScale * scaleYMult,
      duration: duration / 2,
      yoyo: true,
      ease,
      onComplete: () => {
        this.setScale(this.baseScale);
      },
    });
  }

  private triggerThornsBurst(): void {
    if (!this.scene) return;
    SoundFX.playSwordSwing();
    const ring = this.scene.add.circle(this.x, this.y - 14, 36, 0x94a3b8, 0.4);
    ring.setStrokeStyle(2, 0xe2e8f0, 0.9);
    ring.setDepth(DEPTH.YSORT_BASE + this.y + 10);
    const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (worldLayer) worldLayer.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
    const gameScene = this.scene as unknown as { enemies?: Enemy[]; boss?: BossEnemy; spawnDamageNumber?: (x: number, y: number, text: string, color?: string) => void };
    if (gameScene.enemies) {
      for (const enemy of gameScene.enemies) {
        if (enemy.isDead) continue;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist <= 64) {
          enemy.takeDamage(this.thornsDamage, this.x, this.y, gameScene.enemies);
          if (gameScene.spawnDamageNumber) {
            gameScene.spawnDamageNumber(enemy.x, enemy.y - 10, `ШИПЫ -${this.thornsDamage}`, '#94a3b8');
          }
        }
      }
    }
    if (gameScene.boss && !gameScene.boss.isDead) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, gameScene.boss.x, gameScene.boss.y);
      if (dist <= 72) {
        gameScene.boss.takeDamage(this.thornsDamage, this.x, this.y);
        if (gameScene.spawnDamageNumber) {
          gameScene.spawnDamageNumber(gameScene.boss.x, gameScene.boss.y - 16, `ШИПЫ -${this.thornsDamage}`, '#94a3b8');
        }
      }
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  increaseMaxHp(amount: number): void {
    this.maxHp += amount;
    this.hp = this.maxHp;
  }

  /** Plays the death animation, then invokes onComplete. */
  playDeath(onComplete: () => void): void {
    this.dying = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.animController.forceTransition('death');
    this.setOrigin(0.5, 1.0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(BODY_CONFIG.death.size[0], BODY_CONFIG.death.size[1]);
      body.setOffset(BODY_CONFIG.death.offset[0], BODY_CONFIG.death.offset[1]);
    }
    this.sword.setVisible(false);
    this.play(ACTORS.HERO.death.key);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, onComplete);
  }

  respawnAt(x: number, y: number): void {
    this.dying = false;
    this.setPosition(x, y);
    this.hp = this.maxHp;
    this.invuln = RESPAWN_GRACE;
    this.knockbackLock = 0;
    this.attackLock = 0;
    this.setAlpha(1);
    this.sword.setVisible(true);
    this.setAnimState('idle');
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.updateSwordTransform(false);
  }

  /** Returns attack result or null if on cooldown. */
  tryAttack(targetX?: number, targetY?: number): AttackResult | null {
    if (this.attackCooldown > 0 || this.dying) return null;
    const baseCd =
      this.heroClass === 'knight'
        ? KNIGHT_ATTACK_COOLDOWN
        : this.heroClass === 'ranger'
        ? RANGER_ATTACK_COOLDOWN
        : WIZARD_ATTACK_COOLDOWN;
    this.attackCooldown = baseCd * this.attackCooldownMultiplier;
    this.attackLock = ATTACK_LOCK;

    const dir = this.flipX ? -1 : 1;
    let angle = dir < 0 ? Math.PI : 0;
    if (targetX !== undefined && targetY !== undefined) {
      angle = Phaser.Math.Angle.Between(this.x, this.y - 14, targetX, targetY);
      this.setFlipX(Math.cos(angle) < 0);
    }

    const pierce = 1 + this.projectilePierceBonus;

    if (this.heroClass === 'ranger') {
      SoundFX.playArrowShoot();
      const spawnX = this.x + Math.cos(angle) * 12;
      const spawnY = this.y - 14 + Math.sin(angle) * 12;
      const arrow = new ArrowProjectile(
        this.scene,
        spawnX,
        spawnY,
        angle,
        Math.max(1, Math.round(this.attackDamage)),
        pierce,
        360
      );
      if (this.elementalSlots.attack) {
        const col = ELEMENT_COLORS[this.elementalSlots.attack];
        arrow.setTint(Phaser.Display.Color.HexStringToColor(col).color);
      }
      this.playRangerShootAnimation(angle);
      return { kind: 'arrow', projectile: arrow, aimAngle: angle, element: this.elementalSlots.attack };
    } else if (this.heroClass === 'wizard') {
      SoundFX.playStaffCast();
      const spawnX = this.x + Math.cos(angle) * 14;
      const spawnY = this.y - 14 + Math.sin(angle) * 14;
      const energy = new EnergyProjectile(
        this.scene,
        spawnX,
        spawnY,
        angle,
        Math.max(1, Math.round(this.attackDamage)),
        pierce,
        340,
        this.elementalSlots.attack,
        false
      );
      this.playWizardCastAnimation(angle);
      return { kind: 'energy', projectile: energy, aimAngle: angle, element: this.elementalSlots.attack };
    } else {
      this.playAttackAnimation(angle);
      return { kind: 'melee', aimAngle: angle, element: this.elementalSlots.attack };
    }
  }

  /** Triggers special ability (Knight Whirlwind, Ranger Arrow Volley, or Wizard Arcane Supernova). */
  trySpecial(targetX?: number, targetY?: number): SpecialResult | null {
    if (this.specialCooldown > 0 || this.dying) return null;
    this.specialCooldown = this.specialMaxCooldown * this.specialCooldownMultiplier;

    const pierce = 2 + this.projectilePierceBonus;

    if (this.heroClass === 'ranger') {
      SoundFX.playArrowVolley();
      const dir = this.flipX ? -1 : 1;
      let baseAngle = dir < 0 ? Math.PI : 0;
      if (targetX !== undefined && targetY !== undefined) {
        baseAngle = Phaser.Math.Angle.Between(this.x, this.y - 14, targetX, targetY);
      }

      const projectiles: ArrowProjectile[] = [];
      // Charge pulse before fan fire
      const pulse = this.scene.add.circle(this.x, this.y - 14, 12, 0x4ade80, 0.6);
      this.scene.tweens.add({ targets: pulse, scale: 2.5, alpha: 0, duration: 250, onComplete: () => pulse.destroy() });
      const spread = 0.45; // ~26 degrees fan
      const count = 5;
      for (let i = 0; i < count; i++) {
        const offset = ((i - (count - 1) / 2) / (count - 1)) * spread;
        const angle = baseAngle + offset;
        const spawnX = this.x + Math.cos(angle) * 12;
        const spawnY = this.y - 14 + Math.sin(angle) * 12;
        const arrow = new ArrowProjectile(
          this.scene,
          spawnX,
          spawnY,
          angle,
          Math.max(1, Math.round(this.attackDamage * 1.5)),
          pierce,
          380
        );
        if (this.elementalSlots.skill) {
          const col = ELEMENT_COLORS[this.elementalSlots.skill];
          arrow.setTint(Phaser.Display.Color.HexStringToColor(col).color);
        }
        projectiles.push(arrow);
      }
      this.playRangerShootAnimation(baseAngle);
      return { kind: 'volley', x: this.x, y: this.y, projectiles, element: this.elementalSlots.skill };
    } else if (this.heroClass === 'wizard') {
      SoundFX.playSupernova();
      this.playSupernovaAnimation();

      const projectiles: EnergyProjectile[] = [];
      const count = 8;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const spawnX = this.x + Math.cos(angle) * 14;
        const spawnY = this.y - 14 + Math.sin(angle) * 14;
        const energy = new EnergyProjectile(
          this.scene,
          spawnX,
          spawnY,
          angle,
          Math.max(1, Math.round(this.attackDamage * 1.3)),
          pierce,
          320,
          this.elementalSlots.skill,
          true
        );
        projectiles.push(energy);
      }
      return { kind: 'supernova', x: this.x, y: this.y, projectiles, element: this.elementalSlots.skill };
    } else {
      SoundFX.playWhirlwind();
      this.playWhirlwindAnimation();
      return {
        kind: 'whirlwind',
        x: this.x,
        y: this.y,
        radius: 65,
        damage: Math.max(2, Math.round(this.attackDamage * 2.0)),
        element: this.elementalSlots.skill,
      };
    }
  }

  private playWhirlwindAnimation(): void {
    const ring = this.scene.add.sprite(this.x, this.y - 14, TEXTURE.SLASH_WHIRLWIND);
    ring.setOrigin(0.5, 0.5);
    ring.setScale(0.8);
    ring.setDepth(DEPTH.YSORT_BASE + this.y + 10);
    ring.setPipeline('Light2D');
    if (this.elementalSlots.skill) {
      const col = ELEMENT_COLORS[this.elementalSlots.skill];
      ring.setTint(Phaser.Display.Color.HexStringToColor(col).color);
    } else {
      ring.setTint(0x67e8f9);
    }

    const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (worldLayer) worldLayer.add(ring);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.2,
      scaleY: 2.2,
      angle: 720,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.triggerSquash(1.3, 0.85, 100);
  }

  /** Triggers class utility skill on [Q] (Knight Shield Bastion, Ranger Shadow Dodge, Wizard Healing Repulse). */
  tryClassSkill(targetX?: number, targetY?: number): ClassSkillResult | null {
    if (this.classSkillCooldown > 0 || this.dying) return null;
    this.classSkillCooldown = this.classSkillMaxCooldown * this.specialCooldownMultiplier;

    if (this.heroClass === 'knight') {
      this.activateKnightShield();
      return {
        kind: 'shield_bastion',
        x: this.x,
        y: this.y,
        duration: 2500,
        element: this.elementalSlots.skill,
      };
    } else if (this.heroClass === 'ranger') {
      this.activateShadowDodge(targetX, targetY);
      return {
        kind: 'shadow_dodge',
        x: this.x,
        y: this.y,
        duration: 400,
        element: this.elementalSlots.dash,
      };
    } else {
      this.activateHealingRepulse();
      return {
        kind: 'healing_repulse',
        x: this.x,
        y: this.y,
        radius: 90,
        healAmount: 1,
        element: this.elementalSlots.skill,
      };
    }
  }

  public activateShadowDodge(targetX?: number, targetY?: number): void {
    SoundFX.playDash();
    this.invuln = 450; // 0.45s invulnerability frames!
    this.isSprinting = true;

    const body = this.body as Phaser.Physics.Arcade.Body;
    let angle = this.flipX ? Math.PI : 0;
    if (targetX !== undefined && targetY !== undefined) {
      angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    } else if (body.velocity.lengthSq() > 10) {
      angle = Math.atan2(body.velocity.y, body.velocity.x);
    }

    const dashSpeed = 340;
    body.setVelocity(Math.cos(angle) * dashSpeed, Math.sin(angle) * dashSpeed);
    this.knockbackLock = 250;

    if (this.scene) {
      for (let i = 0; i < 4; i++) {
        this.scene.time.delayedCall(i * 60, () => {
          if (!this.active || !this.scene) return;
          const clone = this.scene.add.sprite(this.x, this.y, TEXTURE.RANGER_IDLE);
          clone.setOrigin(this.originX, this.originY);
          clone.setScale(this.baseScale);
          clone.setFlipX(this.flipX);
          clone.setDepth(DEPTH.YSORT_BASE + this.y + 10);
          clone.setTint(0x4ade80);
          clone.setAlpha(0.6);

          const wl = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
          if (wl) wl.add(clone);

          this.scene.tweens.add({
            targets: clone,
            alpha: 0,
            scaleX: this.baseScale * 1.1,
            scaleY: this.baseScale * 1.1,
            duration: 250,
            onComplete: () => clone.destroy(),
          });
        });
      }
    }
  }

  public activateHealingRepulse(): void {
    SoundFX.playPowerUp();
    SoundFX.playEnergyHit();

    this.hp = Math.min(this.maxHp, this.hp + 1);

    const gs = this.scene as unknown as { spawnDamageNumber?: (x: number, y: number, text: string, color: string) => void; enemies?: { isDead?: boolean; x: number; y: number; body?: Phaser.Physics.Arcade.Body }[]; buildHeartsUI?: () => void };
    if (gs.spawnDamageNumber) {
      gs.spawnDamageNumber(this.x, this.y - 28, '+1 HP', '#4ade80');
    }
    if (gs.buildHeartsUI) {
      gs.buildHeartsUI();
    }

    if (this.scene) {
      const ring = this.scene.add.circle(this.x, this.y - 14, 20, 0x4ade80, 0.4);
      ring.setStrokeStyle(3, 0xa7f3d0, 0.95);
      ring.setDepth(DEPTH.YSORT_BASE + this.y + 19);
      const wl = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
      if (wl) wl.add(ring);

      this.scene.tweens.add({
        targets: ring,
        scaleX: 4.5,
        scaleY: 4.5,
        alpha: 0,
        duration: 350,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });

      for (let i = 0; i < 10; i++) {
        const spark = this.scene.add.rectangle(this.x, this.y - 14, 4, 4, 0x86efac);
        spark.setDepth(DEPTH.YSORT_BASE + this.y + 20);
        if (wl) wl.add(spark);
        const ang = (Math.PI * 2 * i) / 10;
        this.scene.tweens.add({
          targets: spark,
          x: this.x + Math.cos(ang) * 65,
          y: this.y - 14 + Math.sin(ang) * 65,
          alpha: 0,
          scale: 0.1,
          duration: 350,
          onComplete: () => spark.destroy(),
        });
      }

      if (gs.enemies) {
        for (const enemy of gs.enemies) {
          if (enemy.isDead) continue;
          const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
          if (dist <= 95) {
            const body = enemy.body as Phaser.Physics.Arcade.Body;
            if (body) {
              const edx = enemy.x - this.x;
              const edy = enemy.y - this.y;
              const elen = Math.hypot(edx, edy) || 1;
              body.setVelocity((edx / elen) * 260, (edy / elen) * 260);
            }
          }
        }
      }
    }
  }

  private playRangerShootAnimation(aimAngle: number): void {
    this.isAttacking = true;
    const dir = this.flipX ? -1 : 1;

    // Switch bow to drawn string texture
    this.sword.setTexture(TEXTURE.BOW_DRAWN);
    this.sword.setOrigin(0.5, 0.5);

    // Aim bow in shooting direction
    this.sword.setRotation(aimAngle);

    // Pullback recoil
    const recoilDist = -5;
    const recoilX = Math.cos(aimAngle) * recoilDist;
    const recoilY = Math.sin(aimAngle) * recoilDist;

    this.sword.setPosition(this.x + 6 * dir + recoilX, this.y - 14 + recoilY);

    // Body squash/recoil
    this.triggerSquash(1.12, 0.92, 50);

    // Spring forward on release and return to standard bow
    this.scene.time.delayedCall(70, () => {
      this.sword.setTexture(TEXTURE.BOW);
      this.scene.tweens.add({
        targets: this.sword,
        x: this.x + 6 * dir + Math.cos(aimAngle) * 4,
        y: this.y - 14 + Math.sin(aimAngle) * 4,
        duration: 90,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.isAttacking = false;
        },
      });
    });
  }

  private playWizardCastAnimation(aimAngle: number): void {
    this.isAttacking = true;
    const dir = this.flipX ? -1 : 1;

    // Staff thrust forward
    this.sword.setOrigin(0.5, 0.85);
    this.sword.setRotation(aimAngle + 0.25 * dir);

    const castDist = 10;
    const thrustX = Math.cos(aimAngle) * castDist;
    const thrustY = Math.sin(aimAngle) * castDist;

    this.sword.setPosition(this.x + 6 * dir + thrustX, this.y - 14 + thrustY);

    // Body squash/recoil
    this.triggerSquash(1.15, 0.9, 60);

    // Reset staff position
    this.scene.time.delayedCall(90, () => {
      this.scene.tweens.add({
        targets: this.sword,
        x: this.x + 6 * dir,
        y: this.y - 13,
        rotation: 0.15 * dir,
        duration: 100,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.isAttacking = false;
        },
      });
    });
  }

  private playSupernovaAnimation(): void {
    // Expanding magic nova ring
    const ring = this.scene.add.circle(this.x, this.y - 14, 16, 0xc084fc, 0.7);
    ring.setStrokeStyle(3, 0xf0abfc, 0.95);
    ring.setDepth(DEPTH.YSORT_BASE + this.y + 10);

    const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (worldLayer) worldLayer.add(ring);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.triggerSquash(1.35, 0.82, 120, 'Back.easeOut');
  }

  /** Triggers the sword swing, slash arc FX, body lunge, and audio. */
  playAttackAnimation(aimAngle: number): void {
    this.isAttacking = true;
    SoundFX.playSwordSwing();

    // Body squash/lunge tween
    this.triggerSquash(1.25, 0.88, 75);

    // Slash Arc Visual Effect placed and rotated along aimAngle
    const slashDist = 24;
    const slashX = this.x + Math.cos(aimAngle) * slashDist;
    const slashY = this.y - 14 + Math.sin(aimAngle) * slashDist;

    const slash = this.scene.add.sprite(slashX, slashY, TEXTURE.SLASH_FX);
    slash.setOrigin(0.35, 0.5);
    slash.setDepth(DEPTH.YSORT_BASE + this.y + 4);
    slash.setPipeline('Light2D');
    slash.setScale(0.9);
    slash.setAlpha(0.95);
    slash.setRotation(aimAngle);
    if (this.elementalSlots.attack) {
      const col = ELEMENT_COLORS[this.elementalSlots.attack];
      slash.setTint(Phaser.Display.Color.HexStringToColor(col).color);
    }

    const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (worldLayer) worldLayer.add(slash);

    this.scene.tweens.add({
      targets: slash,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });

    // Sword dynamic rotation along aim angle: windup -> sweep through aimAngle -> rest
    this.sword.setOrigin(0.5, 0.9);
    const startAngle = aimAngle - 1.2;
    const slashAngle = aimAngle + 1.2;

    this.sword.setPosition(this.x + Math.cos(aimAngle) * 6, this.y - 14 + Math.sin(aimAngle) * 6);
    this.sword.setRotation(startAngle);

    this.scene.tweens.add({
      targets: this.sword,
      rotation: slashAngle,
      x: this.x + Math.cos(aimAngle) * 16,
      y: this.y - 14 + Math.sin(aimAngle) * 16,
      duration: 85,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.sword,
          x: this.x + 6 * (this.flipX ? -1 : 1),
          y: this.y - 13,
          duration: 110,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.isAttacking = false;
          },
        });
      },
    });
  }

  private setAnimState(next: AnimState | 'hit'): void {
    if (next === 'hit') {
       this.animController.tryTransition('hit');
       return;
    }
    if (!this.animController || !this.animController.tryTransition(next as AnimStateName)) return;
    this.setOrigin(0.5, 1.0);
    if (!this.isAttacking) {
      this.setScale(this.baseScale);
    }

    const isKnight = this.heroClass === 'knight';
    const isRanger = this.heroClass === 'ranger';
    if (next === 'death') {
      this.play(ACTORS.HERO.death.key, true);
    } else if (isKnight) {
      this.play(ACTORS.HERO[next as AnimState].key, true);
    } else if (isRanger) {
      if (next === 'run') {
        this.play(ANIM.RANGER_RUN, true);
      } else {
        this.play(ANIM.RANGER_IDLE, true);
      }
    } else {
      if (next === 'run') {
        this.play(ANIM.WIZARD_RUN, true);
      } else {
        this.play(ANIM.WIZARD_IDLE, true);
      }
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body && BODY_CONFIG[next as AnimState]) {
      const cfg = isKnight
        ? BODY_CONFIG[next as AnimState]
        : isRanger
        ? RANGER_BODY_CONFIG[next as AnimState]
        : WIZARD_BODY_CONFIG[next as AnimState];
      body.setSize(cfg.size[0], cfg.size[1]);
      body.setOffset(cfg.offset[0], cfg.offset[1]);
    }
  }

  private updateSwordTransform(moving: boolean): void {
    if (!this.sword.visible) return;

    const dir = this.flipX ? -1 : 1;
    this.sword.setFlipX(this.flipX);
    this.sword.setDepth(DEPTH.YSORT_BASE + this.y + 17);

    if (this.heroClass === 'ranger') {
      if (!this.isAttacking) {
        this.sword.setTexture(TEXTURE.BOW);
        this.sword.setOrigin(0.5, 0.5);
        const bob = moving ? Math.sin(this.scene.time.now / 90) * 2.5 : Math.sin(this.scene.time.now / 350) * 1.0;
        this.sword.setPosition(this.x + 6 * dir, this.y - 13 + bob);
        this.sword.setAngle(0);
      }
      return;
    }

    if (this.heroClass === 'wizard') {
      if (!this.isAttacking) {
        this.sword.setTexture(TEXTURE.STAFF);
        this.sword.setOrigin(0.5, 0.85);
        const bob = moving ? Math.sin(this.scene.time.now / 90) * 3.0 : Math.sin(this.scene.time.now / 350) * 1.5;
        this.sword.setPosition(this.x + 6 * dir, this.y - 13 + bob);
        this.sword.setAngle(12 * dir);
      }
      return;
    }

    if (!this.isAttacking) {
      const bob = moving ? Math.sin(this.scene.time.now / 90) * 6 : Math.sin(this.scene.time.now / 350) * 2;
      const yBob = moving ? (Math.sin(this.scene.time.now / 90) > 0 ? 1 : 0) : 0;
      this.sword.setPosition(this.x + 6 * dir, this.y - 13 + yBob);
      this.sword.setAngle(20 * dir + bob * dir);
    } else {
      this.sword.setPosition(this.x + this.swordOffset.x, this.y + this.swordOffset.y);
      this.sword.setAngle(this.swordAngle);
    }
  }

  /** Applies a state update received from the host — used for every player
   * this client does not itself control (remote-puppet mode). */
  applyRemoteState(x: number, y: number, anim: ActorAnim, flipX: boolean, hp: number, maxHp: number, downed: boolean): void {
    this.netTargetX = x;
    this.netTargetY = y;
    this.hasNetTarget = true;
    this.hp = hp;
    this.maxHp = maxHp;
    this.setFlipX(flipX);

    if (downed && !this.dying) {
      this.dying = true;
      this.setOrigin(0.5, 1.0);
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        const cfg =
          this.heroClass === 'knight'
            ? BODY_CONFIG.death
            : this.heroClass === 'ranger'
            ? RANGER_BODY_CONFIG.death
            : WIZARD_BODY_CONFIG.death;
        body.setSize(cfg.size[0], cfg.size[1]);
        body.setOffset(cfg.offset[0], cfg.offset[1]);
      }
      this.sword.setVisible(false);
      this.play(ACTORS.HERO.death.key);
    } else if (!downed) {
      this.dying = false;
      this.sword.setVisible(true);
      const mapped: AnimState = anim === 'dead' ? 'idle' : anim;
      this.setAnimState(mapped);
    }
  }

  /** Overrides hp/downed from the host's authoritative snapshot while leaving
   * position under local prediction — used for a guest's own player. */
  applyRemoteHealth(hp: number, maxHp: number, downed: boolean): void {
    this.hp = hp;
    this.maxHp = maxHp;
    if (downed && !this.dying) this.playDeath(() => undefined);
  }

  /** Smoothly moves toward the last state received via applyRemoteState — call
   * every frame instead of update() for remote-puppet players. */
  interpolate(delta: number): void {
    if (!this.hasNetTarget) return;
    const t = Math.min(1, delta / 90);
    this.x = Phaser.Math.Linear(this.x, this.netTargetX, t);
    this.y = Phaser.Math.Linear(this.y, this.netTargetY, t);
    this.label.setPosition(this.x, this.y - 34);
    if (this.shadow) { this.shadow.setPosition(this.x, this.y + 2); }
    if (this.shadow) { this.shadow.setPosition(this.x, this.y + 2); }
    if (this.shadow) { this.shadow.setPosition(this.x, this.y + 2); }
    this.setDepth(DEPTH.YSORT_BASE + this.y + 16);
    this.updateSwordTransform(this.animController?.current === 'run');
  }

  override destroy(fromScene?: boolean): void {
    if (this.shieldRing) this.shieldRing.destroy(fromScene);
    if (this.knightShieldCont) this.knightShieldCont.destroy(fromScene);
    this.sword.destroy(fromScene);
    if (this.shadow) this.shadow.destroy(fromScene);
    this.label.destroy(fromScene);
    super.destroy(fromScene);
  }

  update(input: PlayerInput, delta: number): void {
    if (this.dying) return;

    if (this.animController) this.animController.update(delta);
    if (this.invuln > 0) this.invuln -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.specialCooldown > 0) this.specialCooldown -= delta;
    if (this.classSkillCooldown > 0) this.classSkillCooldown -= delta;
    if (this.attackLock > 0) this.attackLock -= delta;
    if (this.knockbackLock > 0) this.knockbackLock -= delta;

    // Knight Shield Bastion update
    if (this.knightShieldActive) {
      this.knightShieldTimer -= delta;
      if (this.knightShieldTimer <= 0) {
        this.destroyKnightShield(false);
      } else if (this.knightShieldCont) {
        this.knightShieldCont.setPosition(this.x, this.y - 14);
        this.knightShieldCont.setDepth(DEPTH.YSORT_BASE + this.y + 18);
      }
    }

    // Radiant Shield regeneration and visual barrier
    if ((this.items['radiant_shield'] || 0) > 0) {
      if (!this.radiantShieldActive) {
        this.radiantShieldTimer += delta;
        if (this.radiantShieldTimer >= 15000) {
          this.radiantShieldActive = true;
          this.radiantShieldTimer = 0;
          SoundFX.playPowerUp();
        }
      }
      if (this.radiantShieldActive) {
        if (!this.shieldRing || !this.shieldRing.active) {
          this.shieldRing = this.scene.add.circle(this.x, this.y - 14, 20);
          this.shieldRing.setStrokeStyle(2, 0x67e8f9, 0.85);
          this.shieldRing.setFillStyle(0x67e8f9, 0.15);
          this.shieldRing.setDepth(DEPTH.YSORT_BASE + this.y + 18);
          const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
          if (worldLayer) worldLayer.add(this.shieldRing);
        } else {
          this.shieldRing.setPosition(this.x, this.y - 14);
          this.shieldRing.setDepth(DEPTH.YSORT_BASE + this.y + 18);
          this.shieldRing.setVisible(true);
        }
      } else if (this.shieldRing) {
        this.shieldRing.setVisible(false);
      }
    } else if (this.shieldRing) {
      this.shieldRing.destroy();
      this.shieldRing = undefined;
    }

    this.setAlpha(this.invuln > 0 && Math.floor(this.invuln / 90) % 2 === 0 ? 0.4 : 1);

    const blocked = this.attackLock > 0 || this.knockbackLock > 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (!blocked) {
      if (input.left) vx -= 1;
      if (input.right) vx += 1;
      if (input.up) vy -= 1;
      if (input.down) vy += 1;
    }

    const moving = vx !== 0 || vy !== 0;
    this.isSprinting = !blocked && moving && !!input.shift;

    if (this.isSprinting && !this.wasSprinting) {
      SoundFX.playDash();
      this.spawnDustBurst();
    }
    this.wasSprinting = this.isSprinting;

    if (this.isSprinting) {
      this.sprintTrailTimer += delta;
      if (this.sprintTrailTimer >= 80) {
        this.sprintTrailTimer = 0;
        this.spawnGhostTrail();
      }
    }

    if (moving && !blocked && !this.dying && !this.isDowned) {
      this.footstepTimer += delta;
      const stepInterval = this.isSprinting ? 180 : 270;
      if (this.footstepTimer >= stepInterval) {
        this.footstepTimer = 0;
        const surface = this.detectCurrentSurface();
        SoundFX.playFootstep(surface, this.isSprinting);
      }
    } else {
      this.footstepTimer = 0;
    }

    if (moving) {
      const len = Math.hypot(vx, vy) || 1;
      body.setVelocity((vx / len) * this.moveSpeed, (vy / len) * this.moveSpeed);
    } else if (!blocked) {
      body.setVelocity(0, 0);
    }

    if (vx !== 0) this.setFlipX(vx < 0);

    this.setAnimState(moving ? 'run' : 'idle');
    this.label.setPosition(this.x, this.y - 34);
    this.setDepth(DEPTH.YSORT_BASE + this.y + 16);
    this.updateSwordTransform(moving);
  }

  private detectCurrentSurface(): SurfaceType {
    const gameScene = this.scene as unknown as { depth?: number; levelData?: { data: number[][] } };
    const depth = gameScene.depth ?? 1;
    if (depth > 1) return 'stone';

    const col = Math.floor(this.x / 32);
    const row = Math.floor(this.y / 32);
    const levelData = gameScene.levelData;
    if (levelData && levelData.data[row] && levelData.data[row][col] !== undefined) {
      const tile = levelData.data[row][col];
      if (tile === 3 || tile === 4) return 'dirt';
      if (tile === 5 || tile === 12 || tile === 13) return 'stone';
      return 'grass';
    }
    return 'grass';
  }

  private spawnGhostTrail(): void {
    if (!this.scene) return;
    const ghost = this.scene.add.sprite(this.x, this.y, this.texture.key, this.frame.name);
    ghost.setOrigin(this.originX, this.originY);
    ghost.setFlipX(this.flipX);
    ghost.setScale(this.scaleX, this.scaleY);
    ghost.setTint(this.heroClass === 'wizard' ? 0xc084fc : this.heroClass === 'ranger' ? 0x4ade80 : 0x38bdf8);
    ghost.setAlpha(0.4);
    ghost.setDepth(Math.max(0, this.depth - 1));

    const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (worldLayer) worldLayer.add(ghost);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: this.scaleX * 0.9,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  private spawnDustBurst(): void {
    if (!this.scene) return;
    for (let i=0; i<4; i++) {
      const dust = this.scene.add.rectangle(this.x + (Math.random()-0.5)*10, this.y + (Math.random()*4), 3, 3, 0xffffff, 0.6);
      this.scene.tweens.add({
        targets: dust,
        y: dust.y - 10 - Math.random()*10,
        x: dust.x + (Math.random()-0.5)*15,
        alpha: 0,
        duration: 300 + Math.random()*200,
        onComplete: () => dust.destroy()
      });
    }
  }
}
