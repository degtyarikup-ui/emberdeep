import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { BossEnemy } from '../entities/BossEnemy';
import { PixelUI } from '../gfx/PixelUI';

export class BossBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private barFill: Phaser.GameObjects.Rectangle;
  private barGhost: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private titleText: Phaser.GameObjects.Text;
  private phaseText: Phaser.GameObjects.Text;
  private skullLeft: Phaser.GameObjects.Sprite;
  private skullRight: Phaser.GameObjects.Sprite;
  private outerFrame: Phaser.GameObjects.NineSlice;

  private totalWidth = 340;
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

    // 1. 9-slice Stone Panel Frame
    this.outerFrame = PixelUI.createPanel(scene, 0, 0, this.totalWidth + 40, 48);
    this.container.add(this.outerFrame);

    // 2. Boss Title
    this.titleText = scene.add.text(0, -12, 'АРХИДЕМОН БЕЗДНЫ', {
      fontFamily: FONT.TITLE,
      fontSize: '13px',
      fontStyle: '700',
      color: '#f87171',
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.titleText.setStroke('#450a0a', 4);
    this.titleText.setShadow(0, 1, '#000000', 2, true, true);
    this.container.add(this.titleText);

    // 3. Phase Subtitle
    this.phaseText = scene.add.text(0, -22, 'ФАЗА I: СТРАЖ ПЕЧАТИ', {
      fontFamily: FONT.UI,
      fontSize: '8px',
      fontStyle: '700',
      color: '#fbbf24',
    });
    this.phaseText.setOrigin(0.5, 0.5);
    this.phaseText.setStroke('#000000', 3);
    this.container.add(this.phaseText);

    // 4. Bar Cavity
    const barY = 8;
    const cavity = scene.add.rectangle(0, barY, this.totalWidth, this.barHeight, 0x050811);
    cavity.setStrokeStyle(1.5, 0x334155);
    this.container.add(cavity);

    // 5. Ghost Damage Bar (Golden Amber)
    this.barGhost = scene.add.rectangle(-this.totalWidth / 2, barY - this.barHeight / 2, this.totalWidth, this.barHeight, 0xf59e0b);
    this.barGhost.setOrigin(0, 0);
    this.container.add(this.barGhost);

    // 6. Active HP Fill (Ruby Crimson)
    this.barFill = scene.add.rectangle(-this.totalWidth / 2, barY - this.barHeight / 2, this.totalWidth, this.barHeight, 0xdc2626);
    this.barFill.setOrigin(0, 0);
    this.container.add(this.barFill);

    // Top Gloss Highlight
    const gloss = scene.add.rectangle(-this.totalWidth / 2, barY - this.barHeight / 2 + 1, this.totalWidth, 2, 0xffffff, 0.35);
    gloss.setOrigin(0, 0);
    this.container.add(gloss);

    // HP Text Numbers
    this.hpText = scene.add.text(0, barY, '', {
      fontFamily: FONT.UI,
      fontSize: '10px',
      fontStyle: '700',
      color: '#ffffff',
    });
    this.hpText.setOrigin(0.5, 0.5);
    this.hpText.setStroke('#000000', 3);
    this.container.add(this.hpText);

    // 7. Golden Demon Skulls on ends
    this.skullLeft = scene.add.sprite(-this.totalWidth / 2 - 12, 0, TEXTURE.UI_SKULL_ORNAMENT);
    this.skullLeft.setScale(1.2);

    this.skullRight = scene.add.sprite(this.totalWidth / 2 + 12, 0, TEXTURE.UI_SKULL_ORNAMENT);
    this.skullRight.setScale(1.2);
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
      y: 36,
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
    this.hpText.setText(`${boss.currentHp} / ${boss.maxHp} HP`);

    if (this.barGhost.width > targetW) {
      this.barGhost.width += (targetW - this.barGhost.width) * 0.08;
    } else {
      this.barGhost.width = targetW;
    }

    if (boss.currentPhase !== this.lastPhase) {
      this.lastPhase = boss.currentPhase;
      if (this.lastPhase === 2) {
        this.phaseText.setText('⚡ ФАЗА II: ЯРОСТЬ БЕЗДНЫ ⚡');
        this.phaseText.setColor('#ef4444');
        this.titleText.setColor('#fb923c');

        this.scene.tweens.add({
          targets: this.outerFrame,
          scaleX: 1.03,
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
