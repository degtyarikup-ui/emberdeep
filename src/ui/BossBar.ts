import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { BossEnemy } from '../entities/BossEnemy';

export class BossBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private barFill: Phaser.GameObjects.Rectangle;
  private barGhost: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private phaseText: Phaser.GameObjects.Text;
  private skullLeft: Phaser.GameObjects.Sprite;
  private skullRight: Phaser.GameObjects.Sprite;
  private outerFrame: Phaser.GameObjects.Rectangle;

  private totalWidth = 320;
  private barHeight = 14;
  private isVisible = false;
  private lastPhase = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;

    this.container = scene.add.container(w / 2, -60);
    this.container.setDepth(DEPTH.UI + 50);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    // 1. Frame Background
    this.outerFrame = scene.add.rectangle(0, 0, this.totalWidth + 16, 36, 0x090d16, 0.95);
    this.outerFrame.setStrokeStyle(2, 0x991b1b, 0.95);
    this.container.add(this.outerFrame);

    const innerPlate = scene.add.rectangle(0, 0, this.totalWidth + 10, 30, 0x1f1622, 0.6);
    innerPlate.setStrokeStyle(1, 0xd97706, 0.5);
    this.container.add(innerPlate);

    // 2. Boss Title
    this.titleText = scene.add.text(0, -9, 'АРХИДЕМОН БЕЗДНЫ', {
      fontFamily: FONT.TITLE,
      fontSize: '11px',
      fontStyle: '700',
      color: '#f87171',
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.titleText.setStroke('#450a0a', 3);
    this.container.add(this.titleText);

    // 3. Phase Subtitle
    this.phaseText = scene.add.text(0, -18, 'ФАЗА I', {
      fontFamily: FONT.UI,
      fontSize: '8px',
      fontStyle: '700',
      color: '#fbbf24',
    });
    this.phaseText.setOrigin(0.5, 0.5);
    this.phaseText.setStroke('#000000', 3);
    this.container.add(this.phaseText);

    // 4. Bar Cavity
    const barY = 6;
    const cavity = scene.add.rectangle(0, barY, this.totalWidth, this.barHeight, 0x020617);
    cavity.setStrokeStyle(1, 0x334155);
    this.container.add(cavity);

    // 5. Ghost Bar
    this.barGhost = scene.add.rectangle(-this.totalWidth / 2, barY - this.barHeight / 2, this.totalWidth, this.barHeight, 0xf59e0b, 0.85);
    this.barGhost.setOrigin(0, 0);
    this.container.add(this.barGhost);

    // 6. Active HP Fill
    this.barFill = scene.add.rectangle(-this.totalWidth / 2, barY - this.barHeight / 2, this.totalWidth, this.barHeight, 0xdc2626);
    this.barFill.setOrigin(0, 0);
    this.container.add(this.barFill);

    // 7. Golden Demon Skulls on ends
    this.skullLeft = scene.add.sprite(-this.totalWidth / 2 - 14, 0, TEXTURE.UI_SKULL_ORNAMENT);
    this.skullLeft.setScale(1.1);

    this.skullRight = scene.add.sprite(this.totalWidth / 2 + 14, 0, TEXTURE.UI_SKULL_ORNAMENT);
    this.skullRight.setScale(1.1);
    this.skullRight.setFlipX(true);

    this.container.add([this.skullLeft, this.skullRight]);

    scene.cameras.main.ignore(this.container);
  }

  public show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.container.setVisible(true);
    this.container.setY(-60);

    this.scene.tweens.add({
      targets: this.container,
      y: 32,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  public hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    this.scene.tweens.add({
      targets: this.container,
      y: -60,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
        this.container.setAlpha(1);
      },
    });
  }

  public update(boss: BossEnemy): void {
    if (!boss || !boss.active || boss.isDead) {
      if (this.isVisible) this.hide();
      return;
    }

    if (!this.isVisible) this.show();

    const hpRatio = Math.max(0, Math.min(1, boss.currentHp / boss.maxHp));
    const targetW = Math.round(this.totalWidth * hpRatio);

    this.barFill.width = targetW;

    // Ghost Bar lags smoothly
    if (this.barGhost.width > targetW) {
      this.barGhost.width += (targetW - this.barGhost.width) * 0.08;
    } else {
      this.barGhost.width = targetW;
    }

    // Phase update
    if (boss.currentPhase !== this.lastPhase) {
      this.lastPhase = boss.currentPhase;
      if (this.lastPhase === 2) {
        this.phaseText.setText('ФАЗА II: ЯРОСТЬ БЕЗДНЫ');
        this.phaseText.setColor('#ef4444');
        this.outerFrame.setStrokeStyle(2.5, 0xef4444);

        // Pulsating glow on phase 2
        this.scene.tweens.add({
          targets: this.outerFrame,
          scaleX: 1.02,
          scaleY: 1.05,
          duration: 350,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  public handleResize(width: number): void {
    this.container.setX(width / 2);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
