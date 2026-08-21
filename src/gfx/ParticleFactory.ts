import Phaser from 'phaser';
import { DEPTH, TEXTURE } from './registry';

export class ParticleFactory {
  private scene: Phaser.Scene;
  private worldLayer?: Phaser.GameObjects.Layer;

  public hitSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  public bloodSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  public boneSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  public woodSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  public fireSpark!: Phaser.GameObjects.Particles.ParticleEmitter;
  public dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  public smokeEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  public leafEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, worldLayer?: Phaser.GameObjects.Layer, worldH = 1216) {
    this.scene = scene;
    this.worldLayer = worldLayer;

    this.initEmitters(worldH);
  }

  private initEmitters(worldH: number): void {
    // 1. Melee Hit Spark
    this.hitSpark = this.scene.add.particles(0, 0, TEXTURE.PARTICLE_SPARK, {
      lifespan: 260,
      speed: { min: 40, max: 120 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.95, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.hitSpark.setDepth(DEPTH.YSORT_BASE + worldH + 10);

    // 2. Blood Droplets
    this.bloodSpark = this.scene.add.particles(0, 0, TEXTURE.PARTICLE_BLOOD, {
      lifespan: { min: 220, max: 420 },
      speed: { min: 60, max: 190 },
      scale: { start: 1.4, end: 0.2 },
      alpha: { start: 1, end: 0 },
      gravityY: 170,
      emitting: false,
    });
    this.bloodSpark.setDepth(DEPTH.YSORT_BASE + worldH + 12);

    // 3. Bone Fragments
    this.boneSpark = this.scene.add.particles(0, 0, TEXTURE.PARTICLE_BONE, {
      lifespan: { min: 220, max: 450 },
      speed: { min: 50, max: 160 },
      scale: { start: 1.2, end: 0.25 },
      alpha: { start: 1, end: 0 },
      rotate: { start: 0, end: 360 },
      gravityY: 180,
      emitting: false,
    });
    this.boneSpark.setDepth(DEPTH.YSORT_BASE + worldH + 12);

    // 4. Wood Splinters
    this.woodSpark = this.scene.add.particles(0, 0, TEXTURE.PARTICLE_WOOD, {
      lifespan: { min: 220, max: 460 },
      speed: { min: 60, max: 190 },
      scale: { start: 1.3, end: 0.25 },
      alpha: { start: 1, end: 0 },
      rotate: { start: 0, end: 360 },
      gravityY: 190,
      emitting: false,
    });
    this.woodSpark.setDepth(DEPTH.YSORT_BASE + worldH + 12);

    // 5. Fire / Explosion Sparks
    this.fireSpark = this.scene.add.particles(0, 0, TEXTURE.PARTICLE_SPARK, {
      lifespan: { min: 250, max: 480 },
      speed: { min: 60, max: 190 },
      scale: { start: 2.0, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xcc3800, 0xcc7000, 0xccaa00],
      blendMode: 'ADD',
      emitting: false,
    });
    this.fireSpark.setDepth(DEPTH.YSORT_BASE + worldH + 15);

    // 6. Running / Dash Dust
    this.dustEmitter = this.scene.add.particles(0, 0, TEXTURE.PARTICLE_DUST, {
      lifespan: { min: 200, max: 350 },
      speed: { min: 10, max: 35 },
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      gravityY: -10,
      emitting: false,
    });
    this.dustEmitter.setDepth(DEPTH.YSORT_BASE + 5);

    // 7. Smoke (Bonfires, Torches, Destruction)
    this.smokeEmitter = this.scene.add.particles(0, 0, TEXTURE.PARTICLE_SMOKE, {
      lifespan: { min: 800, max: 1400 },
      speedY: { min: -25, max: -10 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.8, end: 2.2 },
      alpha: { start: 0.4, end: 0 },
      emitting: false,
    });
    this.smokeEmitter.setDepth(DEPTH.YSORT_BASE + worldH + 8);

    // 8. Vegetation Leaves (Bushes, Trees)
    this.leafEmitter = this.scene.add.particles(0, 0, TEXTURE.PARTICLE_LEAF, {
      lifespan: { min: 400, max: 700 },
      speed: { min: 25, max: 65 },
      scale: { start: 1.1, end: 0.4 },
      alpha: { start: 0.9, end: 0 },
      rotate: { start: 0, end: 360 },
      gravityY: 60,
      emitting: false,
    });
    this.leafEmitter.setDepth(DEPTH.YSORT_BASE + worldH + 9);

    if (this.worldLayer) {
      this.worldLayer.add(this.hitSpark);
      this.worldLayer.add(this.bloodSpark);
      this.worldLayer.add(this.boneSpark);
      this.worldLayer.add(this.woodSpark);
      this.worldLayer.add(this.fireSpark);
      this.worldLayer.add(this.dustEmitter);
      this.worldLayer.add(this.smokeEmitter);
      this.worldLayer.add(this.leafEmitter);
    }
  }

  spawnFootstepDust(x: number, y: number, tint = 0x7a7060, count = 2): void {
    this.dustEmitter.setParticleTint(tint);
    this.dustEmitter.emitParticleAt(x, y, count);
  }

  spawnDashBurst(x: number, y: number, tint = 0x7a7060, count = 6): void {
    this.dustEmitter.setParticleTint(tint);
    this.dustEmitter.emitParticleAt(x, y, count);
  }

  spawnHitSparks(x: number, y: number, count = 6): void {
    this.hitSpark.emitParticleAt(x, y, count);
  }

  spawnBloodSpurt(x: number, y: number, count = 8): void {
    this.bloodSpark.emitParticleAt(x, y, count);
  }

  spawnBoneExplosion(x: number, y: number, count = 10): void {
    this.boneSpark.emitParticleAt(x, y, count);
  }

  spawnWoodSplinters(x: number, y: number, count = 8): void {
    this.woodSpark.emitParticleAt(x, y, count);
  }

  spawnFireBurst(x: number, y: number, count = 8): void {
    this.fireSpark.emitParticleAt(x, y, count);
  }

  spawnBushRustle(x: number, y: number, count = 4): void {
    this.leafEmitter.emitParticleAt(x, y - 6, count);
  }

  spawnSmokePuff(x: number, y: number, count = 3): void {
    this.smokeEmitter.emitParticleAt(x, y, count);
  }

  spawnSmoke(x: number, y: number): void {
    this.smokeEmitter.emitParticleAt(x, y, 1);
  }

  spawnSpark(x: number, y: number): void {
    this.fireSpark.emitParticleAt(x, y, 1);
  }
}
