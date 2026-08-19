import Phaser from 'phaser';
import { ANIM, DEPTH, TEXTURE } from '../gfx/registry';
import { SoundFX } from '../audio/SoundFX';
import { BossProjectile } from './BossProjectile';

export type BossAnimState = 'idle' | 'run' | 'dead';

export interface BossActionOutput {
  landedMelee: boolean;
  projectiles: BossProjectile[];
  minionSpawns: { x: number; y: number; kind: 'imp' | 'skeleton' }[];
}

export class BossEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly bossName = 'Архидемон Бездны';
  readonly contactDamage = 2;
  readonly maxHp: number;
  private hp: number;
  private animState: BossAnimState = 'idle';
  private phase: 1 | 2 = 1;

  private meleeCooldown = 2600; // 2.6s grace on spawn so boss cannot immediately kill player
  private shootTimer = 1800;
  private leapTimer = 0;
  private isLeaping = false;
  private isSpawning = true;
  private hitFlashTimer = 0;
  private shadow!: Phaser.GameObjects.Sprite;
  
  private light?: Phaser.GameObjects.Light;

  // Net puppet interpolation
  private netTargetX = 0;
  private netTargetY = 0;
  private hasNetTarget = false;

  constructor(scene: Phaser.Scene, x: number, y: number, baseHp = 50) {
    super(scene, x, y, TEXTURE.BOSS_DEMON, 0);
    this.maxHp = baseHp;
    this.hp = baseHp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setPipeline('Light2D');
    this.setOrigin(0.5, 1.0);
    this.setAlpha(0);
    this.setScale(0.3);
    this.play(ANIM.BOSS_DEMON_IDLE);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 18);
    body.setOffset(4, 18);
    body.setVelocity(0, 0);
    this.setDepth(DEPTH.YSORT_BASE + y);

    this.light = scene.lights.addLight(x, y - 16, 180, 0xef4444, 0.85);
    this.shadow = scene.add.sprite(x, y + 2, TEXTURE.SHADOW).setAlpha(0.35).setScale(2.2).setDepth(DEPTH.SHADOW);
    scene.tweens.add({
        targets: this,
        scaleY: 1.5,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Intro summon tween
    scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 1100,
      onStart: () => {
         const aura = scene.add.circle(x, y, 40, 0x000000, 0.7);
         scene.tweens.add({ targets: aura, scale: 3, alpha: 0, duration: 1000, onComplete: () => aura.destroy() });
         scene.cameras.main.shake(400, 0.005);
      },
      ease: 'Back.easeOut',
      onComplete: () => {
        this.isSpawning = false;
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

  updateBoss(targetX: number, targetY: number, delta: number): BossActionOutput {
    const result: BossActionOutput = {
      landedMelee: false,
      projectiles: [],
      minionSpawns: [],
    };

    if (this.isDead || !this.active || this.isSpawning) return result;

    if (this.light) {
      this.light.x = this.x;
      this.light.y = this.y - 18;
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        this.clearTint();
        if (this.phase === 2) this.setTint(0xff7777);
      }
    }

    if (this.isLeaping) return result;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);

    // Flip towards target
    if (Math.abs(targetX - this.x) > 6) {
      this.setFlipX(targetX < this.x);
    }

    // Phase check (Phase 2 at <= 50% HP)
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      SoundFX.playBossRoar();
      this.setTint(0xff7777);
      this.scene.cameras.main.shake(500, 0.008);
      const aura = this.scene.add.circle(this.x, this.y, 60, 0xff0000, 0.5);
      this.scene.tweens.add({ targets: aura, scale: 4, alpha: 0, duration: 800, onComplete: () => aura.destroy() });
      if (this.light) this.light.setColor(0xff2222);

      // Enrage spawn minion wave
      result.minionSpawns.push(
        { x: this.x - 36, y: this.y + 10, kind: 'skeleton' },
        { x: this.x + 36, y: this.y + 10, kind: 'skeleton' }
      );
    }

    // Movement AI
    const speed = this.phase === 1 ? 58 : 80;
    if (dist > 32) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      if (this.animState !== 'run') {
        this.animState = 'run';
        this.play(ANIM.BOSS_DEMON_RUN, true);
      }
    } else {
      body.setVelocity(0, 0);
      if (this.animState !== 'idle') {
        this.animState = 'idle';
        this.play(ANIM.BOSS_DEMON_IDLE, true);
      }
    }

    this.setDepth(DEPTH.YSORT_BASE + this.y);
    if (this.shadow) this.shadow.setPosition(this.x, this.y + 2);
    if (this.shadow) this.shadow.setPosition(this.x, this.y + 2);

    // 1. Melee attack check
    if (this.meleeCooldown > 0) this.meleeCooldown -= delta;
    if (dist < 34 && this.meleeCooldown <= 0) {
      this.meleeCooldown = this.phase === 1 ? 1200 : 850;
      result.landedMelee = true;
      SoundFX.playShockwave();
    }

    // 2. Projectile Skull Barrage
    this.shootTimer += delta;
    const shootInterval = this.phase === 1 ? 4200 : 2800;
    if (this.shootTimer >= shootInterval) {
      this.shootTimer = 0;
      SoundFX.playProjectileLaunch();

      const count = this.phase === 1 ? 3 : 5;
      const baseAngle = Phaser.Math.Angle.Between(this.x, this.y - 16, targetX, targetY);
      const spread = 0.28;

      for (let i = 0; i < count; i++) {
        const offsetAngle = baseAngle + (i - (count - 1) / 2) * spread;
        const tx = this.x + Math.cos(offsetAngle) * 100;
        const ty = this.y - 16 + Math.sin(offsetAngle) * 100;
        const proj = new BossProjectile(this.scene, this.x, this.y - 16, tx, ty, 110, 1);
        result.projectiles.push(proj);
      }
    }

    // 3. Phase 2 Abyssal Jump Attack
    if (this.phase === 2) {
      this.leapTimer += delta;
      if (this.leapTimer >= 6500) {
        this.leapTimer = 0;
        this.executeLeapAttack(targetX, targetY, result);
      }
    }

    return result;
  }

  private executeLeapAttack(targetX: number, targetY: number, result: BossActionOutput): void {
    this.isLeaping = true;
    if (this.shadow) {
        this.scene.tweens.add({ targets: this.shadow, scale: 1.0, alpha: 0.1, duration: 500, ease: 'Quad.easeOut' });
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    SoundFX.playBossRoar();

    // Jump up animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 45,
      alpha: 0.2,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Slam down at player's target position
        this.setPosition(targetX, targetY - 45);
        if (this.shadow) {
            this.shadow.setPosition(targetX, targetY + 2);
            this.scene.tweens.add({ targets: this.shadow, scale: 2.2, alpha: 0.35, duration: 350, ease: 'Quad.easeIn' });
        }
        this.scene.tweens.add({
          targets: this,
          y: targetY,
          alpha: 1.0,
          scaleX: 1.45,
          scaleY: 1.45,
          duration: 350,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.isLeaping = false;
            SoundFX.playShockwave();
            this.scene.cameras.main.shake(400, 0.012);

            // Ring of 6 skulls in all directions
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2;
              const tx = this.x + Math.cos(angle) * 100;
              const ty = this.y - 16 + Math.sin(angle) * 100;
              const proj = new BossProjectile(this.scene, this.x, this.y - 16, tx, ty, 120, 1);
              result.projectiles.push(proj);
            }
          },
        });
      },
    });
  }

  takeDamage(amount: number, fromX?: number, fromY?: number): boolean {
    if (this.isDead || !this.active) return false;

    this.hp -= amount;
    this.setTint(0xffffff);
    this.hitFlashTimer = 100;

    // Boss has heavy knockback resistance (only tiny nudge)
    if (fromX !== undefined && fromY !== undefined) {
      const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(angle) * 20, Math.sin(angle) * 20);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.animState = 'dead';
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.enable = false;
      body.setVelocity(0, 0);

      SoundFX.playBossDeath();
      if (this.light) this.light.setVisible(false);

      this.setTintFill(0xffffff);
      this.scene.cameras.main.shake(1000, 0.005);
      
      this.scene.time.delayedCall(150, () => {
         this.clearTint();
         let burstCount = 0;
         this.scene.time.addEvent({
             delay: 200,
             repeat: 4,
             callback: () => {
                 burstCount++;
                 const bx = this.x + (Math.random()-0.5)*40;
                 const by = this.y - 20 + (Math.random()-0.5)*40;
                 const burst = this.scene.add.circle(bx, by, 10, 0xffffff, 0.8);
                 this.scene.tweens.add({ targets: burst, scale: 3, alpha: 0, duration: 300, onComplete:()=>burst.destroy() });
             }
         });
         
         this.scene.tweens.add({
             targets: this,
             scale: 0.5,
             alpha: 0,
             duration: 1200,
             ease: 'Back.easeIn',
             onComplete: () => {
                 if (this.shadow) this.shadow.destroy();
                 this.destroy();
             }
         });
      });

      return true;
    }

    return false;
  }

  applyRemoteState(x: number, y: number, anim: BossAnimState, flipX: boolean, hp: number, phase: 1 | 2): void {
    this.netTargetX = x;
    this.netTargetY = y;
    this.hasNetTarget = true;
    this.setFlipX(flipX);
    this.hp = hp;
    this.phase = phase;

    if (this.animState !== anim) {
      this.animState = anim;
      if (anim === 'idle') this.play(ANIM.BOSS_DEMON_IDLE, true);
      else if (anim === 'run') this.play(ANIM.BOSS_DEMON_RUN, true);
      else if (anim === 'dead') {
        (this.body as Phaser.Physics.Arcade.Body).enable = false;
        if (this.light) this.light.setVisible(false);
      }
    }
  }

  interpolate(delta: number): void {
    if (!this.hasNetTarget || this.isDead) return;
    const t = Math.min(1, (14 * delta) / 1000);
    this.x = Phaser.Math.Linear(this.x, this.netTargetX, t);
    this.y = Phaser.Math.Linear(this.y, this.netTargetY, t);
    this.setDepth(DEPTH.YSORT_BASE + this.y);
    if (this.light) {
      this.light.x = this.x;
      this.light.y = this.y - 18;
    }
  }
}
