import Phaser from 'phaser';
import { DEPTH } from '../gfx/registry';
import { ACTORS, ActorClips } from '../gfx/actors';

export type EnemyKind = 'imp' | 'skeleton';

export type AIState = 'patrol' | 'alert' | 'chase' | 'windup' | 'lunge' | 'recovery' | 'backstep' | 'dead';

interface EnemyStats {
  clips: ActorClips;
  originY: { idle: number; run: number; death: number };
  maxHp: number;
  patrolSpeed: number;
  chaseSpeed: number;
  detectRadius: number;
  loseRadius: number;
  attackRange: number;
  contactDamage: number;
  scale: number;
  windupDuration: number;
  lungeDuration: number;
  recoveryDuration: number;
  lungeSpeed: number;
  canBackstep: boolean;
  canCircleStrafe: boolean;
}

const STATS: Record<EnemyKind, EnemyStats> = {
  imp: {
    clips: ACTORS.ORC,
    originY: { idle: 0.82, run: 0.74, death: 0.74 },
    maxHp: 3,
    patrolSpeed: 38,
    chaseSpeed: 82,
    detectRadius: 145,
    loseRadius: 220,
    attackRange: 42,
    contactDamage: 1,
    scale: 0.9,
    windupDuration: 240,
    lungeDuration: 180,
    recoveryDuration: 320,
    lungeSpeed: 210,
    canBackstep: false,
    canCircleStrafe: false,
  },
  skeleton: {
    clips: ACTORS.SKELETON,
    originY: { idle: 0.82, run: 0.74, death: 0.78 },
    maxHp: 5,
    patrolSpeed: 28,
    chaseSpeed: 58,
    detectRadius: 130,
    loseRadius: 195,
    attackRange: 34,
    contactDamage: 1,
    scale: 1.0,
    windupDuration: 300,
    lungeDuration: 130,
    recoveryDuration: 400,
    lungeSpeed: 140,
    canBackstep: true,
    canCircleStrafe: true,
  },
};

