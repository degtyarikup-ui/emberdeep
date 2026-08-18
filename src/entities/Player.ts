import Phaser from 'phaser';
import { DEPTH, FONT, PLAYER_TINTS, PLAYER_LABEL_COLORS, TEXTURE } from '../gfx/registry';
import { ACTORS } from '../gfx/actors';
import { ActorAnim } from '../net/types';
import { SoundFX } from '../audio/SoundFX';

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
  readonly sword: Phaser.GameObjects.Sprite;

  private invuln = 0;
  private attackCooldown = 0;
  private attackLock = 0;
  private knockbackLock = 0;
  private baseScale = 1;
  private animState: AnimState = 'idle';
  private dying = false;
  private isAttacking = false;
  private swordOffset = { x: 6, y: -9 };
  private swordAngle = 20;

  private netTargetX = 0;
  private netTargetY = 0;
  private hasNetTarget = false;

  constructor(scene: Phaser.Scene, x: number, y: number, slot = 0, initialHealth?: { hp?: number; maxHp?: number }) {
    super(scene, x, y, ACTORS.HERO.idle.key, 0);
    this.slot = slot;
    if (initialHealth?.maxHp !== undefined) this.maxHp = initialHealth.maxHp;
    if (initialHealth?.hp !== undefined) this.hp = initialHealth.hp;
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

    // Sword weapon sprite
    this.sword = scene.add.sprite(x + 6, y - 9, TEXTURE.WEAPON_SWORD);
    this.sword.setOrigin(0.5, 0.88);
    this.sword.setPipeline('Light2D');
    this.sword.setDepth(DEPTH.YSORT_BASE + y + 1);
    this.sword.setScale(1.05);

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

  /** Returns true if an attack actually fired (respects its own cooldown). */
  tryAttack(): boolean {
    if (this.attackCooldown > 0 || this.dying) return false;
    this.attackCooldown = ATTACK_COOLDOWN;
    this.attackLock = ATTACK_LOCK;

    this.playAttackAnimation();
    return true;
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
    const slash = this.scene.add.sprite(this.x + 18 * dir, this.y - 12, TEXTURE.SLASH_FX);
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
    this.swordOffset.y = -12;
    this.swordAngle = startAngle;

    this.scene.tweens.add({
      targets: this.swordOffset,
      x: 12 * dir,
      y: -6,
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
          y: -9,
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
    this.setOrigin(0.5, ORIGIN_Y[next]);
    this.play(ACTORS.HERO[next].key, true);
  }

  private updateSwordTransform(moving: boolean): void {
    if (!this.sword.visible) return;

    const dir = this.flipX ? -1 : 1;
    this.sword.setFlipX(this.flipX);
    this.sword.setDepth(DEPTH.YSORT_BASE + this.y + 1);

    if (!this.isAttacking) {
      const bob = moving ? Math.sin(this.scene.time.now / 90) * 6 : Math.sin(this.scene.time.now / 350) * 2;
      const yBob = moving ? (Math.sin(this.scene.time.now / 90) > 0 ? 1 : 0) : 0;
      this.sword.setPosition(this.x + 6 * dir, this.y - 9 + yBob);
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
      this.setOrigin(0.5, ORIGIN_Y.death);
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
    this.label.setPosition(this.x, this.y - 30);
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
      if (input.down) vy -= 1;
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
    this.updateSwordTransform(moving);
  }
}
