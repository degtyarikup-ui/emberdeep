import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { ACTORS, ActorClips } from '../gfx/actors';
import { SoundFX } from '../audio/SoundFX';
import {
  StatusState,
  ElementType,
  checkElementalCombo,
  ComboResult,
} from '../combat/ElementalSystem';

export type EnemyKind = 'imp' | 'skeleton' | 'wolf' | 'orc_shield' | 'orc_archer' | 'direwolf';

export type AIState = 'patrol' | 'alert' | 'chase' | 'windup' | 'lunge' | 'special_windup' | 'recovery' | 'backstep' | 'dead';

export interface EnemyActionOutput {
  landedHit: boolean;
  damage: number;
  projectile?: { x: number; y: number; targetX: number; targetY: number; damage: number; isArrow?: boolean };
  howl?: boolean;
  minionSpawns?: { x: number; y: number; kind: EnemyKind }[];
}

export const COMBAT_AGGRO_DURATION = 6000;
export const SOCIAL_AGGRO_DURATION = 5000;
export const PACK_ALERT_RADIUS = 180;
export const NORMAL_ALERT_RADIUS = 140;
export const COMBAT_LOSE_RADIUS = 600;

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
    maxHp: 5,
    patrolSpeed: 40,
    chaseSpeed: 86,
    detectRadius: 160,
    loseRadius: 230,
    attackRange: 42,
    contactDamage: 1,
    scale: 0.9,
    windupDuration: 240,
    lungeDuration: 180,
    recoveryDuration: 300,
    lungeSpeed: 210,
    canBackstep: false,
    canCircleStrafe: false,
  },
  skeleton: {
    clips: ACTORS.SKELETON,
    originY: { idle: 0.82, run: 0.74, death: 0.78 },
    bodySize: { idle: [16, 18], run: [18, 18] },
    bodyOffset: { idle: [8, 14], run: [23, 46] },
    maxHp: 8,
    patrolSpeed: 30,
    chaseSpeed: 62,
    detectRadius: 140,
    loseRadius: 210,
    attackRange: 38,
    contactDamage: 1,
    scale: 1.0,
    windupDuration: 280,
    lungeDuration: 140,
    recoveryDuration: 360,
    lungeSpeed: 150,
    canBackstep: true,
    canCircleStrafe: true,
  },
  wolf: {
    clips: ACTORS.WOLF,
    originY: { idle: 0.95, run: 0.90, death: 0.85 },
    bodySize: { idle: [28, 20], run: [32, 22] },
    bodyOffset: { idle: [2, 11], run: [16, 38] },
    maxHp: 5,
    patrolSpeed: 55,
    chaseSpeed: 120,
    detectRadius: 180,
    loseRadius: 260,
    attackRange: 42,
    contactDamage: 1,
    scale: 1.05,
    windupDuration: 150,
    lungeDuration: 160,
    recoveryDuration: 200,
    lungeSpeed: 270,
    canBackstep: true,
    canCircleStrafe: false,
  },
  orc_shield: {
    clips: ACTORS.ORC_WARRIOR,
    originY: { idle: 0.82, run: 0.74, death: 0.74 },
    bodySize: { idle: [20, 22], run: [20, 22] },
    bodyOffset: { idle: [2, 4], run: [2, 4] },
    maxHp: 20,
    patrolSpeed: 70,
    chaseSpeed: 130,
    detectRadius: 260,
    loseRadius: 380,
    attackRange: 54,
    contactDamage: 1,
    scale: 1.5,
    windupDuration: 220,
    lungeDuration: 180,
    recoveryDuration: 180,
    lungeSpeed: 290,
    canBackstep: false,
    canCircleStrafe: false,
  },
  orc_archer: {
    clips: ACTORS.MASKED_ORC,
    originY: { idle: 0.82, run: 0.74, death: 0.74 },
    bodySize: { idle: [20, 22], run: [20, 22] },
    bodyOffset: { idle: [2, 4], run: [2, 4] },
    maxHp: 15,
    patrolSpeed: 40,
    chaseSpeed: 78,
    detectRadius: 260,
    loseRadius: 360,
    attackRange: 180,
    contactDamage: 1,
    scale: 1.5,
    windupDuration: 360,
    lungeDuration: 100,
    recoveryDuration: 550,
    lungeSpeed: 0,
    canBackstep: true,
    canCircleStrafe: true,
  },
  direwolf: {
    clips: ACTORS.DIREWOLF,
    originY: { idle: 0.95, run: 0.90, death: 0.85 },
    bodySize: { idle: [28, 20], run: [32, 22] },
    bodyOffset: { idle: [2, 11], run: [16, 38] },
    maxHp: 10,
    patrolSpeed: 65,
    chaseSpeed: 130,
    detectRadius: 220,
    loseRadius: 320,
    attackRange: 48,
    contactDamage: 1,
    scale: 1.35,
    windupDuration: 140,
    lungeDuration: 180,
    recoveryDuration: 180,
    lungeSpeed: 280,
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
  private aggroTimer = 0;
  private specialCooldown = 1500 + Math.random() * 2500;
  public howlBuffTimer = 0;
  private wolfRespawnTimer = 10000;
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
    this.patrolWaitTimer = (id % 5) * 250 + Math.random() * 500;
    this.strafeDir = id % 2 === 0 ? 1 : -1;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setPipeline('Light2D');
    this.setOrigin(0.5, stats.originY.idle);
    this.setScale(stats.scale);
    this.play(stats.clips.idle.key);

    if (kind === 'direwolf') {
      this.setTint(0x94a3b8);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const [w, h] = stats.bodySize.idle;
    const [ox, oy] = stats.bodyOffset.idle;
    body.setSize(w, h);
    body.setOffset(ox, oy);
    this.setDepth(DEPTH.YSORT_BASE + y);
    this.shadow = scene.add.sprite(x, y + 2, TEXTURE.SHADOW).setAlpha(0.35).setDepth(DEPTH.SHADOW);
  }

  get isDead(): boolean {
    return this.aiState === 'dead' || this.hp <= 0;
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

  get currentAggroTimer(): number {
    return this.aggroTimer;
  }

  get isInCombat(): boolean {
    return this.aggroTimer > 0 || this.aiState === 'chase' || this.aiState === 'windup' || this.aiState === 'lunge';
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

  /** Displays an overhead alert bubble when provoked or spotting targets. */
  showExclamationBubble(): void {
    if (!this.scene || !this.active) return;
    const alertText = this.scene.add
      .text(this.x, this.y - 30, '!', {
        fontFamily: FONT.UI,
        fontSize: '16px',
        fontStyle: '700',
        color: '#ef4444',
        stroke: '#450a0a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI);
    this.scene.tweens.add({
      targets: alertText,
      y: this.y - 48,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => alertText.destroy(),
    });
  }

  /** Provokes this enemy into aggressive combat mode for a set duration. */
  provoke(aggroDuration = COMBAT_AGGRO_DURATION, showAlertGfx = true): void {
    if (this.aiState === 'dead') return;
    this.aggroTimer = Math.max(this.aggroTimer, aggroDuration);
    if (this.aiState === 'patrol') {
      this.aiState = 'alert';
      this.stateTimer = 140;
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) body.setVelocity(0, 0);
      if (showAlertGfx) {
        this.showExclamationBubble();
      }
    }
  }

  /** Alerts nearby pack members within hearing/sight radius so they join combat. */
  alertNearbyAllies(otherEnemies: Enemy[] = [], radius = PACK_ALERT_RADIUS): void {
    if (!otherEnemies || otherEnemies.length === 0) return;
    for (const ally of otherEnemies) {
      if (ally === this || ally.isDead || !ally.active) continue;
      const dist = Math.hypot(this.x - ally.x, this.y - ally.y);
      if (dist <= radius) {
        if (ally.currentAIState === 'patrol') {
          // Stagger reaction slightly based on distance (0-200ms) for natural pack behavior
          const delay = Math.min(200, Math.floor(dist * 0.8));
          if (this.scene?.time) {
            this.scene.time.delayedCall(delay, () => {
              if (ally.active && !ally.isDead && ally.currentAIState === 'patrol') {
                ally.provoke(SOCIAL_AGGRO_DURATION, true);
              }
            });
          } else {
            ally.provoke(SOCIAL_AGGRO_DURATION, true);
          }
        } else if (ally.currentAIState === 'chase' || ally.currentAIState === 'alert') {
          ally.aggroTimer = Math.max(ally.aggroTimer, SOCIAL_AGGRO_DURATION);
        }
      }
    }
  }

  /** Returns true if this hit killed it. */
  takeDamage(amount: number, fromX: number, fromY: number, otherEnemies: Enemy[] = []): boolean {
    if (this.aiState === 'dead' || this.hitLock > 0) return false;

    // Orc Shieldbearer Block (70% chance to block with steel shield and mitigate 70% damage)
    if (this.kind === 'orc_shield' && Math.random() < 0.7) {
      SoundFX.playShieldBlock();
      if (this.scene) {
        const sx = this.x + (this.flipX ? -10 : 10);
        const sy = this.y - 12;
        // Shield guard flash
        const shieldFlash = this.scene.add.circle(sx, sy, 8, 0xe2e8f0, 0.95);
        this.scene.tweens.add({ targets: shieldFlash, scale: 2.5, alpha: 0, duration: 220, onComplete: () => shieldFlash.destroy() });
        // Metallic spark particles
        for (let i = 0; i < 4; i++) {
          const spk = this.scene.add.rectangle(sx, sy, 3, 3, 0xfacc15, 1);
          const ang = (Math.random() - 0.5) * Math.PI;
          const spd = 40 + Math.random() * 60;
          this.scene.tweens.add({
            targets: spk,
            x: sx + Math.cos(ang) * spd * 0.3,
            y: sy + Math.sin(ang) * spd * 0.3,
            alpha: 0,
            duration: 250,
            onComplete: () => spk.destroy(),
          });
        }
      }
      amount = Math.max(1, Math.round(amount * 0.3));
      // Immediate retaliation / counter-attack readiness upon block
      this.specialCooldown = 0;
      this.backstepCooldown = 0;
    }

    this.hp -= amount;
    this.hitLock = HIT_LOCK;
    this.setAngle(0);
    this.setScale(this.stats.scale);

    // Turn to face attacker (opposite of knockback)
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    if (Math.abs(dx) > 2) {
      this.setFlipX(fromX < this.x);
    }

    const wasPatrolling = this.aiState === 'patrol';
    this.provoke(COMBAT_AGGRO_DURATION, wasPatrolling);
    this.aiState = 'chase';

    // Social Aggro: Alert nearby allies in pack
    this.alertNearbyAllies(otherEnemies, PACK_ALERT_RADIUS);

    this.setTintFill(0xffffff);
    if (this.scene?.time) {
      this.scene.time.delayedCall(80, () => this.active && !this.isDead && this.clearTint());
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      const len = Math.hypot(dx, dy) || 1;
      body.setVelocity((dx / len) * 170, (dy / len) * 170);
    }

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    this.aiState = 'dead';
    this.clearTint();
    this.setAngle(0);
    this.setScale(this.stats.scale);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.setOrigin(0.5, this.stats.originY.death);
    this.play(this.stats.clips.death.key);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 200, onComplete: () => {
        // spawn blood/bone explosion
        for(let i=0; i<5; i++) {
            const part = this.scene.add.rectangle(this.x, this.y - 10, 3, 3, this.kind === 'imp' ? 0xcc0000 : (this.kind === 'wolf' ? 0x992222 : 0xdddddd));
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
    return this.updateAI(playerX, playerY, delta, [], false).landedHit;
  }

  /** Full Enhanced AI update with Flocking, State Machine, Windup, and Special Attacks. */
  updateAI(
    playerX: number,
    playerY: number,
    delta: number,
    otherEnemies: Enemy[] = [],
    playerAttacking = false
  ): EnemyActionOutput {
    const output: EnemyActionOutput = { landedHit: false, damage: this.stats.contactDamage };
    if (this.aiState === 'dead') return output;

    if (this.aggroTimer > 0) this.aggroTimer -= delta;

    if (this.hitLock > 0) {
      this.hitLock -= delta;
      this.setDepth(DEPTH.YSORT_BASE + this.y);
      if (this.shadow) this.shadow.setPosition(this.x, this.y + 2);
      return output;
    }

    if (this.specialCooldown > 0) this.specialCooldown -= delta;
    if (this.howlBuffTimer > 0) this.howlBuffTimer -= delta;

    // Process Status Effects (Burning, Poison, Frost, Shock)
    if (this.statusState.burningDuration > 0) {
      this.statusState.burningDuration -= delta;
      this.burnTickTimer += delta;
      if (this.burnTickTimer >= 600) {
        this.burnTickTimer = 0;
        this.takeDamage(1, this.x, this.y);
        if (this.hp <= 0) return output;
      }
    }
    if (this.statusState.poisonDuration > 0) {
      this.statusState.poisonDuration -= delta;
      this.poisonTickTimer += delta;
      if (this.poisonTickTimer >= 750) {
        this.poisonTickTimer = 0;
        this.takeDamage(1, this.x, this.y);
        if (this.hp <= 0) return output;
      }
    }
    if (this.statusState.frozenDuration > 0) {
      this.statusState.frozenDuration -= delta;
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) body.setVelocity(0, 0);
      this.setTint(0x38bdf8);
      return output;
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
    } else if (this.howlBuffTimer > 0) {
      this.setTint(0xfde047);
    } else {
      if (this.hitLock <= 0 && this.aiState !== 'windup' && this.aiState !== 'special_windup') {
        this.clearTint();
      }
    }

    if (this.backstepCooldown > 0) this.backstepCooldown -= delta;

    const speedMult = this.statusState.slowDuration > 0 ? this.statusState.slowFactor : 1.0;
    const speedBuff = this.howlBuffTimer > 0 ? 1.35 : 1.0;
    const currentChaseSpeed = this.stats.chaseSpeed * speedMult * speedBuff;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distToPlayer = Math.hypot(dx, dy);
    const body = this.body as Phaser.Physics.Arcade.Body;

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
          this.showExclamationBubble();
          this.stateTimer = 160; // brief reaction freeze
          this.aggroTimer = COMBAT_AGGRO_DURATION;
          body.setVelocity(0, 0);
          this.setFlipX(dx < 0);
          this.alertNearbyAllies(otherEnemies, NORMAL_ALERT_RADIUS);
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
            let px = this.patrolTargetX - this.x;
            let py = this.patrolTargetY - this.y;
            for (const other of otherEnemies) {
              if (other === this || other.isDead || !other.active) continue;
              const odx = this.x - other.x;
              const ody = this.y - other.y;
              const odist = Math.hypot(odx, ody);
              if (odist < 24) {
                const force = (24 - odist) / 24;
                px += odist > 0 ? (odx / odist) * force * 15 : 15;
                py += odist > 0 ? (ody / odist) * force * 15 : 15;
              }
            }
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
        // Lose target if too far away and combat aggro expired
        const effectiveLoseRadius = this.aggroTimer > 0 ? COMBAT_LOSE_RADIUS : this.stats.loseRadius;
        if (distToPlayer > effectiveLoseRadius) {
          this.aiState = 'patrol';
          this.aggroTimer = 0;
          this.patrolTargetX = this.homeX;
          this.patrolTargetY = this.homeY;
          break;
        }

        // Check Special Attack triggers
        if (this.specialCooldown <= 0) {
          // Imp Fireball Spit at mid-range
          if (this.kind === 'imp' && distToPlayer >= 65 && distToPlayer <= 150) {
            this.aiState = 'special_windup';
            this.stateTimer = 450;
            this.specialCooldown = 4200;
            this.setTint(0xf97316);
            this.setScale(this.stats.scale * 1.2, this.stats.scale * 0.9);
            body.setVelocity(0, 0);
            SoundFX.playEnemyFireballCharge();
            break;
          }
          // Skeleton Bone Cleave at close range
          if (this.kind === 'skeleton' && distToPlayer <= 46) {
            this.aiState = 'special_windup';
            this.stateTimer = 400;
            this.specialCooldown = 5000;
            this.setTint(0x67e8f9);
            this.setScale(this.stats.scale * 1.15, this.stats.scale * 1.15);
            body.setVelocity(0, 0);
            SoundFX.playCleaveWindup();
            break;
          }
          // Orc Shieldbearer Shield Bull Rush at mid-range (55..180 px)
          if (this.kind === 'orc_shield' && distToPlayer >= 55 && distToPlayer <= 180) {
            this.aiState = 'special_windup';
            this.stateTimer = 260;
            this.specialCooldown = 2400;
            this.setTint(0xe2e8f0);
            this.setAngle(0);
            this.setScale(this.stats.scale);
            body.setVelocity(0, 0);
            SoundFX.playCleaveWindup();
            if (this.scene) {
              const sx = this.x + (dx < 0 ? -12 : 12);
              const sy = this.y - 12;
              const gleam = this.scene.add.circle(sx, sy, 8, 0xf8fafc, 0.95);
              this.scene.tweens.add({ targets: gleam, scale: 2.4, alpha: 0, duration: 240, onComplete: () => gleam.destroy() });
            }
            break;
          }
          // Orc Archer Arrow Shot
          if (this.kind === 'orc_archer' && distToPlayer >= 60 && distToPlayer <= 220) {
            this.aiState = 'special_windup';
            this.stateTimer = 360;
            this.specialCooldown = 2200;
            this.setTint(0x86efac);
            this.setScale(this.stats.scale * 1.1, this.stats.scale * 0.9);
            body.setVelocity(0, 0);
            break;
          }
          // Wolf Pack Rally Howl
          if ((this.kind === 'wolf' || this.kind === 'direwolf') && distToPlayer <= 160 && this.howlBuffTimer <= 0) {
            this.aiState = 'special_windup';
            this.stateTimer = 350;
            this.specialCooldown = 6500;
            this.setTint(0xfacc15);
            this.setScale(this.stats.scale * 0.95, this.stats.scale * 1.25);
            body.setVelocity(0, 0);
            SoundFX.playWolfSnarl();
            break;
          }
        }

        // Orc Archer: Tactical retreat if player approaches too close
        if (this.kind === 'orc_archer' && distToPlayer < 65) {
          const backAngle = Math.atan2(this.y - playerY, this.x - playerX);
          body.setVelocity(Math.cos(backAngle) * this.stats.chaseSpeed * 1.1, Math.sin(backAngle) * this.stats.chaseSpeed * 1.1);
          this.setFlipX(dx < 0);
          break;
        }

        // Orc Archer: Companion Direwolf check and summoning
        if (this.kind === 'orc_archer') {
          const hasWolf = otherEnemies.some(e => e.kind === 'direwolf' && !e.isDead && e.active);
          if (!hasWolf) {
            this.wolfRespawnTimer -= delta;
            if (this.wolfRespawnTimer <= 0) {
              this.wolfRespawnTimer = 12000;
              SoundFX.playWolfHowl();
              output.minionSpawns = [{ x: this.x - 20, y: this.y, kind: 'direwolf' }];
            }
          }
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

          // Visual Telegraph: Imp crouches & flashes red; Orc Shield raises axe; Skeleton gleams white
          if (this.kind === 'imp') {
            this.setTint(0xff3333);
            this.setScale(this.stats.scale * 1.15, this.stats.scale * 0.85);
          } else if (this.kind === 'orc_shield') {
            this.setTint(0xfca5a5); // Crimson battle glow on axe
            this.setAngle(0);
            this.setScale(this.stats.scale);
            SoundFX.playCleaveWindup();
          } else {
            this.setTint(0xffffff);
            this.setScale(this.stats.scale * 0.9, this.stats.scale * 1.15);
          }
          break;
        }

        // --- Flocking / Separation Vector ---
        let sepX = 0;
        let sepY = 0;
        for (const other of otherEnemies) {
          if (other === this || other.isDead || !other.active) continue;
          const odx = this.x - other.x;
          const ody = this.y - other.y;
          const odist = Math.hypot(odx, ody);
          if (odist < 36) {
            if (odist === 0) {
              const ang = ((this.id * 2.399) % (Math.PI * 2));
              sepX += Math.cos(ang) * 1.6;
              sepY += Math.sin(ang) * 1.6;
            } else {
              const weight = (36 - odist) / 36;
              sepX += (odx / odist) * weight * 1.5;
              sepY += (ody / odist) * weight * 1.5;
            }
          }
        }

        // --- Surrounding / Encirclement offset ---
        const slotAngle = ((this.id % 8) - 3.5) * 0.38;
        const baseAngle = Math.atan2(dy, dx) + slotAngle;

        let moveDirX = Math.cos(baseAngle) + sepX;
        let moveDirY = Math.sin(baseAngle) + sepY;

        // Circle strafe if Skeleton is in mid-range
        if (this.stats.canCircleStrafe && distToPlayer < 65 && distToPlayer > 30) {
          const tangentAngle = Math.atan2(dy, dx) + (Math.PI / 2) * this.strafeDir;
          moveDirX = moveDirX * 0.4 + Math.cos(tangentAngle) * 0.6;
          moveDirY = moveDirY * 0.4 + Math.sin(tangentAngle) * 0.6;
        }

        const totalLen = Math.hypot(moveDirX, moveDirY) || 1;
        body.setVelocity((moveDirX / totalLen) * currentChaseSpeed, (moveDirY / totalLen) * currentChaseSpeed);
        this.setFlipX(dx < 0);
        break;
      }

      case 'special_windup': {
        this.stateTimer -= delta;
        this.setFlipX(dx < 0);
        body.setVelocity(0, 0);

        if (this.stateTimer <= 0) {
          this.clearTint();
          this.setScale(this.stats.scale);

          if (this.kind === 'imp') {
            output.projectile = { x: this.x, y: this.y - 8, targetX: playerX, targetY: playerY, damage: 1 };
            this.aiState = 'recovery';
            this.stateTimer = 350;
            SoundFX.playEnemyFireball();
          } else if (this.kind === 'skeleton') {
            SoundFX.playBoneCleave();
            if (distToPlayer <= 52) {
              output.landedHit = true;
              output.damage = 2; // Bone Cleave deals 2 damage!
            }
            this.aiState = 'recovery';
            this.stateTimer = 450;
          } else if (this.kind === 'orc_shield') {
            // Launch Shield Bull Rush!
            this.aiState = 'lunge';
            this.stateTimer = 240;
            this.clearTint();
            this.setAngle(0);
            this.setScale(this.stats.scale);
            this.attackAngle = Math.atan2(dy, dx);
            body.setVelocity(
              Math.cos(this.attackAngle) * 310,
              Math.sin(this.attackAngle) * 310
            );
            SoundFX.playShieldBlock();
            if (this.scene) {
              const bx = this.x + Math.cos(this.attackAngle) * 16;
              const by = this.y - 12 + Math.sin(this.attackAngle) * 16;
              const barrier = this.scene.add.circle(bx, by, 14, 0xe2e8f0, 0.85);
              barrier.setDepth(this.depth + 1);
              this.scene.tweens.add({ targets: barrier, scaleX: 1.8, scaleY: 0.8, alpha: 0, duration: 240, onComplete: () => barrier.destroy() });
            }
            break;
          } else if (this.kind === 'orc_archer') {
            SoundFX.playArrowShoot();
            output.projectile = { x: this.x, y: this.y - 6, targetX: playerX, targetY: playerY, damage: 1, isArrow: true };
            this.aiState = 'recovery';
            this.stateTimer = 320;
          } else if (this.kind === 'wolf' || this.kind === 'direwolf') {
            SoundFX.playWolfHowl();
            SoundFX.playWolfFrenzyRally();
            this.howlBuffTimer = 3500;
            for (const other of otherEnemies) {
              if ((other.kind === 'wolf' || other.kind === 'direwolf') && !other.isDead) {
                if (Math.hypot(other.x - this.x, other.y - this.y) <= 140) {
                  other.howlBuffTimer = 3500;
                }
              }
            }
            output.howl = true;
            this.aiState = 'chase';
          }
        }
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
          this.setAngle(0);
          this.setScale(this.stats.scale);
          if (this.kind === 'orc_shield') {
            SoundFX.playBoneCleave();
          }

          // Launch forward lunge
          body.setVelocity(
            Math.cos(this.attackAngle) * this.stats.lungeSpeed,
            Math.sin(this.attackAngle) * this.stats.lungeSpeed
          );
        }
        break;
      }

      case 'lunge': {
        if (this.stateTimer === this.stats.lungeDuration || (this.kind === 'orc_shield' && this.stateTimer >= 230)) {
           // just started lunge
           const dust = this.scene.add.circle(this.x, this.y, 4, 0xaaaaaa, 0.5);
           this.scene.tweens.add({ targets: dust, scale: 2, alpha: 0, duration: 300, onComplete: () => dust.destroy() });
           const trail = this.scene.add.sprite(this.x, this.y, this.texture.key, this.frame.name).setAlpha(0.4).setTint(this.kind === 'orc_shield' ? 0xe2e8f0 : 0xff0000);
           this.scene.tweens.add({ targets: trail, alpha: 0, duration: 200, onComplete: () => trail.destroy() });
        }
        this.stateTimer -= delta;

        // Check if hit lands on player
        const hitRadius = this.kind === 'orc_shield' ? 38 : CONTACT_RADIUS;
        if (distToPlayer < hitRadius) {
          output.landedHit = true;
          output.damage = this.kind === 'orc_shield' ? 2 : this.stats.contactDamage;
          this.setAngle(0);
          this.aiState = 'recovery';
          this.stateTimer = this.stats.recoveryDuration;
          body.setVelocity(0, 0);
          break;
        }

        if (this.stateTimer <= 0) {
          this.setAngle(0);
          this.aiState = 'recovery';
          this.stateTimer = this.stats.recoveryDuration;
          body.setVelocity(0, 0);
        }
        break;
      }

      case 'recovery': {
        this.stateTimer -= delta;
        this.setAngle(0);
        this.clearTint();
        this.setScale(this.stats.scale);
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
    return output;
  }

  private setAnimState(next: 'idle' | 'run'): void {
    if (this.aiState === 'dead') return;
    this.setOrigin(0.5, this.stats.originY[next]);
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