const CONTACT_RADIUS = 24;
const HIT_LOCK = 200;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  readonly contactDamage: number;
  readonly id: number;
  private stats: EnemyStats;

  private aiState: AIState = 'patrol';
  private hp: number;
  private hitLock = 0;

  // Timers & AI Variables
  private stateTimer = 0;
  private homeX: number;
  private homeY: number;
  private patrolTargetX: number;
  private patrolTargetY: number;
  private patrolWaitTimer = 0;
  private attackAngle = 0;
  private strafeDir = 1;
  private backstepCooldown = 0;

  // Net sync
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

    this.homeX = x;
    this.homeY = y;
    this.patrolTargetX = x;
    this.patrolTargetY = y;
    this.strafeDir = id % 2 === 0 ? 1 : -1;

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
    return this.aiState === 'dead';
  }

  get currentAnim(): 'idle' | 'run' | 'dead' {
    if (this.aiState === 'dead') return 'dead';
    const body = this.body as Phaser.Physics.Arcade.Body;
    const moving = body && body.velocity.lengthSq() > 100;
    return moving ? 'run' : 'idle';
  }

  get currentAIState(): AIState {
    return this.aiState;
  }

  get maxHp(): number {
    return this.stats.maxHp;
  }

  get currentHp(): number {
    return this.hp;
  }

  /** Returns true if this hit killed it. */
  takeDamage(amount: number, fromX: number, fromY: number): boolean {
    if (this.aiState === 'dead' || this.hitLock > 0) return false;
    this.hp -= amount;
    this.hitLock = HIT_LOCK;

    // Interrupt windup or lunge when hit
    if (this.aiState === 'windup' || this.aiState === 'lunge') {
      this.clearTint();
      this.setScale(this.stats.scale);
      this.aiState = 'chase';
    }

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.active && !this.isDead && this.clearTint());

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / len) * 170, (dy / len) * 170);

    // Alert nearby pack to chase
    this.aiState = 'chase';

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    this.aiState = 'dead';
    this.clearTint();
    this.setScale(this.stats.scale);

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
    return this.updateAI(playerX, playerY, delta, [], false);
  }

  /** Full Enhanced AI update with Flocking, State Machine, Windup, and Archetype Tactics. */
  updateAI(
    playerX: number,
    playerY: number,
    delta: number,
    otherEnemies: Enemy[] = [],
    playerAttacking = false
  ): boolean {
    if (this.aiState === 'dead') return false;

    if (this.hitLock > 0) {
      this.hitLock -= delta;
      this.setDepth(DEPTH.YSORT_BASE + this.y);
      return false;
    }

    if (this.backstepCooldown > 0) this.backstepCooldown -= delta;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distToPlayer = Math.hypot(dx, dy);
    const body = this.body as Phaser.Physics.Arcade.Body;

    let landedHit = false;

    // ==========================================
    // FSM LOGIC
    // ==========================================
    switch (this.aiState) {
      case 'patrol': {
        // Check if player is detected
        if (distToPlayer < this.stats.detectRadius) {
          this.aiState = 'alert';
          this.stateTimer = 160; // brief reaction freeze
          body.setVelocity(0, 0);
          this.setFlipX(dx < 0);
          break;
        }

        // Patrol wandering around home point
        this.patrolWaitTimer -= delta;
        if (this.patrolWaitTimer <= 0) {
          const pDist = Math.hypot(this.patrolTargetX - this.x, this.patrolTargetY - this.y);
          if (pDist < 8) {
            // Pick new waypoint near home or pause
            if (Math.random() < 0.4) {
              this.patrolWaitTimer = 1400 + Math.random() * 1600;
              body.setVelocity(0, 0);
            } else {
              const ang = Math.random() * Math.PI * 2;
              const rad = 20 + Math.random() * 35;
              this.patrolTargetX = this.homeX + Math.cos(ang) * rad;
              this.patrolTargetY = this.homeY + Math.sin(ang) * rad;
            }
          } else {
            const px = this.patrolTargetX - this.x;
            const py = this.patrolTargetY - this.y;
            const plen = Math.hypot(px, py) || 1;
            body.setVelocity((px / plen) * this.stats.patrolSpeed, (py / plen) * this.stats.patrolSpeed);
            this.setFlipX(px < 0);
          }
        }
        break;
      }

      case 'alert': {
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.aiState = 'chase';
        }
        break;
      }

      case 'chase': {
        // Lose target if too far away
        if (distToPlayer > this.stats.loseRadius) {
          this.aiState = 'patrol';
          this.patrolTargetX = this.homeX;
          this.patrolTargetY = this.homeY;
          break;
        }

        // Check if tactical backstep is needed (Skeleton vs attacking player)
        if (this.stats.canBackstep && playerAttacking && distToPlayer < 36 && this.backstepCooldown <= 0) {
          if (Math.random() < 0.55) {
            this.aiState = 'backstep';
            this.stateTimer = 160;
            this.backstepCooldown = 2200;
            const backAngle = Math.atan2(this.y - playerY, this.x - playerX);
            body.setVelocity(Math.cos(backAngle) * 140, Math.sin(backAngle) * 140);
            break;
          }
        }

        // Check if close enough to initiate Windup Attack
        if (distToPlayer <= this.stats.attackRange) {
          this.aiState = 'windup';
          this.stateTimer = this.stats.windupDuration;
          this.attackAngle = Math.atan2(dy, dx);
          body.setVelocity(0, 0);

          // Visual Telegraph: Imp crouches & flashes red; Skeleton gleams white
          if (this.kind === 'imp') {
            this.setTint(0xff4422);
            this.setScale(this.stats.scale * 1.15, this.stats.scale * 0.85);
          } else {
            this.setTint(0xe2e8f0);
          }
          break;
        }

        // --- Flocking / Separation Vector ---
        let sepX = 0;
        let sepY = 0;
        let neighborCount = 0;
        for (const other of otherEnemies) {
          if (other === this || other.isDead) continue;
          const odx = this.x - other.x;
          const ody = this.y - other.y;
          const odist = Math.hypot(odx, ody);
          if (odist < 28 && odist > 0) {
            sepX += (odx / odist) * (28 - odist);
            sepY += (ody / odist) * (28 - odist);
            neighborCount++;
          }
        }

        // --- Surrounding / Flank offset ---
        const flankOffsetAngle = ((this.id % 6) - 2.5) * 0.35; // Spread around target
        const baseAngle = Math.atan2(dy, dx) + flankOffsetAngle;

        let moveDirX = Math.cos(baseAngle);
        let moveDirY = Math.sin(baseAngle);

        // Circle strafe if Skeleton is in mid-range
        if (this.stats.canCircleStrafe && distToPlayer < 55 && distToPlayer > 30) {
          const tangentAngle = Math.atan2(dy, dx) + (Math.PI / 2) * this.strafeDir;
          moveDirX = moveDirX * 0.5 + Math.cos(tangentAngle) * 0.5;
          moveDirY = moveDirY * 0.5 + Math.sin(tangentAngle) * 0.5;
        }

        if (neighborCount > 0) {
          moveDirX += sepX * 0.08;
          moveDirY += sepY * 0.08;
        }

        const totalLen = Math.hypot(moveDirX, moveDirY) || 1;
        body.setVelocity((moveDirX / totalLen) * this.stats.chaseSpeed, (moveDirY / totalLen) * this.stats.chaseSpeed);
        this.setFlipX(dx < 0);
        break;
      }

      case 'windup': {
        this.stateTimer -= delta;
        // Keep looking at target during windup
        this.setFlipX(dx < 0);
        this.attackAngle = Math.atan2(dy, dx);

        if (this.stateTimer <= 0) {
          this.aiState = 'lunge';
          this.stateTimer = this.stats.lungeDuration;
          this.clearTint();
          this.setScale(this.stats.scale);

          // Launch forward lunge
          body.setVelocity(
            Math.cos(this.attackAngle) * this.stats.lungeSpeed,
            Math.sin(this.attackAngle) * this.stats.lungeSpeed
          );
        }
        break;
      }

      case 'lunge': {
        this.stateTimer -= delta;

        // Check if hit lands on player
        if (distToPlayer < CONTACT_RADIUS) {
          landedHit = true;
          this.aiState = 'recovery';
          this.stateTimer = this.stats.recoveryDuration;
          body.setVelocity(0, 0);
          break;
        }

        if (this.stateTimer <= 0) {
          this.aiState = 'recovery';
          this.stateTimer = this.stats.recoveryDuration;
          body.setVelocity(0, 0);
        }
        break;
      }

      case 'recovery': {
        this.stateTimer -= delta;
        body.setVelocity(0, 0);
        if (this.stateTimer <= 0) {
          this.aiState = 'chase';
        }
        break;
      }

      case 'backstep': {
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.aiState = 'chase';
          body.setVelocity(0, 0);
        }
        break;
      }
    }

    // Animation & Y-Sorting
    const moving = body.velocity.lengthSq() > 100;
    this.setAnimState(moving ? 'run' : 'idle');
    this.setDepth(DEPTH.YSORT_BASE + this.y);

    return landedHit;
  }

  private setAnimState(next: 'idle' | 'run'): void {
    if (this.aiState === 'dead') return;
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

  /** Applies a state update received from the host — used on guest clients. */
  applyRemoteState(x: number, y: number, anim: 'idle' | 'run' | 'dead', flipX: boolean): void {
    this.netTargetX = x;
    this.netTargetY = y;
    this.hasNetTarget = true;
    this.setFlipX(flipX);

    if (anim === 'dead' && this.aiState !== 'dead') {
      this.aiState = 'dead';
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      body.enable = false;
      this.setOrigin(0.5, this.stats.originY.death);
      this.play(this.stats.clips.death.key);
    } else if (anim !== 'dead') {
      this.setAnimState(anim);
    }
  }

  /** Smoothly moves toward the last state received via applyRemoteState. */
  interpolate(delta: number): void {
    if (!this.hasNetTarget || this.aiState === 'dead') return;
    const t = Math.min(1, delta / 90);
    this.x = Phaser.Math.Linear(this.x, this.netTargetX, t);
    this.y = Phaser.Math.Linear(this.y, this.netTargetY, t);
    this.setDepth(DEPTH.YSORT_BASE + this.y);
  }
}
