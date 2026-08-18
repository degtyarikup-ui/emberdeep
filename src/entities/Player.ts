import Phaser from 'phaser';
import { DEPTH, FONT, PLAYER_TINTS, PLAYER_LABEL_COLORS } from '../gfx/registry';
import { ACTORS } from '../gfx/actors';
import { ActorAnim } from '../net/types';

const SPEED = 130;
const ATTACK_COOLDOWN = 380;
const ATTACK_LOCK = 140;
const KNOCKBACK_LOCK = 150;
const INVULN_DURATION = 900;
const RESPAWN_GRACE = 1400;

type AnimState = 'idle' | 'run' | 'death';
const ORIGIN_Y: Record<AnimState, number> = { idle: 0.82, run: 0.74, death: 0.82 };

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  maxHp = 3;
  hp = 3;
  readonly slot: number;
  readonly label: Phaser.GameObjects.Text;

  private invuln = 0;
  private attackCooldown = 0;
  private attackLock = 0;
  private knockbackLock = 0;
  private baseScale = 1;
  private animState: AnimState = 'idle';
  private dying = false;

  private netTargetX = 0;
  private netTargetY = 0;
  private hasNetTarget = false;

  constructor(scene: Phaser.Scene, x: number, y: number, slot = 0) {
    super(scene, x, y, ACTORS.HERO.idle.key, 0);
    this.slot = slot;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, ORIGIN_Y.idle);
    this.setPipeline('Light2D');
    this.setTint(PLAYER_TINTS[slot] ?? 0xffffff);
    this.baseScale = this.scale;
    this.play(ACTORS.HERO.idle.key);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 14);
    body.setOffset(7, 14);
    body.setCollideWorldBounds(true);
    this.setDepth(DEPTH.YSORT_BASE + y);

    this.label = scene.add
      .text(x, y - 30, `${slot + 1}`, {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: '700',
        color: PLAYER_LABEL_COLORS[slot] ?? '#f0e2b8',
      })
      .setOrigin(0.5, 1)
      .setStroke('#0d0a10', 3)
      .setVisible(false);
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
    this.setOrigin(0.5, ORIGIN_Y.death);
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
    this.setAnimState('idle');
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  /** Returns true if an attack actually fired (respects its own cooldown). */
  tryAttack(): boolean {
    if (this.attackCooldown > 0 || this.dying) return false;
    this.attackCooldown = ATTACK_COOLDOWN;
    this.attackLock = ATTACK_LOCK;

    this.scene.tweens.add({
      targets: this,
      scale: this.baseScale * 1.18,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    return true;
  }

  private setAnimState(next: AnimState): void {
    if (this.animState === next) return;
    this.animState = next;
    this.setOrigin(0.5, ORIGIN_Y[next]);
    this.play(ACTORS.HERO[next].key, true);
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
      this.setOrigin(0.5, ORIGIN_Y.death);
      this.play(ACTORS.HERO.death.key);
    } else if (!downed) {
      this.dying = false;
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
    this.label.setPosition(this.x, this.y - 30);
    this.setDepth(DEPTH.YSORT_BASE + this.y);
  }

  update(input: PlayerInput, delta: number): void {
    if (this.dying) return;

    if (this.invuln > 0) this.invuln -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
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
    if (moving) {
      const len = Math.hypot(vx, vy) || 1;
      body.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
    } else if (!blocked) {
      body.setVelocity(0, 0);
    }

    if (vx !== 0) this.setFlipX(vx < 0);

    this.setAnimState(moving ? 'run' : 'idle');
    this.label.setPosition(this.x, this.y - 30);
    this.setDepth(DEPTH.YSORT_BASE + this.y);
  }
}
