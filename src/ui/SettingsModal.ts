import Phaser from 'phaser';
import { DEPTH, FONT } from '../gfx/registry';
import { PixelUI, PIXEL_UI_TEXTURE } from '../gfx/PixelUI';
import { SoundFX } from '../audio/SoundFX';
import { t } from '../i18n';

export interface SettingsModalOptions {
  mode?: 'menu' | 'game';
  onResume?: () => void;
  onExitToMenu?: () => void;
  onClose?: () => void;
}

export class SettingsModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private mode: 'menu' | 'game' = 'menu';
  private isVisible = false;

  private onResumeCallback?: () => void;
  private onExitToMenuCallback?: () => void;
  private onCloseCallback?: () => void;

  // UI Elements
  private titleText!: Phaser.GameObjects.Text;
  private musicPercentText!: Phaser.GameObjects.Text;
  private sfxPercentText!: Phaser.GameObjects.Text;
  private musicFill!: Phaser.GameObjects.Rectangle;
  private sfxFill!: Phaser.GameObjects.Rectangle;
  private musicThumb!: Phaser.GameObjects.Rectangle;
  private sfxThumb!: Phaser.GameObjects.Rectangle;

  private gameButtonsContainer!: Phaser.GameObjects.Container;
  private menuButtonsContainer!: Phaser.GameObjects.Container;

  private readonly sliderTrackW = 240;
  private readonly sliderTrackH = 14;

  private lastTickVolume = -1;

  constructor(scene: Phaser.Scene, opts: SettingsModalOptions = {}) {
    this.scene = scene;
    this.mode = opts.mode ?? 'menu';
    this.onResumeCallback = opts.onResume;
    this.onExitToMenuCallback = opts.onExitToMenu;
    this.onCloseCallback = opts.onClose;

    const w = scene.scale.width;
    const h = scene.scale.height;

    this.container = scene.add.container(w / 2, h / 2);
    this.container.setDepth(DEPTH.UI + 600);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    this.buildModal();

    if (scene.cameras.cameras.length > 1) {
      scene.cameras.main.ignore(this.container);
    }
  }

  private buildModal(): void {
    const modalW = 440;
    const modalH = 320;

    // 1. Dark Backdrop Overlay
    const backdrop = this.scene.add.rectangle(0, 0, this.scene.scale.width * 2, this.scene.scale.height * 2, 0x06040c, 0.85);
    backdrop.setInteractive(); // Prevent clicking behind
    this.container.add(backdrop);

    // 2. Main Stone Panel
    const mainPanel = PixelUI.createPanel(this.scene, 0, 0, modalW, modalH);
    this.container.add(mainPanel);

    // 3. Header Strip
    const header = PixelUI.createHeader(this.scene, 0, -modalH / 2 + 18, modalW - 16, 28);
    this.container.add(header);

    this.titleText = this.scene.add
      .text(0, -modalH / 2 + 18, this.mode === 'game' ? t().paused : t().settingsTitle, {
        fontFamily: FONT.TITLE,
        fontSize: '14px',
        fontStyle: '700',
        color: '#fbbf24',
      })
      .setOrigin(0.5, 0.5);
    this.titleText.setStroke('#000000', 4);
    this.container.add(this.titleText);

    // Close [X] Button on Header
    const closeBtn = this.scene.add.sprite(modalW / 2 - 20, -modalH / 2 + 18, PIXEL_UI_TEXTURE.ICONS_SHEET, 8);
    closeBtn.setScale(1.2);
    closeBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      SoundFX.playMenuClick();
      this.close();
    });
    this.container.add(closeBtn);

    // 4. Sliders Section
    const sliderTrackW = 240;
    const sliderTrackH = 14;

    // === MUSIC SLIDER ===
    const musicY = -modalH / 2 + 75;
    const musicLabel = this.scene.add
      .text(-modalW / 2 + 28, musicY - 14, t().musicVolume, {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '600',
        color: '#e2e8f0',
      })
      .setOrigin(0, 0.5);
    this.container.add(musicLabel);

    this.musicPercentText = this.scene.add
      .text(modalW / 2 - 28, musicY - 14, `${Math.round(SoundFX.getMusicVolume() * 100)}%`, {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '700',
        color: '#fbbf24',
      })
      .setOrigin(1, 0.5);
    this.container.add(this.musicPercentText);

    const musicTrack = this.scene.add
      .rectangle(0, musicY + 8, sliderTrackW, sliderTrackH, 0x0f172a, 0.95)
      .setStrokeStyle(1.5, 0x475569)
      .setInteractive({ useHandCursor: true });
    this.container.add(musicTrack);

    this.musicFill = this.scene.add
      .rectangle(-sliderTrackW / 2, musicY + 8, sliderTrackW * SoundFX.getMusicVolume(), sliderTrackH - 4, 0xf59e0b, 0.9)
      .setOrigin(0, 0.5);
    this.container.add(this.musicFill);

    this.musicThumb = this.scene.add
      .rectangle(-sliderTrackW / 2 + sliderTrackW * SoundFX.getMusicVolume(), musicY + 8, 10, sliderTrackH + 6, 0xfde047, 1)
      .setStrokeStyle(1.5, 0x78350f)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.musicThumb);

    const handleMusicInput = (pointerX: number) => {
      const localX = pointerX - (this.container.x);
      const minX = -sliderTrackW / 2;
      const maxX = sliderTrackW / 2;
      const clampedX = Math.max(minX, Math.min(maxX, localX));
      const ratio = (clampedX - minX) / sliderTrackW;

      SoundFX.setMusicVolume(ratio);
      this.musicFill.setSize(sliderTrackW * ratio, sliderTrackH - 4);
      this.musicThumb.x = clampedX;
      this.musicPercentText.setText(`${Math.round(ratio * 100)}%`);

      const intRatio = Math.round(ratio * 20);
      if (intRatio !== this.lastTickVolume) {
        this.lastTickVolume = intRatio;
        SoundFX.playSliderTick();
      }
    };

    let musicDragging = false;
    musicTrack.on('pointerdown', (p: Phaser.Input.Pointer) => {
      musicDragging = true;
      handleMusicInput(p.x);
    });
    this.musicThumb.on('pointerdown', () => {
      musicDragging = true;
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (musicDragging && this.isVisible) {
        handleMusicInput(p.x);
      }
    });
    this.scene.input.on('pointerup', () => {
      musicDragging = false;
    });

    // === SFX SLIDER ===
    const sfxY = -modalH / 2 + 145;
    const sfxLabel = this.scene.add
      .text(-modalW / 2 + 28, sfxY - 14, t().sfxVolume, {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '600',
        color: '#e2e8f0',
      })
      .setOrigin(0, 0.5);
    this.container.add(sfxLabel);

    this.sfxPercentText = this.scene.add
      .text(modalW / 2 - 28, sfxY - 14, `${Math.round(SoundFX.getSfxVolume() * 100)}%`, {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '700',
        color: '#38bdf8',
      })
      .setOrigin(1, 0.5);
    this.container.add(this.sfxPercentText);

    const sfxTrack = this.scene.add
      .rectangle(0, sfxY + 8, sliderTrackW, sliderTrackH, 0x0f172a, 0.95)
      .setStrokeStyle(1.5, 0x475569)
      .setInteractive({ useHandCursor: true });
    this.container.add(sfxTrack);

    this.sfxFill = this.scene.add
      .rectangle(-sliderTrackW / 2, sfxY + 8, sliderTrackW * SoundFX.getSfxVolume(), sliderTrackH - 4, 0x0284c7, 0.9)
      .setOrigin(0, 0.5);
    this.container.add(this.sfxFill);

    this.sfxThumb = this.scene.add
      .rectangle(-sliderTrackW / 2 + sliderTrackW * SoundFX.getSfxVolume(), sfxY + 8, 10, sliderTrackH + 6, 0x38bdf8, 1)
      .setStrokeStyle(1.5, 0x0369a1)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.sfxThumb);

    const handleSfxInput = (pointerX: number) => {
      const localX = pointerX - (this.container.x);
      const minX = -sliderTrackW / 2;
      const maxX = sliderTrackW / 2;
      const clampedX = Math.max(minX, Math.min(maxX, localX));
      const ratio = (clampedX - minX) / sliderTrackW;

      SoundFX.setSfxVolume(ratio);
      this.sfxFill.setSize(sliderTrackW * ratio, sliderTrackH - 4);
      this.sfxThumb.x = clampedX;
      this.sfxPercentText.setText(`${Math.round(ratio * 100)}%`);

      const intRatio = Math.round(ratio * 20);
      if (intRatio !== this.lastTickVolume) {
        this.lastTickVolume = intRatio;
        SoundFX.playSliderTick();
      }
    };

    let sfxDragging = false;
    sfxTrack.on('pointerdown', (p: Phaser.Input.Pointer) => {
      sfxDragging = true;
      handleSfxInput(p.x);
    });
    this.sfxThumb.on('pointerdown', () => {
      sfxDragging = true;
    });
    this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (sfxDragging && this.isVisible) {
        handleSfxInput(p.x);
      }
    });
    this.scene.input.on('pointerup', () => {
      sfxDragging = false;
    });

    // 5. Buttons
    this.buildButtons(modalH);
  }

  private buildButtons(modalH: number): void {
    // Menu mode buttons
    this.menuButtonsContainer = this.scene.add.container(0, modalH / 2 - 38);
    const closeBtnBg = this.scene.add
      .rectangle(0, 0, 160, 32, 0x1e293b, 0.95)
      .setStrokeStyle(1.5, 0xfbbf24)
      .setInteractive({ useHandCursor: true });
    const closeBtnText = this.scene.add
      .text(0, 0, t().closeBtn, {
        fontFamily: FONT.UI,
        fontSize: '13px',
        fontStyle: '700',
        color: '#f8fafc',
      })
      .setOrigin(0.5, 0.5);

    closeBtnBg.on('pointerover', () => {
      closeBtnBg.setFillStyle(0x334155, 1);
      SoundFX.playButtonHover();
    });
    closeBtnBg.on('pointerout', () => {
      closeBtnBg.setFillStyle(0x1e293b, 0.95);
    });
    closeBtnBg.on('pointerdown', () => {
      SoundFX.playMenuClick();
      this.close();
    });

    this.menuButtonsContainer.add([closeBtnBg, closeBtnText]);
    this.container.add(this.menuButtonsContainer);

    // Game mode buttons
    this.gameButtonsContainer = this.scene.add.container(0, modalH / 2 - 42);

    const resumeBtnBg = this.scene.add
      .rectangle(-90, 0, 150, 32, 0x14532d, 0.95)
      .setStrokeStyle(1.5, 0x4ade80)
      .setInteractive({ useHandCursor: true });
    const resumeBtnText = this.scene.add
      .text(-90, 0, t().resumeBtn, {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '700',
        color: '#dcfce7',
      })
      .setOrigin(0.5, 0.5);

    resumeBtnBg.on('pointerover', () => {
      resumeBtnBg.setFillStyle(0x166534, 1);
      SoundFX.playButtonHover();
    });
    resumeBtnBg.on('pointerout', () => {
      resumeBtnBg.setFillStyle(0x14532d, 0.95);
    });
    resumeBtnBg.on('pointerdown', () => {
      SoundFX.playMenuClick();
      this.close();
      if (this.onResumeCallback) this.onResumeCallback();
    });

    const exitBtnBg = this.scene.add
      .rectangle(90, 0, 150, 32, 0x7f1d1d, 0.95)
      .setStrokeStyle(1.5, 0xf87171)
      .setInteractive({ useHandCursor: true });
    const exitBtnText = this.scene.add
      .text(90, 0, t().mainMenuBtn, {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '700',
        color: '#fee2e2',
      })
      .setOrigin(0.5, 0.5);

    exitBtnBg.on('pointerover', () => {
      exitBtnBg.setFillStyle(0x991b1b, 1);
      SoundFX.playButtonHover();
    });
    exitBtnBg.on('pointerout', () => {
      exitBtnBg.setFillStyle(0x7f1d1d, 0.95);
    });
    exitBtnBg.on('pointerdown', () => {
      SoundFX.playMenuClick();
      this.close();
      if (this.onExitToMenuCallback) this.onExitToMenuCallback();
    });

    this.gameButtonsContainer.add([resumeBtnBg, resumeBtnText, exitBtnBg, exitBtnText]);
    this.container.add(this.gameButtonsContainer);

    this.updateModeUI();
  }

  private updateModeUI(): void {
    if (this.mode === 'game') {
      this.titleText.setText(t().paused);
      this.gameButtonsContainer.setVisible(true);
      this.menuButtonsContainer.setVisible(false);
    } else {
      this.titleText.setText(t().settingsTitle);
      this.gameButtonsContainer.setVisible(false);
      this.menuButtonsContainer.setVisible(true);
    }
  }

  public updateVolumeUI(): void {
    const mVol = SoundFX.getMusicVolume();
    const sVol = SoundFX.getSfxVolume();

    this.musicFill.setSize(this.sliderTrackW * mVol, this.sliderTrackH - 4);
    this.musicThumb.x = -this.sliderTrackW / 2 + this.sliderTrackW * mVol;
    this.musicPercentText.setText(`${Math.round(mVol * 100)}%`);

    this.sfxFill.setSize(this.sliderTrackW * sVol, this.sliderTrackH - 4);
    this.sfxThumb.x = -this.sliderTrackW / 2 + this.sliderTrackW * sVol;
    this.sfxPercentText.setText(`${Math.round(sVol * 100)}%`);
  }

  public open(mode?: 'menu' | 'game'): void {
    if (mode) this.mode = mode;
    this.updateModeUI();
    this.updateVolumeUI();

    this.container.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    this.container.setVisible(true);
    this.isVisible = true;

    SoundFX.playModalOpen();

    this.container.setScale(0.85);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 160,
      ease: 'Back.easeOut',
    });
  }

  public close(): void {
    if (!this.isVisible) return;
    SoundFX.playModalClose();
    this.scene.tweens.add({
      targets: this.container,
      scale: 0.9,
      duration: 100,
      onComplete: () => {
        this.container.setVisible(false);
        this.isVisible = false;
        if (this.onCloseCallback) this.onCloseCallback();
      },
    });
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public handleResize(width: number, height: number): void {
    this.container.setPosition(width / 2, height / 2);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
