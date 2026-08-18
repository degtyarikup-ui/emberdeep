import Phaser from 'phaser';
import { DEPTH } from '../gfx/registry';
import { ACTORS, ActorClips } from '../gfx/actors';

export type EnemyKind = 'imp' | 'skeleton';

interface EnemyStats {
  clips: ActorClips;
  originY: { idle: number; run: number; death: number };
  maxHp: number;
  chaseSpeed: number;
  detectRadius: number;
  loseRadius: number;
  contactDamage: number;
  scale: number;
}

// "imp" keeps its old id for level-data compatibility but now renders as
// Pixel Crawler's orc — a fast, weak, common chaser.
const STATS: Record<EnemyKind, EnemyStats> = {
  imp: {
    clips: ACTORS.ORC,
    originY: { idle: 0.82, run: 0.74, death: 0.74 },
    maxHp: 2,
    chaseSpeed: 78,
    detectRadius: 130,
    loseRadius: 190,
    contactDamage: 1,
    scale: 0.9,
  },
  skeleton: {
    clips: ACTORS.SKELETON,
    originY: { idle: 0.82, run: 0.74, death: 0.78 },
    maxHp: 4,
    chaseSpeed: 56,
    detectRadius: 115,
    loseRadius: 170,
    contactDamage: 1,
    scale: 1,
  },
};

const CONTACT_RADIUS = 20;
const CONTACT_COOLDOWN = 900;
const HIT_LOCK = 220;

type AnimState = 'idle' | 'run' | 'dead';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  readonly contactDamage: number;
  readonly id: number;
  private stats: EnemyStats;
  private animState: AnimState = 'idle';
  private hp: number;
  private hitCooldown = 0;
  private hitLock = 0;

  private netTargetX = 0;
  private netTargetY = 0;
  private hasNetTarget = false;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind = 'imp', id = 0) {
    const stats = STATS[kind];
    super(scene, x, y, stats.clips.idle.key, 0);
    this.kind = kind;
    this.id = id;
    this.stats = stats;
    this.hp = stats.maxHp;
    this.contactDamage = stats.contactDamage;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setPipeline('Light2D');
    this.setOrigin(0.5, 1.0);
    this.setScale(stats.scale);
    this.play(stats.clips.idle.key);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 12);
    body.setOffset(8, 20);
    this.setDepth(DEPTH.YSORT_BASE + y);
  }

  get isDead(): boolean {
    return this.animState === 'dead';
  }

  get currentAnim(): AnimState {
    return this.animState;
  }

  get maxHp(): number {
    return this.stats.maxHp;
  }

  get currentHp(): number {
    return this.hp;
  }

  /** Returns true if this hit killed it. */
  takeDamage(amount: number, fromX: number, fromY: number): boolean {
    if (this.animState === 'dead' || this.hitLock > 0) return false;
    this.hp -= amount;
    this.hitLock = HIT_LOCK;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.active && this.clearTint());

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / len) * 170, (dy / len) * 170);

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    this.animState = 'dead';
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.setOrigin(0.5, 1.0);
    this.play(this.stats.clips.death.key);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 200, onComplete: () => this.destroy() });
    });
  }

  /** Advances AI and returns whether it just landed a contact hit on the player this frame. */
  update(playerX: number, playerY: number, delta: number): boolean {
    if (this.animState === 'dead') return false;
    if (this.hitLock > 0) this.hitLock -= delta;
    if (this.hitCooldown > 0) this.hitCooldown -= delta;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);
    const body = this.body as Phaser.Physics.Arcade.Body;
    let moving = false;

    if (this.hitLock <= 0) {
      let state: 'idle' | 'chase' = this.animState === 'run' ? 'chase' : 'idle';
      if (state === 'idle' && dist < this.stats.detectRadius) state = 'chase';
      else if (state === 'chase' && dist > this.stats.loseRadius) state = 'idle';

      if (state === 'chase' && dist > 2) {
        body.setVelocity((dx / dist) * this.stats.chaseSpeed, (dy / dist) * this.stats.chaseSpeed);
        this.setFlipX(dx < 0);
        moving = true;
      } else if (state === 'idle') {
        body.setVelocity(0, 0);
      }
    } else {
      moving = true; // keep running anim while flashed/knocked back
    }

    this.setAnimState(moving ? 'run' : 'idle');
    this.setDepth(DEPTH.YSORT_BASE + this.y);

    const landedHit = this.hitCooldown <= 0 && dist < CONTACT_RADIUS;
    if (landedHit) this.hitCooldown = CONTACT_COOLDOWN;
    return landedHit;
  }

  private setAnimState(next: 'idle' | 'run'): void {
    if (this.animState === next) return;
    this.animState = next;
    this.setOrigin(0.5, 1.0);
    this.play(this.stats.clips[next].key, true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      if (next === 'run') {
        body.setSize(16, 12);
        body.setOffset(24, 52);
      } else {
        body.setSize(16, 12);
        body.setOffset(8, 20);
      }
    }
  }

  /** Applies a state update received from the host — used on guest clients,
   * which render enemies as puppets instead of running their own AI. */
  applyRemoteState(x: number, y: number, anim: 'idle' | 'run' | 'dead', flipX: boolean): void {
    this.netTargetX = x;
    this.netTargetY = y;
    this.hasNetTarget = true;
    this.setFlipX(flipX);

    if (anim === 'dead' && this.animState !== 'dead') {
      this.animState = 'dead';
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      body.enable = false;
      this.setOrigin(0.5, this.stats.originY.death);
      this.play(this.stats.clips.death.key);
    } else if (anim !== 'dead') {
      this.setAnimState(anim);
    }
  }

  /** Smoothly moves toward the last state received via applyRemoteState —
   * call every frame instead of update() for remote-puppet enemies. */
  interpolate(delta: number): void {
    if (!this.hasNetTarget || this.animState === 'dead') return;
    const t = Math.min(1, delta / 90);
    this.x = Phaser.Math.Linear(this.x, this.netTargetX, t);
    this.y = Phaser.Math.Linear(this.y, this.netTargetY, t);
    this.setDepth(DEPTH.YSORT_BASE + this.y);
  }
}
