import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { HeroClass, Player } from '../entities/Player';
import { MetaManager } from '../meta/MetaManager';
import { PixelUI, PIXEL_UI_TEXTURE } from '../gfx/PixelUI';

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

  private currentHp = 3;
  private maxHp = 3;
  private maxBarWidth = 160;

  constructor(scene: Phaser.Scene, heroClass: HeroClass) {
    this.scene = scene;
    this.container = scene.add.container(20, 20);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);

    const frameW = 260;
    const frameH = 76;

    // 1. Chunky 9-slice Stone & Iron Panel
    const panel = PixelUI.createPanel(scene, frameW / 2, frameH / 2, frameW, frameH);
    this.container.add(panel);

    // 2. Beveled Inset Portrait Frame (48x48)
    const portraitSlot = PixelUI.createSlot(scene, 32, frameH / 2, 48, 'legendary');
    this.container.add(portraitSlot);

    const portraitTex =
      heroClass === 'wizard'
        ? TEXTURE.UI_HERO_PORTRAIT_WIZARD
        : heroClass === 'ranger'
        ? TEXTURE.UI_HERO_PORTRAIT_RANGER
        : TEXTURE.UI_HERO_PORTRAIT_KNIGHT;
    this.portraitSprite = scene.add.sprite(32, frameH / 2, portraitTex);
    this.portraitSprite.setScale(1.15);
    this.container.add(this.portraitSprite);

    // Idle breathing on portrait
    scene.tweens.add({
      targets: this.portraitSprite,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. Class Name Title (Crisp, High-Contrast 13px)
    const isRanger = heroClass === 'ranger';
    const isWizard = heroClass === 'wizard';
    const classLabel = isWizard ? 'ВОЛШЕБНИК ЭФИРА' : isRanger ? 'ЛУЧНИЦА ТЕНЕЙ' : 'РЫЦАРЬ ГОРНА';
    const classColor = isWizard ? '#c084fc' : isRanger ? '#4ade80' : '#38bdf8';

    this.classNameText = scene.add.text(64, 10, classLabel, {
      fontFamily: FONT.UI,
      fontSize: '13px',
      fontStyle: '700',
      color: classColor,
    });
    this.classNameText.setStroke('#000000', 4);
    this.classNameText.setShadow(0, 2, '#000000', 2, true, true);
    this.container.add(this.classNameText);

    // 4. 3D Beveled Health Bar
    const barX = 64;
    const barY = 30;
    const barH = 14;

    // Outer Dark Metallic Cavity
    const hpCavity = scene.add.rectangle(barX, barY, this.maxBarWidth, barH, 0x050811);
    hpCavity.setOrigin(0, 0);
    hpCavity.setStrokeStyle(1.5, 0x1e293b);
    this.container.add(hpCavity);

    // Ghost Damage Trail (Amber)
    this.hpBarGhost = scene.add.rectangle(barX, barY, this.maxBarWidth, barH, 0xf59e0b);
    this.hpBarGhost.setOrigin(0, 0);
    this.container.add(this.hpBarGhost);

    // Main Ruby Red HP Fill
    this.hpBarFill = scene.add.rectangle(barX, barY, this.maxBarWidth, barH, 0xdc2626);
    this.hpBarFill.setOrigin(0, 0);
    this.container.add(this.hpBarFill);

    // Top Gloss Highlight Line on Bar
    const gloss = scene.add.rectangle(barX, barY + 1, this.maxBarWidth, 2, 0xffffff, 0.4);
    gloss.setOrigin(0, 0);
    this.container.add(gloss);

    // HP Text Numbers (Large, bold, crisp!)
    this.hpText = scene.add.text(barX + this.maxBarWidth / 2, barY + barH / 2, '3 / 3 HP', {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#ffffff',
    });
    this.hpText.setOrigin(0.5, 0.5);
    this.hpText.setStroke('#000000', 4);
    this.hpText.setShadow(0, 1, '#000000', 2, true, true);
    this.container.add(this.hpText);

    // 5. Beveled Resource Badges Row: Gold & Embers
    const resY = 50;

    // Gold Inset Badge
    const goldSlot = scene.add.rectangle(barX + 36, resY + 10, 76, 18, 0x050811, 0.9);
    goldSlot.setStrokeStyle(1, 0x78350f);
    this.container.add(goldSlot);

    const goldIcon = scene.add.sprite(barX + 8, resY + 10, PIXEL_UI_TEXTURE.ICONS_SHEET, 6);
    goldIcon.setScale(1.0);
    this.container.add(goldIcon);

    this.goldText = scene.add.text(barX + 22, resY + 3, '0', {
      fontFamily: FONT.UI,
      fontSize: '12px',
      fontStyle: '700',
      color: '#fbbf24',
    });
    this.goldText.setStroke('#451a03', 3);
    this.container.add(this.goldText);

    // Embers Inset Badge
    const emberSlot = scene.add.rectangle(barX + 120, resY + 10, 76, 18, 0x050811, 0.9);
    emberSlot.setStrokeStyle(1, 0x7c2d12);
    this.container.add(emberSlot);

    const emberIcon = scene.add.sprite(barX + 92, resY + 10, PIXEL_UI_TEXTURE.ICONS_SHEET, 7);
    emberIcon.setScale(1.0);
    this.container.add(emberIcon);

    const embersCount = MetaManager.get().embers;
    this.embersText = scene.add.text(barX + 106, resY + 3, `${embersCount}`, {
      fontFamily: FONT.UI,
      fontSize: '12px',
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

    this.hpBarFill.width = targetW;

    // Smooth ghost damage lag
    if (this.hpBarGhost.width > targetW) {
      this.hpBarGhost.width += (targetW - this.hpBarGhost.width) * 0.08;
    } else {
      this.hpBarGhost.width = targetW;
    }

    this.hpText.setText(`${this.currentHp} / ${this.maxHp} HP`);

    // Low HP danger pulse
    if (this.currentHp <= 1) {
      this.hpBarFill.fillColor = 0xef4444;
      this.classNameText.setColor('#ef4444');
    } else {
      this.hpBarFill.fillColor = 0xdc2626;
      this.classNameText.setColor(player.heroClass === 'wizard' ? '#c084fc' : player.heroClass === 'ranger' ? '#4ade80' : '#38bdf8');
    }

    this.goldText.setText(`${player.gold}`);
    this.embersText.setText(`${MetaManager.get().embers}`);
  }

  public triggerGoldBump(): void {
    this.scene.tweens.add({
      targets: this.goldText,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 120,
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
