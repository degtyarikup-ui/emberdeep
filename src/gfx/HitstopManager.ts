import Phaser from 'phaser';

export class HitstopManager {
  private scene: Phaser.Scene;
  private freezeRemaining = 0;
  private slowRemaining = 0;
  private slowFactor = 1.0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Freeze the game for a number of ms. */
  freeze(durationMs: number): void {
    if (durationMs <= this.freezeRemaining) return; // don't shorten existing freeze
    this.freezeRemaining = durationMs;
    this.scene.time.timeScale = 0;
    this.scene.physics.world.timeScale = 100; // effectively pause physics
  }

  /** Slow motion effect: time runs at `factor` speed for `durationMs`. */
  slowMotion(factor: number, durationMs: number): void {
    this.slowRemaining = durationMs;
    this.slowFactor = factor;
    if (this.freezeRemaining <= 0) {
      this.scene.time.timeScale = factor;
      this.scene.physics.world.timeScale = 1 / factor;
    }
  }

  // Presets
  normalHit(): void {
    this.freeze(33); // 2 frames at 60fps
  }

  criticalHit(): void {
    this.freeze(67); // 4 frames
  }

  killHit(): void {
    this.freeze(83);
    // After freeze ends, slow motion kicks in via update
    this.slowMotion(0.3, 200);
  }

  bossPhaseChange(): void {
    this.freeze(150);
  }

  /** Call every real frame (use scene.game.loop.delta, NOT the scaled delta). */
  update(realDelta: number): void {
    if (this.freezeRemaining > 0) {
      this.freezeRemaining -= realDelta;
      if (this.freezeRemaining <= 0) {
        this.freezeRemaining = 0;
        // Resume with slow motion if active, otherwise normal
        if (this.slowRemaining > 0) {
          this.scene.time.timeScale = this.slowFactor;
          this.scene.physics.world.timeScale = 1 / this.slowFactor;
        } else {
          this.scene.time.timeScale = 1;
          this.scene.physics.world.timeScale = 1;
        }
      }
      return;
    }

    if (this.slowRemaining > 0) {
      this.slowRemaining -= realDelta;
      if (this.slowRemaining <= 0) {
        this.slowRemaining = 0;
        this.scene.time.timeScale = 1;
        this.scene.physics.world.timeScale = 1;
      }
    }
  }

  get isFrozen(): boolean {
    return this.freezeRemaining > 0;
  }

  destroy(): void {
    this.scene.time.timeScale = 1;
    this.scene.physics.world.timeScale = 1;
  }
}
