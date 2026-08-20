import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { HeroClass, Player } from '../entities/Player';
import { MetaManager } from '../meta/MetaManager';

export class HeroFrame {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private portraitSprite: Phaser.GameObjects.Sprite;
  private hpBarFill: Phaser.GameObjects.Rectangle;
  private hpBarGhost: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private goldText: Phaser.GameObjects.Text;
  private embersText: Phaser.GameObjects.Text;
  private classNameText: Phaser.GameObjects.Text;
  private heartsContainer: Phaser.GameObjects.Container;

  private currentHp = 3;
  private maxHp = 3;
  private maxBarWidth = 120;

  constructor(scene: Phaser.Scene, heroClass: HeroClass) {
    this.scene = scene;
    this.container = scene.add.container(20, 20);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);

    // 1. Outer Ornate Background Plate
    const panelBg = scene.add.rectangle(0, 0, 220, 56, 0x0f172a, 0.92);
    panelBg.setOrigin(0, 0);
    panelBg.setStrokeStyle(2, 0xd97706, 0.95);
    this.container.add(panelBg);

    const innerBevel = scene.add.rectangle(3, 3, 214, 50, 0x1e293b, 0.4);
    innerBevel.setOrigin(0, 0);
    innerBevel.setStrokeStyle(1, 0xfbbf24, 0.3);
    this.container.add(innerBevel);

    // 2. Hero Portrait (36x36 frame with 32x32 sprite)
    const portraitBg = scene.add.rectangle(6, 6, 44, 44, 0x05070d);
    portraitBg.setOrigin(0, 0);
    portraitBg.setStrokeStyle(2, 0xf59e0b);
    this.container.add(portraitBg);

    const portraitTex = heroClass === 'ranger' ? TEXTURE.UI_HERO_PORTRAIT_RANGER : TEXTURE.UI_HERO_PORTRAIT_KNIGHT;
    this.portraitSprite = scene.add.sprite(28, 28, portraitTex);
    this.portraitSprite.setScale(1.2);
    this.container.add(this.portraitSprite);

    // Idle breathing on portrait
    scene.tweens.add({
      targets: this.portraitSprite,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. Class Name Title
    const classLabel = heroClass === 'ranger' ? 'ЛУЧНИЦА ТЕНЕЙ' : 'РЫЦАРЬ ГОРНА';
    this.classNameText = scene.add.text(58, 6, classLabel, {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: heroClass === 'ranger' ? '#4ade80' : '#38bdf8',
    });
    this.classNameText.setStroke('#000000', 3);
    this.container.add(this.classNameText);

    // 4. Health Bar (Ghost Bar + Active Fill)
    const barX = 58;
    const barY = 22;
    const barH = 12;

    const hpCavity = scene.add.rectangle(barX, barY, this.maxBarWidth, barH, 0x020617);
    hpCavity.setOrigin(0, 0);
    hpCavity.setStrokeStyle(1, 0x334155);
    this.container.add(hpCavity);

    // Ghost Bar (damage trail)
    this.hpBarGhost = scene.add.rectangle(barX, barY, this.maxBarWidth, barH, 0xfbbf24, 0.85);
    this.hpBarGhost.setOrigin(0, 0);
    this.container.add(this.hpBarGhost);

    // Main Red HP Fill
    this.hpBarFill = scene.add.rectangle(barX, barY, this.maxBarWidth, barH, 0xdc2626);
    this.hpBarFill.setOrigin(0, 0);
    this.container.add(this.hpBarFill);

    // HP Text Numbers
    this.hpText = scene.add.text(barX + this.maxBarWidth / 2, barY + barH / 2, '3 / 3', {
      fontFamily: FONT.UI,
      fontSize: '9px',
      fontStyle: '700',
      color: '#ffffff',
    });
    this.hpText.setOrigin(0.5, 0.5);
    this.hpText.setStroke('#000000', 3);
    this.container.add(this.hpText);

    // 5. Hearts overlay container
    this.heartsContainer = scene.add.container(barX + this.maxBarWidth + 6, barY);
    this.container.add(this.heartsContainer);

    // 6. Resources Row: Gold & Embers
    const resY = 38;

    // Gold
    const goldIcon = scene.add.sprite(barX + 6, resY + 6, TEXTURE.PROPS, 'coin');
    goldIcon.setScale(1.1);
    this.container.add(goldIcon);

    this.goldText = scene.add.text(barX + 16, resY, '0', {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#fbbf24',
    });
    this.goldText.setStroke('#451a03', 3);
    this.container.add(this.goldText);

    // Embers
    const emberIcon = scene.add.sprite(barX + 64, resY + 6, TEXTURE.UI_EMBER_ICON);
    emberIcon.setScale(0.9);
    this.container.add(emberIcon);

    const embersCount = MetaManager.get().embers;
    this.embersText = scene.add.text(barX + 76, resY, `${embersCount}`, {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#f97316',
    });
    this.embersText.setStroke('#431407', 3);
    this.container.add(this.embersText);

    // Ignore world camera
    scene.cameras.main.ignore(this.container);
  }

  public update(player: Player): void {
    this.currentHp = player.hp;
    this.maxHp = player.maxHp;

    const ratio = Math.max(0, Math.min(1, this.currentHp / this.maxHp));
    const targetW = Math.round(this.maxBarWidth * ratio);

    // Smooth lerp main bar
    this.hpBarFill.width = targetW;

    // Ghost bar lags behind smoothly
    if (this.hpBarGhost.width > targetW) {
      this.hpBarGhost.width += (targetW - this.hpBarGhost.width) * 0.08;
    } else {
      this.hpBarGhost.width = targetW;
    }

    this.hpText.setText(`${this.currentHp} / ${this.maxHp}`);

    // Pulse red when low HP
    if (this.currentHp <= 1) {
      this.hpBarFill.fillColor = 0xff0000;
    } else {
      this.hpBarFill.fillColor = 0xdc2626;
    }

    // Update gold
    this.goldText.setText(`${player.gold}`);

    // Update embers
    this.embersText.setText(`${MetaManager.get().embers}`);
  }

  public triggerGoldBump(): void {
    this.scene.tweens.add({
      targets: this.goldText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  public setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
