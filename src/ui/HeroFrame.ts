import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { HeroClass, Player } from '../entities/Player';
import { MetaManager } from '../meta/MetaManager';
import { PixelUI, PIXEL_UI_TEXTURE } from '../gfx/PixelUI';
import { HUD_ICON } from '../gfx/hud';

export class HeroFrame {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private portraitSprite: Phaser.GameObjects.Sprite;
  private heartsContainer: Phaser.GameObjects.Container;
  private heartSprites: Phaser.GameObjects.Sprite[] = [];
  private hpText: Phaser.GameObjects.Text;
  private goldText: Phaser.GameObjects.Text;
  private embersText: Phaser.GameObjects.Text;
  private classNameText: Phaser.GameObjects.Text;

  private currentHp = 3;
  private maxHp = 3;

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
    const classColor = isWizard ? '#9a68cc' : isRanger ? '#38b068' : '#2a8ac0';

    this.classNameText = scene.add.text(64, 10, classLabel, {
      fontFamily: FONT.UI,
      fontSize: '13px',
      fontStyle: '700',
      color: classColor,
    });
    this.classNameText.setStroke('#000000', 2.5);
    this.classNameText.setShadow(0, 1, '#000000', 2, true, true);
    this.container.add(this.classNameText);

    // 4. Heart-based Health Display
    const barX = 64;
    const barY = 28;

    this.heartsContainer = scene.add.container(barX, barY);
    this.container.add(this.heartsContainer);

    // HP Text Numbers (Compact, bold badge next to hearts)
    this.hpText = scene.add.text(barX + 110, barY + 6, '3 / 3 HP', {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#fecaca',
    });
    this.hpText.setOrigin(0, 0.5);
    this.hpText.setStroke('#000000', 2.5);
    this.hpText.setShadow(0, 1, '#000000', 2, true, true);
    this.container.add(this.hpText);

    // 5. Beveled Resource Badges Row: Gold & Embers
    const resY = 50;

    // Gold Inset Badge
    const goldSlot = scene.add.rectangle(barX + 36, resY + 10, 76, 18, 0x050811, 0.9);
    goldSlot.setStrokeStyle(1, 0x78350f);
    this.container.add(goldSlot);

    const goldIcon = scene.add.sprite(barX + 10, resY + 10, PIXEL_UI_TEXTURE.ICONS_SHEET, 6);
    goldIcon.setScale(1.0);
    this.container.add(goldIcon);

    this.goldText = scene.add.text(barX + 24, resY + 10, '0', {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#fbbf24',
    });
    this.goldText.setOrigin(0, 0.5);
    this.goldText.setStroke('#451a03', 2);
    this.container.add(this.goldText);

    // Embers Inset Badge
    const emberSlot = scene.add.rectangle(barX + 120, resY + 10, 76, 18, 0x050811, 0.9);
    emberSlot.setStrokeStyle(1, 0x7c2d12);
    this.container.add(emberSlot);

    const emberIcon = scene.add.sprite(barX + 94, resY + 10, PIXEL_UI_TEXTURE.ICONS_SHEET, 7);
    emberIcon.setScale(1.0);
    this.container.add(emberIcon);

    const embersCount = MetaManager.get().embers;
    this.embersText = scene.add.text(barX + 108, resY + 10, `${embersCount}`, {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#f97316',
    });
    this.embersText.setOrigin(0, 0.5);
    this.embersText.setStroke('#431407', 2);
    this.container.add(this.embersText);

    // Danger pulse glow for low HP
    this.dangerGlow = scene.add.rectangle(frameW / 2, frameH / 2, frameW + 4, frameH + 4, 0xef4444, 0);
    this.dangerGlow.setStrokeStyle(2, 0xef4444, 0);
    this.container.add(this.dangerGlow);
    this.container.sendToBack(this.dangerGlow);

    // Ignore world camera
    scene.cameras.main.ignore(this.container);
  }

  private dangerGlow?: Phaser.GameObjects.Rectangle;

  public update(player: Player, _delta = 16): void {
    this.currentHp = player.hp;
    this.maxHp = player.maxHp;

    const spacing = this.maxHp > 8 ? 14 : 15;

    // Build or adjust heart sprites if maxHp changed
    if (this.heartSprites.length !== this.maxHp) {
      this.heartSprites.forEach((s) => s.destroy());
      this.heartSprites = [];

      for (let i = 0; i < this.maxHp; i++) {
        const hx = i * spacing + 7;
        const heart = this.scene.add.sprite(hx, 6, TEXTURE.HUD_ICONS, HUD_ICON.HEART_FULL);
        heart.setOrigin(0.5, 0.5);
        heart.setScale(1.0);
        this.heartsContainer.add(heart);
        this.heartSprites.push(heart);
      }
    }

    const ratio = Math.max(0, Math.min(1, this.currentHp / this.maxHp));
    const isCritical = ratio <= 0.34;

    for (let i = 0; i < this.heartSprites.length; i++) {
      const heart = this.heartSprites[i];
      const isFull = i < this.currentHp;

      if (isFull) {
        if (heart.frame.name !== HUD_ICON.HEART_FULL) {
          heart.setFrame(HUD_ICON.HEART_FULL);
          // Pop animation on heal
          this.scene.tweens.add({
            targets: heart,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 120,
            yoyo: true,
            ease: 'Back.easeOut',
          });
        }
        if (isCritical) {
          const pulse = (Math.sin(this.scene.time.now * 0.009 + i * 0.4) + 1) * 0.08;
          heart.setScale(1.0 + pulse);
        } else {
          heart.setScale(1.0);
        }
      } else {
        if (heart.frame.name !== HUD_ICON.HEART_EMPTY) {
          heart.setFrame(HUD_ICON.HEART_EMPTY);
          // Pop on damage
          this.scene.tweens.add({
            targets: heart,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 90,
            yoyo: true,
          });
        }
        heart.setScale(1.0);
      }
    }

    // Position HP Text right next to the hearts row
    const heartsWidth = this.maxHp * spacing;
    const barX = 64;
    const barY = 28;
    this.hpText.setPosition(barX + heartsWidth + 8, barY + 6);
    this.hpText.setText(`${this.currentHp}/${this.maxHp} HP`);

    // Low HP danger pulse (< 33% max HP)
    if (isCritical) {
      this.hpText.setColor('#ef4444');
      this.classNameText.setColor('#ef4444');
      if (this.dangerGlow) {
        const pulse = (Math.sin(this.scene.time.now * 0.008) + 1) * 0.5;
        this.dangerGlow.setAlpha(0.2 + pulse * 0.4);
        this.dangerGlow.setStrokeStyle(2, 0xef4444, 0.4 + pulse * 0.6);
      }
    } else {
      this.hpText.setColor('#fecaca');
      this.classNameText.setColor(player.heroClass === 'wizard' ? '#9a68cc' : player.heroClass === 'ranger' ? '#38b068' : '#2a8ac0');
      if (this.dangerGlow) {
        this.dangerGlow.setAlpha(0);
        this.dangerGlow.setStrokeStyle(0, 0xef4444, 0);
      }
    }

    this.goldText.setText(`${player.gold}`);
    this.embersText.setText(`${MetaManager.get().embers}`);
  }

  public triggerGoldBump(): void {
    this.goldText.setScale(1.0);
    this.scene.tweens.killTweensOf(this.goldText);
    this.scene.tweens.add({
      targets: this.goldText,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 110,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.goldText.setScale(1.0);
      },
    });
  }

  public setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
