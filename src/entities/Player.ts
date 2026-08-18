import Phaser from 'phaser';
import { DEPTH, FONT, PLAYER_TINTS, PLAYER_LABEL_COLORS, TEXTURE, ANIM } from '../gfx/registry';
import { ACTORS } from '../gfx/actors';
import { ActorAnim } from '../net/types';
import { SoundFX } from '../audio/SoundFX';
import { ArrowProjectile } from './ArrowProjectile';
import { MetaManager } from '../meta/MetaManager';

const KNIGHT_SPEED = 130;
const RANGER_SPEED = 145;
const ATTACK_COOLDOWN = 380;
const ATTACK_LOCK = 140;
const KNOCKBACK_LOCK = 150;
const INVULN_DURATION = 900;
const RESPAWN_GRACE = 1400;

export type HeroClass = 'knight' | 'ranger';

type AnimState = 'idle' | 'run' | 'death';

const BODY_CONFIG: Record<AnimState, { size: [number, number]; offset: [number, number] }> = {
  idle: { size: [16, 12], offset: [8, 20] }, // 32x32 frame -> feet at bottom (16, 32)
  run: { size: [16, 12], offset: [24, 52] }, // 64x64 frame -> feet at bottom (32, 64)
  death: { size: [16, 12], offset: [8, 20] }, // 32x32 frame
};

const RANGER_BODY_CONFIG: Record<AnimState, { size: [number, number]; offset: [number, number] }> = {
  idle: { size: [14, 10], offset: [1, 18] }, // 16x28 frame
  run: { size: [14, 10], offset: [1, 18] },
  death: { size: [14, 10], offset: [1, 18] },
};

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shift?: boolean;
}

export interface SpecialResult {
  kind: 'whirlwind' | 'volley';
  x: number;
  y: number;
  radius?: number;
  damage?: number;
  projectiles?: ArrowProjectile[];
}

export interface AttackResult {
  kind: 'melee' | 'arrow';
  projectile?: ArrowProjectile;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  heroClass: HeroClass = 'knight';
  maxHp = 3;
  hp = 3;
  gold = 0;
  items: Record<string, number> = {};
  isSprinting = false;
  specialCooldown = 0;
  specialMaxCooldown = 4000;
  readonly slot: number;
  readonly label: Phaser.GameObjects.Text;
  readonly sword: Phaser.GameObjects.Sprite;

  private invuln = 0;
  private attackCooldown = 0;
  private attackLock = 0;
  private knockbackLock = 0;
  private baseScale = 1;
  private animState: AnimState = 'idle';
  private dying = false;
  private isAttacking = false;
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
    const initTex = isKnight ? ACTORS.HERO.idle.key : TEXTURE.RANGER_IDLE;
    super(scene, x, y, initTex, 0);

    this.slot = slot;
    this.heroClass = heroClass;
    this.specialMaxCooldown = isKnight ? 4000 : 3200;

    const bonuses = MetaManager.get().getBonuses();

    if (initialHealth?.maxHp !== undefined) {
      this.maxHp = initialHealth.maxHp;
    } else {
      this.maxHp = (isKnight ? 3 : 2) + bonuses.extraHp;
    }

    if (initialHealth?.hp !== undefined) {
      this.hp = initialHealth.hp;
    } else {
      this.hp = this.maxHp;
    }

