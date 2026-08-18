import Phaser from 'phaser';
import { TEXTURE, DEPTH } from '../gfx/registry';

export class ArrowProjectile extends Phaser.GameObjects.Sprite {
  damage: number;
  pierce: number;
  private vx: number;
  private vy: number;
  private lifespan = 1300;
  private light?: Phaser.GameObjects.Light;
  isDestroyed = false;
  hitEntityIds = new Set<number>();

  constructor(scene: Phaser.Scene, x: number, y: number, angleRad: number, damage = 2, pierce = 1, speed = 310) {
    super(scene, x, y, TEXTURE.ARROW);
    this.damage = damage;
    this.pierce = pierce;
    this.vx = Math.cos(angleRad) * speed;
    this.vy = Math.sin(angleRad) * speed;

    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setRotation(angleRad);
    this.setDepth(DEPTH.YSORT_BASE + y + 50);
    this.setPipeline('Light2D');

    if (pierce > 1) {
      this.setTint(0xf97316); // Fiery tint for special volley
      this.setScale(1.2);
    } else {
      this.setScale(1.0);
    }

    if (scene.lights && scene.lights.active) {
      this.light = scene.lights.addLight(x, y, 60, pierce > 1 ? 0xf97316 : 0xfef08a, 0.65);
    }
  }

  update(delta: number): boolean {
    if (this.isDestroyed) return false;
    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.setDepth(DEPTH.YSORT_BASE + this.y + 50);

    if (this.light) {
      this.light.x = this.x;
      this.light.y = this.y;
    }

    this.lifespan -= delta;
    if (this.lifespan <= 0) {
      this.destroyProjectile();
      return false;
    }

    return true;
  }

  destroyProjectile(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    if (this.light && this.scene && this.scene.lights) {
      this.scene.lights.removeLight(this.light);
      this.light = undefined;
    }
    this.destroy();
  }
}
