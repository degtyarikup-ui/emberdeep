import Phaser from 'phaser';
import { ANIM, DEPTH, TEXTURE } from '../gfx/registry';
import { SoundFX } from '../audio/SoundFX';
import { BossProjectile } from './BossProjectile';
import { BossActionOutput, BossAnimState } from './BossEnemy';

export type OrcBossState = 'idle' | 'chase' | 'slam_windup' | 'charge_windup' | 'charging' | 'recovery' | 'dead';

export class OrcBossEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly bossName = 'Вождь Орков Грог\'Нар';
  readonly phase1Label = 'ФАЗА I: ВОЖДЬ ПЛЕМЕНИ';
  readonly phase2Label = 'ФАЗА II: КРОВАВАЯ ЯРОСТЬ';
  readonly contactDamage = 1;
  readonly maxHp: number;
  private hp: number;
  private animState: BossAnimState = 'idle';
  private orcState: OrcBossState = 'idle';
  private phase: 1 | 2 = 1;

  private stateTimer = 0;
  private slamCooldown = 3200;
  private chargeCooldown = 6500;
  private warcryCooldown = 15000;
  private hasEnraged = false;

  private chargeAngle = 0;
  private chargeSpeed = 240;

  private isSpawning = true;
  private hitFlashTimer = 0;
  private shadow!: Phaser.GameObjects.Sprite;
  private light?: Phaser.GameObjects.Light;

  // Net puppet interpolation
  private netTargetX = 0;
  private netTargetY = 0;
  private hasNetTarget = false;

  constructor(scene: Phaser.Scene, x: number, y: number, baseHp = 60) {
    super(scene, x, y, `${TEXTURE.BOSS_ORC_IDLE}_f0`);
    this.maxHp = baseHp;
    this.hp = baseHp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setPipeline('Light2D');
    this.setOrigin(0.5, 1.0);
    this.setAlpha(0);
    this.setScale(1.75);
    this.play(ANIM.BOSS_ORC_IDLE);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(26, 20);
    body.setOffset(3, 16);
    body.setVelocity(0, 0);
    this.setDepth(DEPTH.YSORT_BASE + y);

    this.light = scene.lights.addLight(x, y - 20, 160, 0xf59e0b, 0.9);
    this.shadow = scene.add.sprite(x, y + 2, TEXTURE.SHADOW).setAlpha(0.4).setScale(2.4).setDepth(DEPTH.SHADOW);

    SoundFX.playOrcRoar();

    // Intro summon / stomp tween
    scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1.75,
      scaleY: 1.75,
      duration: 900,
      onStart: () => {
        const shock = scene.add.circle(x, y, 45, 0x92400e, 0.7);
        scene.tweens.add({ targets: shock, scale: 2.8, alpha: 0, duration: 800, onComplete: () => shock.destroy() });
        scene.cameras.main.shake(350, 0.006);
      },
      ease: 'Back.easeOut',
      onComplete: () => {
        this.isSpawning = false;
        this.orcState = 'chase';
      },
    });
  }

  get isDead(): boolean {
    return this.animState === 'dead';
  }

  get currentAnim(): BossAnimState {
    return this.animState;
  }

  get currentHp(): number {
    return this.hp;
  }

  get currentPhase(): 1 | 2 {
    return this.phase;
  }

  get isEnraged(): boolean {
    return this.phase === 2;
  }

  public takeDamage(amount: number, fromX?: number, fromY?: number): boolean {
    if (this.isDead || this.isSpawning) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 110;
    this.setTint(0xffffff);

    // Subtle knockback / twitch
    if (fromX !== undefined && fromY !== undefined && this.orcState !== 'charging') {
      const angle = Math.atan2(this.y - fromY, this.x - fromX);
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.velocity.x += Math.cos(angle) * 30;
        body.velocity.y += Math.sin(angle) * 30;
      }
    }

    // Phase 2 Bloodrage trigger at 50% HP
    if (this.hp <= this.maxHp * 0.5 && !this.hasEnraged) {
      this.hasEnraged = true;
      this.phase = 2;
      SoundFX.playOrcRoar();
      if (this.light) {
        this.light.setColor(0xef4444);
        this.light.setIntensity(1.3);
      }
      this.scene.cameras.main.shake(400, 0.008);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.95,
        scaleY: 1.95,
        duration: 250,
        yoyo: true,
        repeat: 2,
      });
    }

    if (this.hp <= 0) {
      this.playDeath();
      return true;
    }
    return false;
  }

  public playDeath(onComplete?: () => void): void {
    if (this.isDead) return;
    this.animState = 'dead';
    this.orcState = 'dead';

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }

    SoundFX.playBossDeath();
    this.setTint(0x7f1d1d);

    this.scene.tweens.add({
      targets: [this, this.shadow],
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      y: this.y + 12,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        if (this.light) this.scene.lights.removeLight(this.light);
        this.shadow.destroy();
        this.destroy();
        onComplete?.();
      },
    });
  }

  public updateBoss(targetX: number, targetY: number, delta: number): BossActionOutput {
    const output: BossActionOutput = {
      landedMelee: false,
      projectiles: [],
      minionSpawns: [],
    };

    if (this.isDead || this.isSpawning) return output;

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setDepth(DEPTH.YSORT_BASE + this.y);
    if (this.shadow) this.shadow.setPosition(this.x, this.y + 2);
    if (this.light) this.light.setPosition(this.x, this.y - 20);

    // Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        if (this.isEnraged) {
          this.setTint(0xff6b6b);
        } else {
          this.clearTint();
        }
      }
    }

    // Cooldown ticks
    this.slamCooldown -= delta;
    this.chargeCooldown -= delta;
    this.warcryCooldown -= delta;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    // State Machine
    switch (this.orcState) {
      case 'idle':
      case 'chase': {
        this.setFlipX(dx < 0);

        // Check Warcry Minion Spawn
        if (this.warcryCooldown <= 0) {
          this.warcryCooldown = this.isEnraged ? 14000 : 18000;
          SoundFX.playOrcRoar();
          this.scene.cameras.main.shake(200, 0.004);
          output.minionSpawns.push(
            { x: this.x - 36, y: this.y - 12, kind: 'wolf' as any },
            { x: this.x + 36, y: this.y - 12, kind: 'skeleton' }
          );
        }

        // Check Ground Slam trigger
        if (this.slamCooldown <= 0 && dist <= 75) {
          this.orcState = 'slam_windup';
          this.stateTimer = 600;
          this.slamCooldown = this.isEnraged ? 3200 : 4500;
          body.setVelocity(0, 0);
          this.setTint(0xf97316);
          this.setScale(1.9, 1.6);
          break;
        }

        // Check Berserk Charge trigger
        if (this.chargeCooldown <= 0 && dist >= 85 && dist <= 280) {
          this.orcState = 'charge_windup';
          this.stateTimer = 500;
          this.chargeCooldown = this.isEnraged ? 4800 : 7000;
          this.chargeAngle = Math.atan2(dy, dx);
          body.setVelocity(0, 0);
          this.setTint(0xef4444);
          this.setScale(1.9, 1.5);
          SoundFX.playOrcRoar();
          break;
        }

        // Normal chase movement
        const baseSpeed = this.isEnraged ? 115 : 80;
        const len = dist || 1;
        body.setVelocity((dx / len) * baseSpeed, (dy / len) * baseSpeed);

        if (this.anims.currentAnim?.key !== ANIM.BOSS_ORC_RUN) {
          this.play(ANIM.BOSS_ORC_RUN);
          this.animState = 'run';
        }
        break;
      }

      case 'slam_windup': {
        this.stateTimer -= delta;
        body.setVelocity(0, 0);
        this.setFlipX(dx < 0);

        if (this.stateTimer <= 0) {
          this.clearTint();
          this.setScale(1.75);
          SoundFX.playGroundSlam();
          this.scene.cameras.main.shake(300, 0.007);

          // Impact shockwave circle
          const shock = this.scene.add.circle(this.x, this.y, 35, 0xd97706, 0.6);
          this.scene.tweens.add({ targets: shock, scale: 2.2, alpha: 0, duration: 350, onComplete: () => shock.destroy() });

          // Melee area damage (2 damage in 55px radius)
          if (dist <= 55) {
            output.landedMelee = true;
          }

          // Launch rock projectiles (4 in Phase 1, 8 in Phase 2)
          const count = this.isEnraged ? 8 : 4;
          const step = (Math.PI * 2) / count;
          for (let i = 0; i < count; i++) {
            const angle = i * step;
            const targetPosX = this.x + Math.cos(angle) * 160;
            const targetPosY = this.y + Math.sin(angle) * 160;
            const proj = new BossProjectile(this.scene, this.x, this.y - 10, targetPosX, targetPosY, 120, 1);
            proj.setTint(this.isEnraged ? 0xef4444 : 0xf59e0b);
            output.projectiles.push(proj);
          }

          this.orcState = 'recovery';
          this.stateTimer = 400;
        }
        break;
      }

      case 'charge_windup': {
        this.stateTimer -= delta;
        body.setVelocity(0, 0);
        this.setFlipX(dx < 0);

        if (this.stateTimer <= 0) {
          this.clearTint();
          this.setScale(1.75);
          this.orcState = 'charging';
          this.stateTimer = 750;
          this.chargeSpeed = this.isEnraged ? 280 : 230;
          SoundFX.playOrcCharge();
        }
        break;
      }

      case 'charging': {
        this.stateTimer -= delta;
        body.setVelocity(Math.cos(this.chargeAngle) * this.chargeSpeed, Math.sin(this.chargeAngle) * this.chargeSpeed);
        this.setFlipX(Math.cos(this.chargeAngle) < 0);

        // Check if collision with target
        if (dist <= 36) {
          output.landedMelee = true; // 2 damage hit!
          this.orcState = 'recovery';
          this.stateTimer = 450;
          body.setVelocity(0, 0);
          this.scene.cameras.main.shake(200, 0.005);
          break;
        }

        if (this.stateTimer <= 0) {
          this.orcState = 'recovery';
          this.stateTimer = 400;
          body.setVelocity(0, 0);
        }
        break;
      }

      case 'recovery': {
        this.stateTimer -= delta;
        body.setVelocity(0, 0);
        if (this.anims.currentAnim?.key !== ANIM.BOSS_ORC_IDLE) {
          this.play(ANIM.BOSS_ORC_IDLE);
          this.animState = 'idle';
        }

        if (this.stateTimer <= 0) {
          this.orcState = 'chase';
        }
        break;
      }
    }

    return output;
  }

  public applyRemoteState(x: number, y: number, anim: BossAnimState, flipX: boolean, hp: number, phase: 1 | 2): void {
    this.netTargetX = x;
    this.netTargetY = y;
    this.hasNetTarget = true;
    this.setFlipX(flipX);
    this.hp = hp;
    this.phase = phase;

    if (this.animState !== anim) {
      this.animState = anim;
      if (anim === 'idle') this.play(ANIM.BOSS_ORC_IDLE, true);
      else if (anim === 'run') this.play(ANIM.BOSS_ORC_RUN, true);
      else if (anim === 'dead') {
        (this.body as Phaser.Physics.Arcade.Body).enable = false;
        if (this.light) this.light.setVisible(false);
      }
    }
  }

  public setNetTarget(x: number, y: number): void {
    this.netTargetX = x;
    this.netTargetY = y;
    this.hasNetTarget = true;
  }

  public interpolate(delta: number): void {
    if (!this.hasNetTarget || this.isDead) return;
    const factor = Math.min(1, (delta / 1000) * 15);
    this.x += (this.netTargetX - this.x) * factor;
    this.y += (this.netTargetY - this.y) * factor;
    this.setDepth(DEPTH.YSORT_BASE + this.y);
    if (this.shadow) this.shadow.setPosition(this.x, this.y + 2);
    if (this.light) this.light.setPosition(this.x, this.y - 20);
  }
}
