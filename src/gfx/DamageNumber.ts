import Phaser from 'phaser';
import { DEPTH, FONT } from './registry';

export type DamageType = 'normal' | 'crit' | 'fire' | 'lightning' | 'heal' | 'block';

const DAMAGE_COLORS: Record<DamageType, string> = {
  normal: '#d8d0c0',
  crit: '#c8a830',
  fire: '#ff6600',
  lightning: '#00ccff',
  heal: '#44ff44',
  block: '#888888',
};

const DAMAGE_SIZES: Record<DamageType, number> = {
  normal: 9,
  crit: 13,
  fire: 11,
  lightning: 11,
  heal: 11,
  block: 8,
};

const DAMAGE_STROKES: Record<DamageType, string> = {
  normal: '#1a1a1a',
  crit: '#4a3500',
  fire: '#3d1a00',
  lightning: '#002244',
  heal: '#0a2a0a',
  block: '#1a1a1a',
};

export class DamageNumberManager {
  private scene: Phaser.Scene;
  private worldLayer?: Phaser.GameObjects.Layer;

  constructor(scene: Phaser.Scene, worldLayer?: Phaser.GameObjects.Layer) {
    this.scene = scene;
    this.worldLayer = worldLayer;
  }

  spawn(x: number, y: number, amount: number | string, type: DamageType = 'normal'): void {
    const displayText = typeof amount === 'string' ? amount : `${amount}`;
    const size = DAMAGE_SIZES[type];
    const isCrit = type === 'crit';
    
    const text = this.scene.add.text(x + (Math.random() - 0.5) * 8, y, displayText, {
      fontFamily: FONT.UI,
      fontSize: `${size}px`,
      fontStyle: isCrit ? '700' : '400',
      color: DAMAGE_COLORS[type],
    });
    text.setOrigin(0.5, 1);
    text.setStroke(DAMAGE_STROKES[type], isCrit ? 4 : 3);
    text.setDepth(DEPTH.YSORT_BASE + y + 500);
    
    if (this.worldLayer) this.worldLayer.add(text);

    const floatDist = isCrit ? 30 : 20;
    const duration = isCrit ? 800 : 600;

    if (isCrit) {
      // Crit: pop scale then float
      this.scene.tweens.add({
        targets: text,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }

    if (type === 'lightning') {
      // Lightning jitter
      this.scene.tweens.add({
        targets: text,
        x: text.x + 3,
        duration: 30,
        yoyo: true,
        repeat: 4,
      });
    }

    // Float up and fade
    this.scene.tweens.add({
      targets: text,
      y: y - floatDist,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
