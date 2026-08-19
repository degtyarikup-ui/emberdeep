import Phaser from 'phaser';
import { ACHIEVEMENTS } from './registry';
import { AchievementDef } from './types';
import { SoundFX } from '../audio/SoundFX';
import { DEPTH, FONT } from '../gfx/registry';

const STORAGE_KEY = 'emberdeep_achievements';

interface ActiveNotification {
  container: Phaser.GameObjects.Container;
  targetY: number;
}

export class AchievementManager {
  private static instance?: AchievementManager;
  private unlocked: Set<string> = new Set();
  private notifications: ActiveNotification[] = [];

  // Lifetime / Session Counters
  cratesBroken = 0;
  enemiesKilled = 0;
  coinsCollected = 0;

  constructor() {
    this.load();
  }

  static get(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
  }

  private load(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.unlocked = new Set(parsed);
        }
      }
    } catch {
      // Storage unavailable
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.unlocked)));
    } catch {
      // Storage unavailable
    }
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }

  unlock(id: string, scene: Phaser.Scene): boolean {
    if (this.unlocked.has(id)) return false;
    const def = ACHIEVEMENTS[id];
    if (!def) return false;

    this.unlocked.add(id);
    this.save();

    SoundFX.playAchievementUnlocked();
    this.showNotification(def, scene);
    return true;
  }

  private showNotification(def: AchievementDef, scene: Phaser.Scene): void {
    const w = 240;
    const h = 48;
    const rightMargin = 16;
    const startY = 85;
    const spacing = 54;

    const targetY = startY + this.notifications.length * spacing;
    const targetX = scene.scale.width - rightMargin - w / 2;
    const startX = scene.scale.width + w / 2 + 10;

    const container = scene.add.container(startX, targetY);
    container.setDepth(DEPTH.UI + 200);

    // Glowing background card
    const cardBg = scene.add.rectangle(0, 0, w, h, 0x0c0a14, 0.95);
    const borderColor = Phaser.Display.Color.HexStringToColor(def.color).color;
    cardBg.setStrokeStyle(2, borderColor);

    // Left Icon slot
    const iconSlot = scene.add.rectangle(-w / 2 + 24, 0, 32, 32, 0x1a1528, 1);
    iconSlot.setStrokeStyle(1, borderColor);

    const icon = scene.add.sprite(-w / 2 + 24, 0, def.iconTexture, def.iconFrame);
    icon.setScale(1.1);

    // Header badge
    const header = scene.add.text(-w / 2 + 46, -15, 'ДОСТИЖЕНИЕ ПОЛУЧЕНО', {
      fontFamily: FONT.UI,
      fontSize: '8px',
      fontStyle: '700',
      color: '#fbbf24',
    });
    header.setStroke('#000000', 3);

    // Title
    const title = scene.add.text(-w / 2 + 46, -4, def.title, {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#ffffff',
    });
    title.setStroke('#000000', 3);

    // Description
    const desc = scene.add.text(-w / 2 + 46, 9, def.desc, {
      fontFamily: FONT.UI,
      fontSize: '8.5px',
      color: '#cbd5e1',
    });
    desc.setStroke('#000000', 3);

    container.add([cardBg, iconSlot, icon, header, title, desc]);

    // Ignore world camera so UI camera renders it
    const cameras = scene.cameras.cameras;
    if (cameras.length > 0) {
      cameras[0].ignore(container);
    }

    const item: ActiveNotification = { container, targetY };
    this.notifications.push(item);

    // Slide-in animation with bounce
    scene.tweens.add({
      targets: container,
      x: targetX,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Shimmer / pulse
        scene.tweens.add({
          targets: cardBg,
          alpha: 0.85,
          duration: 700,
          yoyo: true,
          repeat: 4,
        });

        // Stay on screen for 6.5s, then slide out
        scene.time.delayedCall(6500, () => {
          scene.tweens.add({
            targets: container,
            x: startX,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeIn',
            onComplete: () => {
              container.destroy();
              const idx = this.notifications.indexOf(item);
              if (idx !== -1) {
                this.notifications.splice(idx, 1);
                this.reflow(scene);
              }
            },
          });
        });
      },
    });
  }

  private reflow(scene: Phaser.Scene): void {
    const startY = 85;
    const spacing = 54;
    this.notifications.forEach((notif, index) => {
      const nextY = startY + index * spacing;
      if (notif.targetY !== nextY) {
        notif.targetY = nextY;
        scene.tweens.add({
          targets: notif.container,
          y: nextY,
          duration: 200,
          ease: 'Quad.easeOut',
        });
      }
    });
  }
}
