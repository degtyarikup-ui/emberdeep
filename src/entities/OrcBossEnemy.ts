import Phaser from 'phaser';
import { ANIM, DEPTH, TEXTURE } from '../gfx/registry';
import { SoundFX } from '../audio/SoundFX';
import { BossActionOutput, BossAnimState } from './BossEnemy';
import { EnemyKind } from './Enemy';
import type { Player } from './Player';

interface GameSceneContext extends Phaser.Scene {
  players?: Player[];
  spawnDamageNumber?: (x: number, y: number, text: string, color: string) => void;
  buildHeartsUI?: () => void;
}

export type OrcBossState = 'idle' | 'chase' | 'cleave_windup' | 'slam_windup' | 'charge_windup' | 'charging' | 'storm_windup' | 'recovery' | 'dead';

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
  private cleaveCooldown = 2200;
  private slamCooldown = 3200;
  private chargeCooldown = 6500;
  private stormCooldown = 8000;
  private warcryCooldown = 15000;
  private hasEnraged = false;

  private cleaveAngle = 0;
  private chargeAngle = 0;
  private chargeSpeed = 240;

  private isSpawning = true;
  private hitFlashTimer = 0;
  private shadow!: Phaser.GameObjects.Sprite;
  private axe!: Phaser.GameObjects.Sprite;
  private light?: Phaser.GameObjects.Light;

  private slamTelegraph?: {
    circle: Phaser.GameObjects.Arc;
    border: Phaser.GameObjects.Arc;
    crack: Phaser.GameObjects.Graphics;
  };

  private cleaveTelegraph?: {
    graphics: Phaser.GameObjects.Graphics;
    totalTime: number;
    radius: number;
  };

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

    // Axe positioned clearly to the side/behind to leave the detailed body & face 100% visible
    this.axe = scene.add.sprite(x + 24, y - 6, TEXTURE.WEAPON_BOSS_ORC_AXE);
    this.axe.setOrigin(0.5, 0.85);
    this.axe.setScale(1.4);
    this.axe.setPipeline('Light2D');
    this.axe.setDepth(DEPTH.YSORT_BASE + y - 1);
    this.axe.setAlpha(0);

    this.light = scene.lights.addLight(x, y - 20, 260, 0xfbbf24, 1.3);
    this.shadow = scene.add.sprite(x, y + 2, TEXTURE.SHADOW).setAlpha(0.4).setScale(2.4).setDepth(DEPTH.SHADOW);

    SoundFX.playOrcRoar();

    // Intro summon / stomp tween
    scene.tweens.add({
      targets: [this, this.axe],
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

  private destroySlamTelegraph(): void {
    if (this.slamTelegraph) {
      this.slamTelegraph.circle.destroy();
      this.slamTelegraph.border.destroy();
      this.slamTelegraph.crack.destroy();
      this.slamTelegraph = undefined;
    }
  }

  private destroyCleaveTelegraph(): void {
    if (this.cleaveTelegraph) {
      this.cleaveTelegraph.graphics.destroy();
      this.cleaveTelegraph = undefined;
    }
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
    this.destroySlamTelegraph();
    this.destroyCleaveTelegraph();

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }

    SoundFX.playBossDeath();
    this.setTint(0x7f1d1d);

    this.scene.tweens.add({
      targets: [this, this.shadow, this.axe],
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      y: this.y + 12,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        if (this.light) this.scene.lights.removeLight(this.light);
        this.shadow.destroy();
        this.axe.destroy();
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
          this.axe.setTint(0xff7777);
        } else {
          this.clearTint();
          this.axe.clearTint();
        }
      }
    }

    // Cooldown ticks
    this.cleaveCooldown -= delta;
    this.slamCooldown -= delta;
    this.chargeCooldown -= delta;
    this.stormCooldown -= delta;
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
            { x: this.x - 36, y: this.y - 12, kind: 'wolf' as EnemyKind },
            { x: this.x + 36, y: this.y - 12, kind: 'skeleton' }
          );
        }

        // 0. Check Cleave Arc trigger (Frontal AoE Cleave on distance <= 115 px)
        if (this.cleaveCooldown <= 0 && dist <= 115) {
          this.orcState = 'cleave_windup';
          const windupDuration = this.isEnraged ? 400 : 550;
          this.stateTimer = windupDuration;
          this.cleaveCooldown = this.isEnraged ? 3000 : 3800;
          this.cleaveAngle = Math.atan2(dy, dx);
          body.setVelocity(0, 0);
          this.setTint(0xf87171);
          this.setScale(1.85, 1.65);
          this.axe.setTint(0xf87171);
          SoundFX.playCleaveWindup();

          // Spawn Fan/Cone Telegraph Graphics (120 degrees sector)
          this.destroyCleaveTelegraph();
          const g = this.scene.add.graphics().setDepth(DEPTH.SHADOW + 2);
          const radius = this.isEnraged ? 120 : 110;
          this.cleaveTelegraph = { graphics: g, totalTime: windupDuration, radius };
          break;
        }

        // 1. Check Ground Slam trigger (Close range AoE)
        if (this.slamCooldown <= 0 && dist <= 80) {
          this.orcState = 'slam_windup';
          this.stateTimer = 650;
          this.slamCooldown = this.isEnraged ? 3200 : 4500;
          body.setVelocity(0, 0);
          this.setTint(0xf97316);
          this.setScale(1.9, 1.6);
          this.axe.setTint(0xf97316);

          // Spawn prominent Danger Zone Telegraph
          this.destroySlamTelegraph();
          const circle = this.scene.add.circle(this.x, this.y, 80, 0xef4444, 0.28).setDepth(DEPTH.SHADOW + 1);
          const border = this.scene.add.circle(this.x, this.y, 80).setStrokeStyle(3, 0xdc2626, 0.95).setDepth(DEPTH.SHADOW + 2);
          const crack = this.scene.add.graphics().setDepth(DEPTH.SHADOW + 3);
          crack.lineStyle(2, 0xf97316, 0.85);
          for (let c = 0; c < 6; c++) {
            const cang = (c / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            crack.beginPath();
            crack.moveTo(this.x, this.y);
            crack.lineTo(this.x + Math.cos(cang) * 45, this.y + Math.sin(cang) * 45);
            crack.lineTo(this.x + Math.cos(cang + 0.2) * 75, this.y + Math.sin(cang + 0.2) * 75);
            crack.strokePath();
          }
          this.slamTelegraph = { circle, border, crack };
          this.scene.tweens.add({
            targets: [circle, border],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 300,
            yoyo: true,
            repeat: 1,
          });
          break;
        }

        // 2. Check Shaman Lightning Storm trigger (Lightning strikes around boss)
        if (this.stormCooldown <= 0 && dist <= 260) {
          this.orcState = 'storm_windup';
          this.stateTimer = 750;
          this.stormCooldown = this.isEnraged ? 7000 : 10500;
          body.setVelocity(0, 0);
          this.setTint(0x38bdf8);
          this.setScale(1.85, 1.6);
          this.axe.setTint(0x60a5fa);
          SoundFX.playOrcRoar();

          // Spawn 4-6 Lightning Strike Zones around the boss
          const numStrikes = this.isEnraged ? 6 : 4;
          for (let i = 0; i < numStrikes; i++) {
            const ang = (i / numStrikes) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const rDist = 45 + Math.random() * 140;
            const lx = this.x + Math.cos(ang) * rDist;
            const ly = this.y + Math.sin(ang) * rDist;
            const strikeDelay = 800 + Math.random() * 300;

            // 1. Telegraph Ring on Ground
            const zoneGlow = this.scene.add.circle(lx, ly, 26, 0x38bdf8, 0.3).setDepth(DEPTH.SHADOW + 1);
            const zoneRing = this.scene.add.circle(lx, ly, 26).setStrokeStyle(2, 0x0284c7, 0.9).setDepth(DEPTH.SHADOW + 2);
            this.scene.tweens.add({
              targets: [zoneGlow, zoneRing],
              scaleX: 1.15,
              scaleY: 1.15,
              duration: 250,
              yoyo: true,
              repeat: 2,
            });

            // Spark particles swirling in telegraph
            for (let s = 0; s < 3; s++) {
              const spk = this.scene.add.rectangle(lx + (Math.random() - 0.5) * 20, ly + (Math.random() - 0.5) * 20, 3, 3, 0x67e8f9, 1).setDepth(DEPTH.SHADOW + 3);
              this.scene.tweens.add({
                targets: spk,
                alpha: 0,
                y: spk.y - 12,
                duration: strikeDelay,
                onComplete: () => spk.destroy(),
              });
            }

            // 2. Delayed Lightning Strike Execution
            this.scene.time.delayedCall(strikeDelay, () => {
              zoneGlow.destroy();
              zoneRing.destroy();
              if (!this.scene || this.isDead) return;

              // Vertical Lightning Bolt
              const boltTop = ly - 260;
              const bolt = this.scene.add.rectangle(lx, (ly + boltTop) / 2, 6, 260, 0xf8fafc).setDepth(DEPTH.UI - 10);
              const boltGlow = this.scene.add.rectangle(lx, (ly + boltTop) / 2, 14, 260, 0x38bdf8, 0.7).setDepth(DEPTH.UI - 11);

              SoundFX.playLightningZap();
              this.scene.cameras.main.shake(140, 0.0035);

              this.scene.tweens.add({
                targets: [bolt, boltGlow],
                alpha: 0,
                scaleX: 0.1,
                duration: 180,
                onComplete: () => {
                  bolt.destroy();
                  boltGlow.destroy();
                },
              });

              // Ground Impact Spark Burst
              for (let p = 0; p < 8; p++) {
                const pang = (p / 8) * Math.PI * 2;
                const pdist = 18 + Math.random() * 16;
                const pspk = this.scene.add.rectangle(lx, ly, 3, 3, 0x67e8f9, 1).setDepth(DEPTH.YSORT_BASE + ly + 10);
                this.scene.tweens.add({
                  targets: pspk,
                  x: lx + Math.cos(pang) * pdist,
                  y: ly + Math.sin(pang) * pdist,
                  alpha: 0,
                  duration: 220,
                  onComplete: () => pspk.destroy(),
                });
              }

              // Check damage on nearest alive player
              const gs = this.scene as GameSceneContext;
              if (gs && gs.players) {
                for (const player of gs.players) {
                  if (player.isDowned || player.godMode) continue;
                  if (Phaser.Math.Distance.Between(player.x, player.y, lx, ly) < 28) {
                    player.takeDamage(1, lx, ly);
                    SoundFX.playPlayerHurt();
                    if (gs.spawnDamageNumber) {
                      gs.spawnDamageNumber(player.x, player.y, '-1', '#38bdf8');
                    }
                    if (gs.buildHeartsUI) gs.buildHeartsUI();
                  }
                }
              }
            });
          }
          break;
        }

        // 3. Check Berserk Charge trigger
        if (this.chargeCooldown <= 0 && dist >= 85 && dist <= 280) {
          this.orcState = 'charge_windup';
          this.stateTimer = 500;
          this.chargeCooldown = this.isEnraged ? 4800 : 7000;
          this.chargeAngle = Math.atan2(dy, dx);
          body.setVelocity(0, 0);
          this.setTint(0xef4444);
          this.setScale(1.9, 1.5);
          this.axe.setTint(0xef4444);
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

      case 'cleave_windup': {
        this.stateTimer -= delta;
        body.setVelocity(0, 0);
        this.setFlipX(dx < 0);
        this.cleaveAngle = Math.atan2(dy, dx); // Continues tracking during windup

        if (this.cleaveTelegraph) {
          const g = this.cleaveTelegraph.graphics;
          g.clear();
          const progress = Math.min(1, Math.max(0, 1 - (this.stateTimer / this.cleaveTelegraph.totalTime)));
          const radius = this.cleaveTelegraph.radius;
          const halfAngle = Math.PI / 3; // 60 deg each side => 120 deg sector
          const startAngle = this.cleaveAngle - halfAngle;
          const endAngle = this.cleaveAngle + halfAngle;

          // Sector Background (transparent red danger zone)
          g.fillStyle(0xdc2626, 0.22);
          g.beginPath();
          g.moveTo(this.x, this.y - 8);
          g.arc(this.x, this.y - 8, radius, startAngle, endAngle, false);
          g.closePath();
          g.fillPath();

          // Sector Progress (filling from center outward)
          g.fillStyle(0xef4444, 0.45);
          g.beginPath();
          g.moveTo(this.x, this.y - 8);
          g.arc(this.x, this.y - 8, radius * Math.max(0.1, progress), startAngle, endAngle, false);
          g.closePath();
          g.fillPath();

          // Sector Border
          g.lineStyle(2.5, 0xf87171, 0.9);
          g.beginPath();
          g.moveTo(this.x, this.y - 8);
          g.arc(this.x, this.y - 8, radius, startAngle, endAngle, false);
          g.closePath();
          g.strokePath();
        }

        if (this.stateTimer <= 0) {
          this.destroyCleaveTelegraph();
          this.clearTint();
          if (this.isEnraged) this.axe.setTint(0xff7777); else this.axe.clearTint();
          this.setScale(1.75);

          // Short lunge / step towards target (30 px)
          const lungeDist = 30;
          const targetLungeX = this.x + Math.cos(this.cleaveAngle) * lungeDist;
          const targetLungeY = this.y + Math.sin(this.cleaveAngle) * lungeDist;
          this.scene.tweens.add({
            targets: this,
            x: targetLungeX,
            y: targetLungeY,
            duration: 110,
            ease: 'Power2',
          });

          SoundFX.playBossCleaveSlash();
          this.scene.cameras.main.shake(220, 0.006);

          // Spawn Crescent Slash Wave FX
          const slashDist = (this.isEnraged ? 120 : 110) * 0.55;
          const slashX = this.x + Math.cos(this.cleaveAngle) * slashDist;
          const slashY = this.y - 8 + Math.sin(this.cleaveAngle) * slashDist;
          const slash = this.scene.add.sprite(slashX, slashY, TEXTURE.SLASH_WHIRLWIND || TEXTURE.SLASH_FX);
          slash.setRotation(this.cleaveAngle);
          slash.setScale(2.2);
          slash.setTint(this.isEnraged ? 0xef4444 : 0xf97316);
          slash.setDepth(DEPTH.YSORT_BASE + this.y + 10);
          this.scene.tweens.add({
            targets: slash,
            scaleX: 3.2,
            scaleY: 3.2,
            alpha: 0,
            duration: 250,
            onComplete: () => slash.destroy(),
          });

          // Check cone hit on players
          const gs = this.scene as GameSceneContext;
          if (gs && gs.players) {
            const hitRadius = this.isEnraged ? 120 : 110;
            const halfCone = Math.PI / 3;

            for (const player of gs.players) {
              if (player.isDowned || player.godMode) continue;
              const pdx = player.x - this.x;
              const pdy = player.y - (this.y - 8);
              const pdist = Math.hypot(pdx, pdy);

              if (pdist <= hitRadius) {
                const playerAngle = Math.atan2(pdy, pdx);
                let angleDiff = Math.abs(playerAngle - this.cleaveAngle);
                while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

                if (angleDiff <= halfCone) {
                  // Hit player with 2 damage & 50px knockback!
                  player.takeDamage(2, this.x, this.y);
                  SoundFX.playPlayerHurt();
                  if (gs.spawnDamageNumber) {
                    gs.spawnDamageNumber(player.x, player.y, '-2', '#ef4444');
                  }
                  if (gs.buildHeartsUI) gs.buildHeartsUI();

                  const kbBody = player.body as Phaser.Physics.Arcade.Body;
                  if (kbBody) {
                    kbBody.velocity.x += Math.cos(this.cleaveAngle) * 220;
                    kbBody.velocity.y += Math.sin(this.cleaveAngle) * 220;
                  }
                }
              }
            }
          }

          this.orcState = 'recovery';
          this.stateTimer = this.isEnraged ? 200 : 300;
        }
        break;
      }

      case 'slam_windup': {
        this.stateTimer -= delta;
        body.setVelocity(0, 0);
        this.setFlipX(dx < 0);

        if (this.stateTimer <= 0) {
          this.destroySlamTelegraph();
          this.clearTint();
          if (this.isEnraged) this.axe.setTint(0xff7777); else this.axe.clearTint();
          this.setScale(1.75);
          SoundFX.playGroundSlam();
          this.scene.cameras.main.shake(350, 0.009);

          // Triple Expanding Shockwave Rings
          const shock1 = this.scene.add.circle(this.x, this.y, 30, 0xd97706, 0.7).setDepth(DEPTH.SHADOW + 2);
          this.scene.tweens.add({ targets: shock1, scale: 2.8, alpha: 0, duration: 380, onComplete: () => shock1.destroy() });
          const shock2 = this.scene.add.circle(this.x, this.y, 20, 0xef4444, 0.85).setDepth(DEPTH.SHADOW + 3);
          this.scene.tweens.add({ targets: shock2, scale: 3.6, alpha: 0, duration: 420, onComplete: () => shock2.destroy() });
          const shock3 = this.scene.add.circle(this.x, this.y, 10).setStrokeStyle(3, 0xfacc15, 1).setDepth(DEPTH.SHADOW + 4);
          this.scene.tweens.add({ targets: shock3, scale: 7.5, alpha: 0, duration: 320, onComplete: () => shock3.destroy() });

          // Flying Rock Debris Particles
          for (let i = 0; i < 10; i++) {
            const col = [0x78350f, 0x451a03, 0x94a3b8, 0xd97706][i % 4];
            const rk = this.scene.add.rectangle(this.x, this.y - 6, 4 + (i % 3), 4 + (i % 3), col, 1).setDepth(DEPTH.YSORT_BASE + this.y + 5);
            const ang = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 90;
            this.scene.tweens.add({
              targets: rk,
              x: this.x + Math.cos(ang) * spd,
              y: this.y + Math.sin(ang) * spd * 0.7 + 10,
              alpha: 0,
              rotation: (Math.random() - 0.5) * 6,
              duration: 350,
              onComplete: () => rk.destroy(),
            });
          }

          // Melee Area Slam Damage (2 damage in 80px radius) - NO magic projectiles!
          if (dist <= 80) {
            output.landedMelee = true;
          }

          this.orcState = 'recovery';
          this.stateTimer = 400;
        }
        break;
      }

      case 'storm_windup': {
        this.stateTimer -= delta;
        body.setVelocity(0, 0);
        this.setFlipX(dx < 0);

        if (this.stateTimer <= 0) {
          this.clearTint();
          if (this.isEnraged) this.axe.setTint(0xff7777); else this.axe.clearTint();
          this.setScale(1.75);
          this.orcState = 'recovery';
          this.stateTimer = 350;
        }
        break;
      }

      case 'charge_windup': {
        this.stateTimer -= delta;
        body.setVelocity(0, 0);
        this.setFlipX(dx < 0);

        if (this.stateTimer <= 0) {
          this.clearTint();
          if (this.isEnraged) this.axe.setTint(0xff7777); else this.axe.clearTint();
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

    // Update Axe Positioning & Layering (Behind / side in regular state so model is 100% visible)
    let axeOffsetX = this.flipX ? -24 : 24;
    let axeOffsetY = -6;
    let axeDepth = DEPTH.YSORT_BASE + this.y - 1; // Behind / beside boss body
    let axeAngle: number;

    if (this.orcState === 'cleave_windup') {
      axeOffsetX = this.flipX ? 12 : -12;
      axeOffsetY = -22;
      axeDepth = DEPTH.YSORT_BASE + this.y + 2;
      axeAngle = this.flipX ? -80 : 80;
    } else if (this.orcState === 'slam_windup') {
      axeOffsetX = this.flipX ? -8 : 8;
      axeOffsetY = -28; // Raised high above head
      axeDepth = DEPTH.YSORT_BASE + this.y + 2;
      axeAngle = this.flipX ? 75 : -75;
    } else if (this.orcState === 'storm_windup') {
      axeOffsetX = this.flipX ? -4 : 4;
      axeOffsetY = -30; // Pointed straight to heaven
      axeDepth = DEPTH.YSORT_BASE + this.y + 2;
      axeAngle = 0;
    } else if (this.orcState === 'charge_windup' || this.orcState === 'charging') {
      axeOffsetX = this.flipX ? -26 : 26;
      axeOffsetY = -8;
      axeDepth = DEPTH.YSORT_BASE + this.y - 1;
      axeAngle = this.flipX ? -45 : 45;
    } else {
      // Idle / chase / recovery gentle bob
      const bob = Math.sin(this.scene.time.now * 0.007) * 10;
      axeAngle = (this.flipX ? -15 : 15) + (this.flipX ? -bob : bob);
    }

    this.axe.setPosition(this.x + axeOffsetX, this.y + axeOffsetY);
    this.axe.setFlipX(this.flipX);
    this.axe.setDepth(axeDepth);
    this.axe.setAngle(axeAngle);

    return output;
  }

  public applyRemoteState(x: number, y: number, anim: BossAnimState, flipX: boolean, hp: number, phase: 1 | 2): void {
    this.netTargetX = x;
    this.netTargetY = y;
    this.hasNetTarget = true;
    this.setFlipX(flipX);
    this.hp = hp;
    this.phase = phase;

    const axeOffsetX = flipX ? -24 : 24;
    if (this.axe) {
      this.axe.setPosition(this.x + axeOffsetX, this.y - 6);
      this.axe.setFlipX(flipX);
    }

    if (this.animState !== anim) {
      this.animState = anim;
      if (anim === 'idle') this.play(ANIM.BOSS_ORC_IDLE, true);
      else if (anim === 'run') this.play(ANIM.BOSS_ORC_RUN, true);
      else if (anim === 'dead') {
        (this.body as Phaser.Physics.Arcade.Body).enable = false;
        if (this.light) this.light.setVisible(false);
        if (this.axe) this.axe.setVisible(false);
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
    if (this.axe) {
      const axeOffsetX = this.flipX ? -24 : 24;
      this.axe.setPosition(this.x + axeOffsetX, this.y - 6);
      this.axe.setFlipX(this.flipX);
      this.axe.setDepth(DEPTH.YSORT_BASE + this.y - 1);
    }
  }
}
