import Phaser from 'phaser';

export interface ShakeConfig {
  intensity: number;    // pixels
  duration: number;     // ms
  directional?: boolean; // if true, shakes along a specific angle
  angle?: number;       // radians, used when directional is true
  decay?: boolean;      // if true, intensity decays over duration (default: true)
}

export class ScreenShake {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private shakeQueue: { remaining: number; config: ShakeConfig }[] = [];

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    this.camera = camera;
  }

  /** Add a shake to the queue. Multiple shakes stack (strongest wins). */
  shake(config: ShakeConfig): void {
    this.shakeQueue.push({ remaining: config.duration, config });
  }

  // Preset shakes
  lightHit(): void {
    this.shake({ intensity: 1, duration: 50 });
  }

  critHit(): void {
    this.shake({ intensity: 3, duration: 80, directional: true, angle: 0 });
  }
  
  critHitDirectional(angle: number): void {
    this.shake({ intensity: 3, duration: 80, directional: true, angle });
  }

  playerDamage(): void {
    this.shake({ intensity: 2, duration: 100 });
  }

  bossSlam(): void {
    this.shake({ intensity: 5, duration: 300 });
  }

  bossPhaseChange(): void {
    this.shake({ intensity: 4, duration: 500 });
  }

  destruction(): void {
    this.shake({ intensity: 2, duration: 60 });
  }

  explosion(): void {
    this.shake({ intensity: 4, duration: 150 });
  }

  /** Call every frame from scene update. */
  update(delta: number): void {
    if (this.shakeQueue.length === 0) return;

    let maxOffsetX = 0;
    let maxOffsetY = 0;

    for (let i = this.shakeQueue.length - 1; i >= 0; i--) {
      const entry = this.shakeQueue[i];
      entry.remaining -= delta;
      
      if (entry.remaining <= 0) {
        this.shakeQueue.splice(i, 1);
        continue;
      }

      const { config } = entry;
      const decay = config.decay !== false;
      const progress = entry.remaining / config.duration;
      const intensity = decay ? config.intensity * progress : config.intensity;

      let ox: number, oy: number;
      if (config.directional && config.angle !== undefined) {
        const rand = (Math.random() - 0.5) * 2;
        ox = Math.cos(config.angle) * intensity * rand;
        oy = Math.sin(config.angle) * intensity * rand;
      } else {
        ox = (Math.random() - 0.5) * 2 * intensity;
        oy = (Math.random() - 0.5) * 2 * intensity;
      }

      if (Math.abs(ox) > Math.abs(maxOffsetX)) maxOffsetX = ox;
      if (Math.abs(oy) > Math.abs(maxOffsetY)) maxOffsetY = oy;
    }

    // Apply via Phaser camera scroll offset
    // We use followOffset so it doesn't fight with camera.startFollow
    this.camera.setFollowOffset(
      -Math.round(maxOffsetX),
      -Math.round(maxOffsetY)
    );

    if (this.shakeQueue.length === 0) {
      this.camera.setFollowOffset(0, 0);
    }
  }

  destroy(): void {
    this.shakeQueue = [];
    this.camera.setFollowOffset(0, 0);
  }
}
