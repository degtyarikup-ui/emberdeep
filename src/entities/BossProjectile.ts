import Phaser from 'phaser';
import { DEPTH, TEXTURE } from '../gfx/registry';

export class BossProjectile extends Phaser.GameObjects.Sprite {
  readonly damage: number;
  private vx: number;
  private vy: number;
  private lifetime: number;
  private maxLifetime = 4500;
  private destroyed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number, speed = 120, damage = 1) {
    super(scene, x, y, TEXTURE.SKULL);
    this.damage = damage;
    this.lifetime = 0;

    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setScale(1.1);
    this.setPipeline('Light2D');
    this.setDepth(DEPTH.YSORT_BASE + y + 50);

    // Glowing red pulse
    this.setTint(0xff5555);
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  update(delta: number): boolean {
    if (this.destroyed) return false;
    this.lifetime += delta;
    if (this.lifetime >= this.maxLifetime) {
      this.destroyProjectile();
      return false;
    }

    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += 8 * dt;
    this.setDepth(DEPTH.YSORT_BASE + this.y + 50);

    return true;
  }

  destroyProjectile(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.tweens.add({
      targets: this,
      scale: 1.6,
      alpha: 0,
      duration: 140,
      onComplete: () => this.destroy(),
    });
  }
}
