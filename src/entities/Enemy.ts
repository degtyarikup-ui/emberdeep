import Phaser from 'phaser';
import { DEPTH } from '../gfx/registry';
import { ACTORS, ActorClips } from '../gfx/actors';
import { TEXTURE } from '../gfx/registry';
import {
  StatusState,
  ElementType,
  checkElementalCombo,
  ComboResult,
} from '../combat/ElementalSystem';

export type EnemyKind = 'imp' | 'skeleton' | 'wolf';

export type AIState = 'patrol' | 'alert' | 'chase' | 'windup' | 'lunge' | 'recovery' | 'backstep' | 'dead';

interface EnemyStats {
  clips: ActorClips;
  originY: { idle: number; run: number; death: number };
  bodySize: { idle: [number, number]; run: [number, number] };
  bodyOffset: { idle: [number, number]; run: [number, number] };
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
    bodySize: { idle: [16, 14], run: [18, 14] },
    bodyOffset: { idle: [8, 18], run: [23, 50] },
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
    bodySize: { idle: [16, 18], run: [18, 18] },
    bodyOffset: { idle: [8, 14], run: [23, 46] },
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
  wolf: {
    clips: ACTORS.WOLF,
    originY: { idle: 0.85, run: 0.80, death: 0.85 },
    bodySize: { idle: [28, 20], run: [32, 22] },
    bodyOffset: { idle: [2, 12], run: [16, 38] },
    maxHp: 3,
    patrolSpeed: 55,
    chaseSpeed: 115,
    detectRadius: 180,
    loseRadius: 260,
    attackRange: 42,
    contactDamage: 1,
    scale: 1.05,
    windupDuration: 160,
    lungeDuration: 160,
    recoveryDuration: 220,
    lungeSpeed: 260,
    canBackstep: true,
    canCircleStrafe: false,
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
  private shadow!: Phaser.GameObjects.Sprite;

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

  public statusState: StatusState = {
    burningDuration: 0,
    burningDps: 0,
    slowDuration: 0,
    slowFactor: 1,
    frozenDuration: 0,
    poisonDuration: 0,
    poisonDps: 0,
    shockDuration: 0,
  };
  private burnTickTimer = 0;
  private poisonTickTimer = 0;

  public applyElement(element: ElementType, duration = 3000, power = 1): ComboResult | null {
    if (this.aiState === 'dead') return null;
    const combo = checkElementalCombo(element, this.statusState);
    if (combo) {
      this.takeDamage(combo.bonusDamage, this.x, this.y);
      return combo;
    }

    switch (element) {
      case 'fire':
        this.statusState.burningDuration = Math.max(this.statusState.burningDuration, duration);
        this.statusState.burningDps = 2 * power;
        break;
      case 'frost':
        this.statusState.slowDuration = Math.max(this.statusState.slowDuration, duration);
        this.statusState.slowFactor = 0.55;
        if (power > 1.5) {
          this.statusState.frozenDuration = Math.max(this.statusState.frozenDuration, 1500);
        }
        break;
      case 'lightning':
        this.statusState.shockDuration = Math.max(this.statusState.shockDuration, duration);
        break;
      case 'poison':
        this.statusState.poisonDuration = Math.max(this.statusState.poisonDuration, duration);
        this.statusState.poisonDps = 1.5 * power;
        break;
    }
    return null;
  }

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
    const [w, h] = stats.bodySize.idle;
    const [ox, oy] = stats.bodyOffset.idle;
    body.setSize(w, h);
    body.setOffset(ox, oy);
    this.setDepth(DEPTH.YSORT_BASE + y);
    this.shadow = scene.add.sprite(x, y + 2, TEXTURE.SHADOW).setAlpha(0.35).setDepth(DEPTH.SHADOW);
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

  /** Check if this enemy currently has an active elemental status. */
  hasStatus(element: ElementType): boolean {
    switch (element) {
      case 'fire': return this.statusState.burningDuration > 0;
      case 'frost': return this.statusState.slowDuration > 0 || this.statusState.frozenDuration > 0;
      case 'lightning': return this.statusState.shockDuration > 0;
      case 'poison': return this.statusState.poisonDuration > 0;
      default: return false;
    }
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
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 200, onComplete: () => {
        // spawn blood/bone explosion
        for(let i=0; i<5; i++) {
            const part = this.scene.add.rectangle(this.x, this.y - 10, 3, 3, this.kind === 'imp' ? 0xcc0000 : 0xdddddd);
            this.scene.tweens.add({
                targets: part,
                x: this.x + (Math.random()-0.5)*30,
                y: this.y - 10 + (Math.random()-0.5)*30,
                alpha: 0,
                duration: 400,
                onComplete: () => part.destroy()
            });
        }
        if (this.shadow) this.shadow.destroy();
        this.destroy(); 
      } });
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
      if (this.shadow) this.shadow.setPosition(this.x, this.y + 2);
      return false;
    }

    // Process Status Effects (Burning, Poison, Frost, Shock)
    if (this.statusState.burningDuration > 0) {
      this.statusState.burningDuration -= delta;
      this.burnTickTimer += delta;
      if (this.burnTickTimer >= 600) {
        this.burnTickTimer = 0;
        this.takeDamage(1, this.x, this.y);
        if (this.hp <= 0) return false;
      }
    }
    if (this.statusState.poisonDuration > 0) {
      this.statusState.poisonDuration -= delta;
      this.poisonTickTimer += delta;
      if (this.poisonTickTimer >= 750) {
        this.poisonTickTimer = 0;
        this.takeDamage(1, this.x, this.y);
        if (this.hp <= 0) return false;
      }
    }
    if (this.statusState.frozenDuration > 0) {
      this.statusState.frozenDuration -= delta;
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) body.setVelocity(0, 0);
      this.setTint(0x38bdf8);
      return false;
    }
    if (this.statusState.slowDuration > 0) {
      this.statusState.slowDuration -= delta;
      this.setTint(0xa5f3fc);
    } else if (this.statusState.burningDuration > 0) {
      this.setTint(0xf97316);
    } else if (this.statusState.poisonDuration > 0) {
      this.setTint(0x22c55e);
    } else if (this.statusState.shockDuration > 0) {
      this.statusState.shockDuration -= delta;
      this.setTint(0xfacc15);
    } else {
      if (this.hitLock <= 0 && this.aiState !== 'windup') {
        this.clearTint();
      }
    }

    if (this.backstepCooldown > 0) this.backstepCooldown -= delta;

    const speedMult = this.statusState.slowDuration > 0 ? this.statusState.slowFactor : 1.0;
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
        // sway
        if (body.velocity.lengthSq() > 10) {
            this.angle = Math.sin(this.scene.time.now / 150) * 2;
        } else {
            this.angle = 0;
        }
        // Check if player is detected
        if (distToPlayer < this.stats.detectRadius) {
          this.aiState = 'alert';
          const alertText = this.scene.add.text(this.x, this.y - 30, '!', { font: 'bold 16px Arial', color: '#ff0000' }).setOrigin(0.5);
          this.scene.tweens.add({ targets: alertText, y: this.y - 45, alpha: 0, duration: 600, onComplete: () => alertText.destroy() });
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
            body.setVelocity((px / plen) * this.stats.patrolSpeed * speedMult, (py / plen) * this.stats.patrolSpeed * speedMult);
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
            body.setVelocity(Math.cos(backAngle) * 140 * speedMult, Math.sin(backAngle) * 140 * speedMult);
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
            this.setTint(0xff3333);
            this.setScale(this.stats.scale * 1.15, this.stats.scale * 0.85);
          } else {
            this.setTint(0xffffff);
            this.setScale(this.stats.scale * 0.9, this.stats.scale * 1.15);
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
        body.setVelocity((moveDirX / totalLen) * this.stats.chaseSpeed * speedMult, (moveDirY / totalLen) * this.stats.chaseSpeed * speedMult);
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
        if (this.stateTimer === this.stats.lungeDuration) {
           // just started lunge
           const dust = this.scene.add.circle(this.x, this.y, 4, 0xaaaaaa, 0.5);
           this.scene.tweens.add({ targets: dust, scale: 2, alpha: 0, duration: 300, onComplete: () => dust.destroy() });
           const trail = this.scene.add.sprite(this.x, this.y, this.texture.key, this.frame.name).setAlpha(0.4).setTint(0xff0000);
           this.scene.tweens.add({ targets: trail, alpha: 0, duration: 200, onComplete: () => trail.destroy() });
        }
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

    if (this.shadow) this.shadow.setPosition(this.x, this.y + 2);
    return landedHit;
  }

  private setAnimState(next: 'idle' | 'run'): void {
    if (this.aiState === 'dead') return;
    this.setOrigin(0.5, 1.0);
    this.play(this.stats.clips[next].key, true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      const [w, h] = this.stats.bodySize[next];
      const [ox, oy] = this.stats.bodyOffset[next];
      body.setSize(w, h);
      body.setOffset(ox, oy);
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
