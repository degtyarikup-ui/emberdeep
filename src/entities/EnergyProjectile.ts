import Phaser from 'phaser';
import { TEXTURE, DEPTH } from '../gfx/registry';
import { ElementType, ELEMENT_COLORS } from '../combat/ElementalSystem';

export class EnergyProjectile extends Phaser.GameObjects.Sprite {
  damage: number;
  pierce: number;
  element?: ElementType;
  isSupernova: boolean;
  private vx: number;
  private vy: number;
  private lifespan: number;
  private initialLifespan: number;
  private light?: Phaser.GameObjects.Light;
  isDestroyed = false;
  hitEntityIds = new Set<number>();
  private pulsePhase = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angleRad: number,
    damage = 3,
    pierce = 1,
    speed = 340,
    element?: ElementType,
    isSupernova = false
  ) {
    super(scene, x, y, TEXTURE.PROJECTILE_ENERGY);
    this.damage = damage;
    this.pierce = pierce;
    this.element = element;
    this.isSupernova = isSupernova;
    this.vx = Math.cos(angleRad) * speed;
    this.vy = Math.sin(angleRad) * speed;
    this.lifespan = isSupernova ? 1100 : 1400;
    this.initialLifespan = this.lifespan;

    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setRotation(angleRad);
    this.setDepth(DEPTH.YSORT_BASE + y + 50);
    this.setPipeline('Light2D');

    if (element && ELEMENT_COLORS[element]) {
      this.setTint(parseInt(ELEMENT_COLORS[element].replace('#', '0x'), 16));
    } else if (isSupernova) {
      this.setTint(0xf0abfc); // Vibrant Fuchsia/Purple for Supernova
      this.setScale(1.3);
    } else {
      this.setTint(0xc084fc); // Mystic Arcane Violet
      this.setScale(1.0);
    }

    if (scene.lights && scene.lights.active) {
      const lightColor = element
        ? parseInt(ELEMENT_COLORS[element].replace('#', '0x'), 16)
        : isSupernova
        ? 0xf472b6
        : 0xa855f7;
      this.light = scene.lights.addLight(x, y, isSupernova ? 90 : 70, lightColor, 0.85);
    }
  }

  update(delta: number): boolean {
    if (this.isDestroyed) return false;
    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.setDepth(DEPTH.YSORT_BASE + this.y + 50);

    // Magical energy pulse & spinning
    this.rotation += 6.0 * dt;
    this.pulsePhase += 12 * dt;
    const baseScale = this.isSupernova ? 1.25 : 1.0;
    const scalePulse = baseScale + Math.sin(this.pulsePhase) * 0.15;
    this.setScale(scalePulse);

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