    this.gold = bonuses.startGold;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1.0);
    this.setPipeline('Light2D');
    this.setTint(PLAYER_TINTS[slot] ?? 0xffffff);
    this.baseScale = isKnight ? 1.0 : 1.1;
    this.setScale(this.baseScale);

    if (isKnight) {
      this.play(ACTORS.HERO.idle.key);
    } else {
      this.play(ANIM.RANGER_IDLE);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const bodyCfg = isKnight ? BODY_CONFIG.idle : RANGER_BODY_CONFIG.idle;
    body.setSize(bodyCfg.size[0], bodyCfg.size[1]);
    body.setOffset(bodyCfg.offset[0], bodyCfg.offset[1]);
    body.setCollideWorldBounds(true);
    this.setDepth(DEPTH.YSORT_BASE + y);

    // Weapon sprite: Sword for Knight, Bow for Ranger
    const weaponTex = isKnight ? TEXTURE.WEAPON_SWORD : TEXTURE.BOW;
    this.sword = scene.add.sprite(x + 6, y - 13, weaponTex);
    this.sword.setOrigin(isKnight ? 0.5 : 0.4, isKnight ? 0.88 : 0.5);
    this.sword.setPipeline('Light2D');
    this.sword.setDepth(DEPTH.YSORT_BASE + y + 1);
    this.sword.setScale(isKnight ? 1.05 : 1.0);

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

  get moveSpeed(): number {
    const metaSpeed = MetaManager.get().getBonuses().speedMultiplier;
    const baseSpeed = (this.heroClass === 'knight' ? KNIGHT_SPEED : RANGER_SPEED) * metaSpeed;
    const base = baseSpeed * (1 + (this.items['boots'] || 0) * 0.15);
    return this.isSprinting ? base * 1.55 : base;
  }

  get attackDamage(): number {
    const metaDmg = MetaManager.get().getBonuses().damageMultiplier;
    return (1 + (this.items['whetstone'] || 0) * 0.25) * metaDmg;
  }

  get critChance(): number {
    const metaCrit = MetaManager.get().getBonuses().extraCrit;
    return (this.items['crit_dagger'] || 0) * 0.15 + metaCrit;
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

  addItem(itemId: string): void {
    this.items[itemId] = (this.items[itemId] || 0) + 1;
  }

  addGold(amount: number): void {
    this.gold += amount;
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
    return this.animState;
  }

  setLabelVisible(visible: boolean): void {
    this.label.setVisible(visible);
  }

  /** Returns true if damage was actually applied (false while invulnerable). */
  takeDamage(amount: number, fromX: number, fromY: number): boolean {
    if (this.invuln > 0 || this.dying) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invuln = INVULN_DURATION;
    this.knockbackLock = KNOCKBACK_LOCK;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / len) * 150, (dy / len) * 150);

    return true;
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
    this.animState = 'death';
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
    this.attackCooldown = ATTACK_COOLDOWN;
    this.attackLock = ATTACK_LOCK;

    if (this.heroClass === 'ranger') {
      SoundFX.playArrowShoot();
      const dir = this.flipX ? -1 : 1;
      let angle = dir < 0 ? Math.PI : 0;
      if (targetX !== undefined && targetY !== undefined) {
        angle = Phaser.Math.Angle.Between(this.x, this.y - 12, targetX, targetY);
      }
      const arrow = new ArrowProjectile(
        this.scene,
        this.x + 8 * dir,
        this.y - 12,
        angle,
        Math.max(1, Math.round(this.attackDamage * 1.3)),
        1,
        340
      );
      this.playRangerShootAnimation();
      return { kind: 'arrow', projectile: arrow };
    } else {
      this.playAttackAnimation();
      return { kind: 'melee' };
    }
  }

  /** Triggers special ability (Knight Whirlwind or Ranger Arrow Volley). */
  trySpecial(targetX?: number, targetY?: number): SpecialResult | null {
    if (this.specialCooldown > 0 || this.dying) return null;
    this.specialCooldown = this.specialMaxCooldown;

    if (this.heroClass === 'ranger') {
      SoundFX.playArrowShoot();
      const dir = this.flipX ? -1 : 1;
      let baseAngle = dir < 0 ? Math.PI : 0;
      if (targetX !== undefined && targetY !== undefined) {
        baseAngle = Phaser.Math.Angle.Between(this.x, this.y - 12, targetX, targetY);
      }

      const projectiles: ArrowProjectile[] = [];
      const spread = 0.5; // ~28 degrees fan
      const count = 5;
      for (let i = 0; i < count; i++) {
        const offset = ((i - (count - 1) / 2) / (count - 1)) * spread;
        const angle = baseAngle + offset;
        const arrow = new ArrowProjectile(
          this.scene,
          this.x + 8 * dir,
          this.y - 12,
          angle,
          Math.max(1, Math.round(this.attackDamage * 1.5)),
          2, // pierce 2 targets
          350
        );
        projectiles.push(arrow);
      }
      this.playRangerShootAnimation();
      return { kind: 'volley', x: this.x, y: this.y, projectiles };
    } else {
      SoundFX.playWhirlwind();
      this.playWhirlwindAnimation();
      return {
        kind: 'whirlwind',
        x: this.x,
        y: this.y,
        radius: 65,
        damage: Math.max(2, Math.round(this.attackDamage * 2.5)),
      };
    }
  }

  private playWhirlwindAnimation(): void {
    const ring = this.scene.add.sprite(this.x, this.y - 12, TEXTURE.SLASH_WHIRLWIND);
    ring.setOrigin(0.5, 0.5);
    ring.setScale(0.8);
    ring.setDepth(DEPTH.YSORT_BASE + this.y + 10);
    ring.setPipeline('Light2D');
    ring.setTint(0x67e8f9);

    const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (worldLayer) worldLayer.add(ring);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.2,
      scaleY: 2.2,
      angle: 360,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * 1.3,
      scaleY: this.baseScale * 0.85,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private playRangerShootAnimation(): void {
    const dir = this.flipX ? -1 : 1;
    this.scene.tweens.add({
      targets: this.sword,
      x: this.x + 2 * dir,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Triggers the sword swing, slash arc FX, body lunge, and audio. */
  playAttackAnimation(): void {
    this.isAttacking = true;
    const dir = this.flipX ? -1 : 1;

    SoundFX.playSwordSwing();

    // Body squash/lunge tween
    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * 1.25,
      scaleY: this.baseScale * 0.88,
      duration: 75,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Slash Arc Visual Effect
    const slash = this.scene.add.sprite(this.x + 18 * dir, this.y - 14, TEXTURE.SLASH_FX);
    slash.setOrigin(0.35, 0.5);
    slash.setFlipX(this.flipX);
    slash.setDepth(DEPTH.YSORT_BASE + this.y + 4);
    slash.setPipeline('Light2D');
    slash.setScale(0.7);
    slash.setAlpha(0.95);
    slash.setAngle(dir * -15);

    const worldLayer = (this.scene as unknown as { worldLayer?: Phaser.GameObjects.Layer }).worldLayer;
    if (worldLayer) worldLayer.add(slash);

    this.scene.tweens.add({
      targets: slash,
      scaleX: 1.35,
      scaleY: 1.35,
      angle: dir * 35,
      alpha: 0,
      duration: 130,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });

    // Sword dynamic swing tween: windup -> fast slash -> ease back
    const startAngle = -65 * dir;
    const slashAngle = 95 * dir;
    const restAngle = 20 * dir;

    this.swordOffset.x = 4 * dir;
    this.swordOffset.y = -16;
    this.swordAngle = startAngle;

    this.scene.tweens.add({
      targets: this.swordOffset,
      x: 12 * dir,
      y: -10,
      duration: 85,
      ease: 'Cubic.easeOut',
    });

    this.scene.tweens.add({
      targets: this,
      swordAngle: slashAngle,
      duration: 85,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.swordOffset,
          x: 6 * dir,
          y: -13,
          duration: 110,
          ease: 'Sine.easeInOut',
        });
        this.scene.tweens.add({
          targets: this,
          swordAngle: restAngle,
          duration: 110,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.isAttacking = false;
          },
        });
      },
    });
  }

  private setAnimState(next: AnimState): void {
    if (this.animState === next) return;
    this.animState = next;
    this.setOrigin(0.5, 1.0);

    const isKnight = this.heroClass === 'knight';
    if (isKnight) {
      this.play(ACTORS.HERO[next].key, true);
    } else {
      if (next === 'run') {
        this.play(ANIM.RANGER_RUN, true);
      } else {
        this.play(ANIM.RANGER_IDLE, true);
      }
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      const cfg = isKnight ? BODY_CONFIG[next] : RANGER_BODY_CONFIG[next];
      body.setSize(cfg.size[0], cfg.size[1]);
      body.setOffset(cfg.offset[0], cfg.offset[1]);
    }
  }

  private updateSwordTransform(moving: boolean): void {
    if (!this.sword.visible) return;

    const dir = this.flipX ? -1 : 1;
    this.sword.setFlipX(this.flipX);
    this.sword.setDepth(DEPTH.YSORT_BASE + this.y + 1);

    if (this.heroClass === 'ranger') {
      const bob = moving ? Math.sin(this.scene.time.now / 90) * 3 : 0;
      this.sword.setPosition(this.x + 6 * dir, this.y - 12 + bob);
      this.sword.setAngle(0);
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
        const cfg = this.heroClass === 'knight' ? BODY_CONFIG.death : RANGER_BODY_CONFIG.death;
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
    this.setDepth(DEPTH.YSORT_BASE + this.y);
    this.updateSwordTransform(this.animState === 'run');
  }

  override destroy(fromScene?: boolean): void {
    this.sword.destroy(fromScene);
    this.label.destroy(fromScene);
    super.destroy(fromScene);
  }

  update(input: PlayerInput, delta: number): void {
    if (this.dying) return;

    if (this.invuln > 0) this.invuln -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.specialCooldown > 0) this.specialCooldown -= delta;
    if (this.attackLock > 0) this.attackLock -= delta;
    if (this.knockbackLock > 0) this.knockbackLock -= delta;

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
    }
    this.wasSprinting = this.isSprinting;

    if (this.isSprinting) {
      this.sprintTrailTimer += delta;
      if (this.sprintTrailTimer >= 80) {
        this.sprintTrailTimer = 0;
        this.spawnGhostTrail();
      }
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
    this.setDepth(DEPTH.YSORT_BASE + this.y);
    this.updateSwordTransform(moving);
  }

  private spawnGhostTrail(): void {
    if (!this.scene) return;
    const ghost = this.scene.add.sprite(this.x, this.y, this.texture.key, this.frame.name);
    ghost.setOrigin(this.originX, this.originY);
    ghost.setFlipX(this.flipX);
    ghost.setScale(this.scaleX, this.scaleY);
    ghost.setTint(this.heroClass === 'ranger' ? 0x4ade80 : 0x38bdf8);
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
}
