import Phaser from 'phaser';
import { SCENE } from './keys';
import { TEXTURE, ANIM, DEPTH, FONT } from '../gfx/registry';
import { TILE_INDEX } from '../gfx/tiles';
import { ACTORS } from '../gfx/actors';
import { HeroClass } from '../entities/Player';
import { MetaManager, META_UPGRADES } from '../meta/MetaManager';
import { SoundFX } from '../audio/SoundFX';
import { ACHIEVEMENTS } from '../achievements/registry';
import { AchievementManager } from '../achievements/AchievementManager';
import { I18n, t } from '../i18n';
import { registerDebugHotkey } from '../debug/hotkey';
import { BUILD_LABEL } from '../buildInfo';
import { SettingsModal } from '../ui/SettingsModal';
import { PIXEL_UI_TEXTURE, PIXEL_ICON } from '../gfx/PixelUI';
import { HUD_ICON } from '../gfx/hud';

interface MenuButtonOptions {
  theme?: 'primary' | 'secondary' | 'dark' | 'gold';
  iconFrame?: number;
  fontSize?: string;
  onClick?: () => void;
}

function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  opts: MenuButtonOptions = {}
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(DEPTH.UI);
  const theme = opts.theme ?? 'dark';

  let fillHex = 0x120c1e;
  let strokeHex = 0x475569;
  let textHex = '#f0e2b8';
  let hoverFillHex = 0x221738;
  let hoverStrokeHex = 0x94a3b8;
  let hoverTextHex = '#ffffff';

  if (theme === 'primary') {
    fillHex = 0x7c1d1d;
    strokeHex = 0xf59e0b;
    textHex = '#fef08a';
    hoverFillHex = 0x991b1b;
    hoverStrokeHex = 0xfbbf24;
    hoverTextHex = '#ffffff';
  } else if (theme === 'secondary') {
    fillHex = 0x0f2744;
    strokeHex = 0x38bdf8;
    textHex = '#bae6fd';
    hoverFillHex = 0x163e6d;
    hoverStrokeHex = 0x7dd3fc;
    hoverTextHex = '#ffffff';
  } else if (theme === 'gold') {
    fillHex = 0x78350f;
    strokeHex = 0xfbbf24;
    textHex = '#fef3c7';
    hoverFillHex = 0x92400e;
    hoverStrokeHex = 0xfde047;
    hoverTextHex = '#ffffff';
  }

  // 9-slice styled beveled button plate
  const bg = scene.add.rectangle(0, 0, width, height, fillHex, 0.96);
  bg.setStrokeStyle(theme === 'primary' ? 2 : 1.5, strokeHex);
  bg.setInteractive({ useHandCursor: true });
  container.add(bg);

  // Top gloss highlight
  const gloss = scene.add.rectangle(0, -height / 2 + 2, width - 4, 2, 0xffffff, 0.2);
  container.add(gloss);

  // Optional icon
  const hasIcon = opts.iconFrame !== undefined;
  const iconOffsetX = hasIcon ? -width / 2 + 22 : 0;
  const textOffsetX = hasIcon ? 10 : 0;

  if (hasIcon && opts.iconFrame !== undefined) {
    const icon = scene.add.sprite(iconOffsetX, 0, PIXEL_UI_TEXTURE.ICONS_SHEET, opts.iconFrame);
    icon.setScale(1.1);
    container.add(icon);
  }

  const txt = scene.add
    .text(textOffsetX, 0, label, {
      fontFamily: FONT.UI,
      fontSize: opts.fontSize ?? (theme === 'primary' ? '14px' : '11px'),
      fontStyle: '700',
      color: textHex,
    })
    .setOrigin(0.5, 0.5);
  txt.setStroke('#000000', 2);
  txt.setShadow(0, 1, '#000000', 2, true, true);
  container.add(txt);

  bg.on('pointerover', () => {
    bg.setFillStyle(hoverFillHex, 1);
    bg.setStrokeStyle(2, hoverStrokeHex);
    txt.setColor(hoverTextHex);
    scene.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 80, ease: 'Quad.easeOut' });
  });

  bg.on('pointerout', () => {
    bg.setFillStyle(fillHex, 0.96);
    bg.setStrokeStyle(theme === 'primary' ? 2 : 1.5, strokeHex);
    txt.setColor(textHex);
    scene.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 80, ease: 'Quad.easeOut' });
  });

  bg.on('pointerdown', () => {
    SoundFX.playMenuClick();
    scene.tweens.add({
      targets: container,
      scaleX: 0.96,
      scaleY: 0.96,
      duration: 60,
      yoyo: true,
      onComplete: () => {
        if (opts.onClick) opts.onClick();
      },
    });
  });

  return container;
}

export class MenuScene extends Phaser.Scene {
  private resizeTimer?: Phaser.Time.TimerEvent;
  private settingsModal!: SettingsModal;

  constructor() {
    super(SCENE.MENU);
  }

  create(): void {
    SoundFX.playMusic('menu');
    const { width, height } = this.scale;

    const handleResize = () => {
      this.resizeTimer?.remove();
      this.resizeTimer = this.time.delayedCall(120, () => this.scene.restart());
    };
    this.scale.on('resize', handleResize);
    this.events.once('shutdown', () => this.scale.off('resize', handleResize));

    this.lights.enable();
    this.lights.setAmbientColor(0x120e1e);

    const bg = this.add
      .tileSprite(0, 0, width, height, TEXTURE.DUNGEON_TILES, TILE_INDEX.WALL)
      .setOrigin(0, 0)
      .setPipeline('Light2D')
      .setDepth(0);
    this.tweens.add({ targets: bg, tilePositionY: 40, duration: 40000, repeat: -1, yoyo: true });

    this.add.rectangle(0, 0, width, height, 0x0a0710, 0.78).setOrigin(0, 0).setDepth(1);

    // =========================================================================
    // 1. TOP HEADER & BRAND CREST
    // =========================================================================
    const emblemY = height * 0.14;
    const emblemSprite = this.add
      .sprite(width / 2, emblemY, TEXTURE.GAME_EMBLEM)
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setScale(0.68);
    this.tweens.add({
      targets: emblemSprite,
      y: emblemY - 5,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Flanking wall torches with ambient lighting
    const torchY = height * 0.25;
    for (const tx of [width * 0.25, width * 0.75]) {
      const sprite = this.add.sprite(tx, torchY, TEXTURE.TORCH, 0).setDepth(DEPTH.DECOR).setPipeline('Light2D').setScale(2.2);
      sprite.play(ANIM.TORCH_FLICKER);
      this.lights.addLight(tx, torchY, 190, 0xff9a4d, 1.25);
    }

    this.lights.addLight(width / 2, emblemY, 180, 0xff8822, 1.3);
    this.lights.addLight(width / 2, height * 0.26, 260, 0xcbb3ff, 0.25);

    const dust = this.add.particles(width / 2, height, TEXTURE.PARTICLE_SPARK, {
      x: { min: 0, max: width },
      y: 0,
      lifespan: 7000,
      speedY: { min: -14, max: -5 },
      speedX: { min: -6, max: 6 },
      scale: { start: 1.1, end: 0.1 },
      alpha: { start: 0.5, end: 0 },
      frequency: 140,
      blendMode: 'ADD',
    });
    dust.setDepth(DEPTH.DUST);

    // Main Game Title
    this.add
      .text(width / 2, height * 0.25, t().gameTitle, {
        fontFamily: FONT.TITLE,
        fontSize: '48px',
        fontStyle: '700',
        color: '#f0e2b8',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setStroke('#0d0a10', 6)
      .setShadow(0, 4, '#000000', 8, true, true);

    // Subtitle Tagline
    this.add
      .text(width / 2, height * 0.25 + 38, t().gameSubtitle, {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '600',
        color: '#a89bc4',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI);

    let selectedHero: HeroClass = 'ranger';

    // Top-Left Language Switcher Pill Button
    createMenuButton(this, 75, 30, 110, 30, t().langBtn, {
      fontSize: '11px',
      iconFrame: PIXEL_ICON.TARGET,
      onClick: () => {
        I18n.get().toggleLanguage();
        this.scene.restart();
      },
    });

    // Top-Right Embers Pill Slot
    const embersCont = this.add.container(width - 75, 30).setDepth(DEPTH.UI);
    const emberSlot = this.add.rectangle(0, 0, 100, 28, 0x07040a, 0.92);
    emberSlot.setStrokeStyle(1.5, 0x7c2d12);
    const emberIcon = this.add.sprite(-34, 0, PIXEL_UI_TEXTURE.ICONS_SHEET, PIXEL_ICON.EMBER);
    emberIcon.setScale(1.15);
    const embersText = this.add
      .text(6, 0, `${MetaManager.get().embers}`, {
        fontFamily: FONT.UI,
        fontSize: '13px',
        fontStyle: '700',
        color: '#f97316',
      })
      .setOrigin(0.5, 0.5);
    embersText.setStroke('#000000', 2);
    embersCont.add([emberSlot, emberIcon, embersText]);

    // Debug menu hotkey (rule §9)
    registerDebugHotkey(this, () => this.openDebugMenu(selectedHero));

    // =========================================================================
    // 2. HERO SHOWCASE SELECTION (3 Distinct Tactile Cards)
    // =========================================================================
    const heroY = height * 0.44;
    const cardW = 216;
    const cardH = 84;
    const cardSpacing = 230;

    // --- Knight Card ---
    const knightBtn = this.add.container(width / 2 - cardSpacing, heroY).setDepth(DEPTH.UI);
    const knightBg = this.add.rectangle(0, 0, cardW, cardH, 0x080612, 0.7);
    knightBg.setStrokeStyle(1.5, 0x475569);

    const knightSprite = this.add.sprite(-cardW / 2 + 34, 24, ACTORS.HERO.idle.key);
    knightSprite.setOrigin(0.5, 1.0);
    knightSprite.setScale(2.15);
    knightSprite.play(ACTORS.HERO.idle.key);

    const knightSword = this.add.sprite(-cardW / 2 + 46, 9, TEXTURE.WEAPON_SWORD);
    knightSword.setOrigin(0.5, 0.88);
    knightSword.setScale(1.4);
    knightSword.setAngle(20);

    const knightText = this.add
      .text(-cardW / 2 + 66, -24, t().knightTitle, {
        fontFamily: FONT.UI,
        fontSize: '15px',
        fontStyle: '700',
        color: '#fbbf24',
      })
      .setOrigin(0, 0);
    knightText.setStroke('#000000', 2.5);

    const knightHearts = this.add.container(-cardW / 2 + 66, 0);
    const knightHeartSprites: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      const heart = this.add.sprite(i * 14 + 6, 0, TEXTURE.HUD_ICONS, HUD_ICON.HEART_FULL);
      heart.setScale(1.0);
      knightHearts.add(heart);
      knightHeartSprites.push(heart);
    }

    const knightSub = this.add
      .text(-cardW / 2 + 66, 16, t().knightStats, {
        fontFamily: FONT.UI,
        fontSize: '11px',
        fontStyle: '600',
        color: '#fde047',
      })
      .setOrigin(0, 0);
    knightSub.setStroke('#000000', 2);

    knightBtn.add([knightBg, knightSprite, knightSword, knightText, knightHearts, knightSub]);
    knightBg.setInteractive({ useHandCursor: true });

    // --- Ranger Card ---
    const rangerBtn = this.add.container(width / 2, heroY).setDepth(DEPTH.UI);
    const rangerBg = this.add.rectangle(0, 0, cardW, cardH, 0x161026, 0.95);
    rangerBg.setStrokeStyle(2.5, 0x4ade80);

    const rangerSprite = this.add.sprite(-cardW / 2 + 34, 24, TEXTURE.RANGER_IDLE);
    rangerSprite.setOrigin(0.5, 1.0);
    rangerSprite.setScale(2.15);
    rangerSprite.play(ANIM.RANGER_IDLE);

    const rangerBow = this.add.sprite(-cardW / 2 + 44, 10, TEXTURE.BOW);
    rangerBow.setOrigin(0.5, 0.5);
    rangerBow.setScale(1.3);

    const rangerText = this.add
      .text(-cardW / 2 + 66, -24, t().rangerTitle, {
        fontFamily: FONT.UI,
        fontSize: '15px',
        fontStyle: '700',
        color: '#4ade80',
      })
      .setOrigin(0, 0);
    rangerText.setStroke('#000000', 2.5);

    const rangerHearts = this.add.container(-cardW / 2 + 66, 0);
    const rangerHeartSprites: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 4; i++) {
      const heart = this.add.sprite(i * 14 + 6, 0, TEXTURE.HUD_ICONS, HUD_ICON.HEART_FULL);
      heart.setScale(1.0);
      rangerHearts.add(heart);
      rangerHeartSprites.push(heart);
    }

    const rangerSub = this.add
      .text(-cardW / 2 + 66, 16, t().rangerStats, {
        fontFamily: FONT.UI,
        fontSize: '11px',
        fontStyle: '600',
        color: '#86efac',
      })
      .setOrigin(0, 0);
    rangerSub.setStroke('#000000', 2);

    rangerBtn.add([rangerBg, rangerSprite, rangerBow, rangerText, rangerHearts, rangerSub]);
    rangerBg.setInteractive({ useHandCursor: true });

    // --- Wizard Card ---
    const wizardBtn = this.add.container(width / 2 + cardSpacing, heroY).setDepth(DEPTH.UI);
    const wizardBg = this.add.rectangle(0, 0, cardW, cardH, 0x080612, 0.7);
    wizardBg.setStrokeStyle(1.5, 0x475569);

    const wizardSprite = this.add.sprite(-cardW / 2 + 34, 24, `${TEXTURE.WIZARD_IDLE}_f0`);
    wizardSprite.setOrigin(0.5, 1.0);
    wizardSprite.setScale(2.15);
    wizardSprite.play(ANIM.WIZARD_IDLE);

    const wizardStaff = this.add.sprite(-cardW / 2 + 44, 9, TEXTURE.STAFF);
    wizardStaff.setOrigin(0.5, 0.85);
    wizardStaff.setScale(1.3);
    wizardStaff.setAngle(12);

    const wizardText = this.add
      .text(-cardW / 2 + 66, -24, t().wizardTitle, {
        fontFamily: FONT.UI,
        fontSize: '15px',
        fontStyle: '700',
        color: '#8b8398',
      })
      .setOrigin(0, 0);
    wizardText.setStroke('#000000', 2.5);

    const wizardHearts = this.add.container(-cardW / 2 + 66, 0);
    const wizardHeartSprites: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < 4; i++) {
      const heart = this.add.sprite(i * 14 + 6, 0, TEXTURE.HUD_ICONS, HUD_ICON.HEART_FULL);
      heart.setScale(1.0);
      wizardHearts.add(heart);
      wizardHeartSprites.push(heart);
    }

    const wizardSub = this.add
      .text(-cardW / 2 + 66, 16, t().wizardStats, {
        fontFamily: FONT.UI,
        fontSize: '11px',
        fontStyle: '600',
        color: '#d8b4fe',
      })
      .setOrigin(0, 0);
    wizardSub.setStroke('#000000', 2);

    wizardBtn.add([wizardBg, wizardSprite, wizardStaff, wizardText, wizardHearts, wizardSub]);
    wizardBg.setInteractive({ useHandCursor: true });

    // Idle weapon floating tween
    this.tweens.add({
      targets: [knightSword, rangerBow, wizardStaff],
      y: '+=3',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const updateHeroSelection = () => {
      // Knight State
      const isKnight = selectedHero === 'knight';
      knightBg.setFillStyle(isKnight ? 0x161026 : 0x080612, isKnight ? 0.96 : 0.65);
      knightBg.setStrokeStyle(isKnight ? 2.5 : 1.5, isKnight ? 0xfbbf24 : 0x475569);
      knightText.setColor(isKnight ? '#fbbf24' : '#8b8398');
      knightSub.setColor(isKnight ? '#fde047' : '#64748b');
      knightSprite.setAlpha(isKnight ? 1 : 0.55);
      knightSword.setAlpha(isKnight ? 1 : 0.55);
      knightHeartSprites.forEach(h => h.setAlpha(isKnight ? 1 : 0.55));
      this.tweens.add({ targets: knightBtn, scaleX: isKnight ? 1.02 : 1.0, scaleY: isKnight ? 1.02 : 1.0, duration: 100 });

      // Ranger State
      const isRanger = selectedHero === 'ranger';
      rangerBg.setFillStyle(isRanger ? 0x161026 : 0x080612, isRanger ? 0.96 : 0.65);
      rangerBg.setStrokeStyle(isRanger ? 2.5 : 1.5, isRanger ? 0x4ade80 : 0x475569);
      rangerText.setColor(isRanger ? '#4ade80' : '#8b8398');
      rangerSub.setColor(isRanger ? '#86efac' : '#64748b');
      rangerSprite.setAlpha(isRanger ? 1 : 0.55);
      rangerBow.setAlpha(isRanger ? 1 : 0.55);
      rangerHeartSprites.forEach(h => h.setAlpha(isRanger ? 1 : 0.55));
      this.tweens.add({ targets: rangerBtn, scaleX: isRanger ? 1.02 : 1.0, scaleY: isRanger ? 1.02 : 1.0, duration: 100 });

      // Wizard State
      const isWizard = selectedHero === 'wizard';
      wizardBg.setFillStyle(isWizard ? 0x161026 : 0x080612, isWizard ? 0.96 : 0.65);
      wizardBg.setStrokeStyle(isWizard ? 2.5 : 1.5, isWizard ? 0xc084fc : 0x475569);
      wizardText.setColor(isWizard ? '#c084fc' : '#8b8398');
      wizardSub.setColor(isWizard ? '#d8b4fe' : '#64748b');
      wizardSprite.setAlpha(isWizard ? 1 : 0.55);
      wizardStaff.setAlpha(isWizard ? 1 : 0.55);
      wizardHeartSprites.forEach(h => h.setAlpha(isWizard ? 1 : 0.55));
      this.tweens.add({ targets: wizardBtn, scaleX: isWizard ? 1.02 : 1.0, scaleY: isWizard ? 1.02 : 1.0, duration: 100 });
    };

    updateHeroSelection();

    knightBg.on('pointerdown', () => {
      selectedHero = 'knight';
      updateHeroSelection();
      SoundFX.playMenuClick();
    });

    rangerBg.on('pointerdown', () => {
      selectedHero = 'ranger';
      updateHeroSelection();
      SoundFX.playMenuClick();
    });

    wizardBg.on('pointerdown', () => {
      selectedHero = 'wizard';
      updateHeroSelection();
      SoundFX.playMenuClick();
    });

    // =========================================================================
    // 3. ACTION HUB: PLAY SOLO, CO-OP & UTILITY NAVIGATION
    // =========================================================================
    const startRun = () => {
      this.cameras.main.fadeOut(280, 8, 6, 12);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE.GAME, { heroClass: selectedHero });
      });
    };

    const startCoop = () => {
      this.cameras.main.fadeOut(280, 8, 6, 12);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE.LOBBY, { heroClass: selectedHero });
      });
    };

    // Primary CTA: Play Solo Button
    createMenuButton(this, width / 2, height * 0.62, 300, 48, `${t().playSolo} [ENTER]`, {
      theme: 'primary',
      iconFrame: PIXEL_ICON.SWORDS,
      fontSize: '13px',
      onClick: startRun,
    });

    // Secondary Action: Co-op Button
    createMenuButton(this, width / 2, height * 0.70, 260, 38, t().playCoop, {
      theme: 'secondary',
      iconFrame: PIXEL_ICON.SHIELD,
      fontSize: '12px',
      onClick: startCoop,
    });

    // Bottom Navigation Bar: Row of 3 symmetrical utility buttons
    const navY = height * 0.78;
    const navSpacing = 172;
    const navW = 156;
    const navH = 34;

    createMenuButton(this, width / 2 - navSpacing, navY, navW, navH, t().upgradesBtn, {
      theme: 'dark',
      iconFrame: PIXEL_ICON.EMBER,
      fontSize: '11px',
      onClick: () => this.openSoulAltar(),
    });

    createMenuButton(this, width / 2, navY, navW, navH, t().achievementsBtn, {
      theme: 'dark',
      iconFrame: PIXEL_ICON.SHIELD,
      fontSize: '11px',
      onClick: () => this.openAchievementsModal(),
    });

    createMenuButton(this, width / 2 + navSpacing, navY, navW, navH, t().settingsBtn, {
      theme: 'dark',
      iconFrame: PIXEL_ICON.SETTINGS,
      fontSize: '11px',
      onClick: () => this.settingsModal.open('menu'),
    });

    this.settingsModal = new SettingsModal(this, { mode: 'menu' });

    // =========================================================================
    // 4. FOOTER: CONTROLS HINT & BUILD STAMP
    // =========================================================================
    this.add
      .text(width / 2, height - 20, t().footerControlsHint, {
        fontFamily: FONT.UI,
        fontSize: '10px',
        color: '#64748b',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.UI);

    this.add
      .text(width - 8, height - 6, BUILD_LABEL, {
        fontFamily: FONT.UI,
        fontSize: '9px',
        color: '#475569',
      })
      .setOrigin(1, 1)
      .setDepth(DEPTH.UI);

    this.add
      .image(width / 2, height / 2, TEXTURE.VIGNETTE)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY)
      .setDisplaySize(width * 1.2, height * 1.2);

    // Keyboard navigation
    this.input.keyboard?.once('keydown-ENTER', startRun);
    this.input.keyboard?.once('keydown-SPACE', startRun);
    this.input.keyboard?.on('keydown-C', startCoop);
    this.input.keyboard?.on('keydown-U', () => this.openSoulAltar());
    this.input.keyboard?.on('keydown-A', () => this.openAchievementsModal());
    this.input.keyboard?.on('keydown-S', () => this.settingsModal.open('menu'));

    const heroes: HeroClass[] = ['knight', 'ranger', 'wizard'];
    this.input.keyboard?.on('keydown-LEFT', () => {
      const idx = heroes.indexOf(selectedHero);
      selectedHero = heroes[(idx - 1 + heroes.length) % heroes.length];
      updateHeroSelection();
      SoundFX.playMenuClick();
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      const idx = heroes.indexOf(selectedHero);
      selectedHero = heroes[(idx + 1) % heroes.length];
      updateHeroSelection();
      SoundFX.playMenuClick();
    });
  }

  private openSoulAltar(): void {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(DEPTH.UI + 200);

    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x06040c, 0.97);
    backdrop.setInteractive();

    const title = this.add
      .text(width / 2, 45, 'АЛТАРЬ ДУШ · ВЕЧНАЯ ПРОКАЧКА', {
        fontFamily: FONT.TITLE,
        fontSize: '22px',
        fontStyle: '700',
        color: '#f97316',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 5);

    const embersLabel = this.add
      .text(width / 2, 75, `Доступно Углей: ${MetaManager.get().embers}`, {
        fontFamily: FONT.UI,
        fontSize: '14px',
        fontStyle: '600',
        color: '#fbbf24',
      })
      .setOrigin(0.5);

    modal.add([backdrop, title, embersLabel]);

    const startY = 115;
    const cardH = 50;
    const meta = MetaManager.get();

    const renderUpgrades = () => {
      // Clean previous cards
      modal.each((child: Phaser.GameObjects.GameObject) => {
        if ((child as { isCard?: boolean }).isCard) child.destroy();
      });

      embersLabel.setText(`Доступно Углей: ${meta.embers}`);

      META_UPGRADES.forEach((upg, idx) => {
        const y = startY + idx * (cardH + 8);
        const card = this.add.container(width / 2, y);
        (card as { isCard?: boolean }).isCard = true;

        const currentLvl = meta.getUpgradeLevel(upg.id);
        const isMax = currentLvl >= upg.maxLevel;
        const cost = meta.getUpgradeCost(upg.id);
        const canAfford = cost !== null && meta.embers >= cost;

        const bg = this.add.rectangle(0, 0, Math.min(width * 0.9, 440), cardH, 0x171024, 0.9);
        bg.setStrokeStyle(1.5, isMax ? 0xf59e0b : 0x475569);

        const icon = this.add
          .text(-190, 0, upg.icon, {
            fontSize: '18px',
          })
          .setOrigin(0.5);

        const name = this.add
          .text(-165, -10, upg.name, {
            fontFamily: FONT.UI,
            fontSize: '12px',
            fontStyle: '700',
            color: upg.color,
          })
          .setOrigin(0, 0.5);

        const desc = this.add
          .text(-165, 10, upg.desc, {
            fontFamily: FONT.UI,
            fontSize: '9px',
            color: '#94a3b8',
          })
          .setOrigin(0, 0.5);

        const bars = '■'.repeat(currentLvl) + '□'.repeat(upg.maxLevel - currentLvl);
        const lvlText = this.add
          .text(45, -10, `${bars} (${currentLvl}/${upg.maxLevel})`, {
            fontFamily: FONT.UI,
            fontSize: '10px',
            fontStyle: '700',
            color: isMax ? '#f59e0b' : '#94a3b8',
          })
          .setOrigin(0.5);

        const bonusText = this.add
          .text(45, 10, currentLvl > 0 ? upg.formatValue(currentLvl) : 'нет', {
            fontFamily: FONT.UI,
            fontSize: '10px',
            color: currentLvl > 0 ? '#4ade80' : '#64748b',
          })
          .setOrigin(0.5);

        // Buy button
        const btnBg = this.add.rectangle(150, 0, 95, 28, isMax ? 0x27272a : canAfford ? 0xc2410c : 0x3f3f46, 1);
        btnBg.setStrokeStyle(1, isMax ? 0x52525b : canAfford ? 0xf97316 : 0x71717a);

        const btnText = this.add
          .text(150, 0, isMax ? 'МАКС.' : `КУПИТЬ (${cost})`, {
            fontFamily: FONT.UI,
            fontSize: '9px',
            fontStyle: '700',
            color: isMax ? '#a1a1aa' : canAfford ? '#ffffff' : '#a1a1aa',
          })
          .setOrigin(0.5);

        if (!isMax && canAfford) {
          btnBg.setInteractive({ useHandCursor: true });
          btnBg.on('pointerdown', () => {
            if (meta.buyUpgrade(upg.id)) {
              SoundFX.playItemAcquired();
              renderUpgrades();
            }
          });
        }

        card.add([bg, icon, name, desc, lvlText, bonusText, btnBg, btnText]);
        modal.add(card);
      });
    };

    renderUpgrades();

    const closeBtn = createMenuButton(this, width / 2, height - 32, 160, 36, t().closeBtn ?? 'ЗАКРЫТЬ', {
      fontSize: '12px',
      onClick: () => {
        modal.destroy();
        this.scene.restart();
      },
    });
    modal.add(closeBtn);
  }

  private openAchievementsModal(): void {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(DEPTH.UI + 250);

    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x06040c, 0.97);
    backdrop.setInteractive();

    const achMgr = AchievementManager.get();
    const achList = Object.values(ACHIEVEMENTS);
    const unlockedCount = achList.filter((a) => achMgr.isUnlocked(a.id)).length;
    const totalCount = achList.length;

    const title = this.add
      .text(width / 2, 40, 'ЗАЛ СЛАВЫ · ДОСТИЖЕНИЯ', {
        fontFamily: FONT.TITLE,
        fontSize: '22px',
        fontStyle: '700',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 5);

    const progressLabel = this.add
      .text(width / 2, 70, `Открыто: ${unlockedCount} из ${totalCount} (${Math.round((unlockedCount / totalCount) * 100)}%)`, {
        fontFamily: FONT.UI,
        fontSize: '13px',
        fontStyle: '600',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    modal.add([backdrop, title, progressLabel]);

    const startY = 105;
    const cardW = 260;
    const cardH = 46;
    const gapX = 14;
    const gapY = 8;

    achList.forEach((ach, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = width / 2 + (col === 0 ? -(cardW / 2 + gapX / 2) : cardW / 2 + gapX / 2);
      const y = startY + row * (cardH + gapY);

      const unlocked = achMgr.isUnlocked(ach.id);
      const card = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, cardW, cardH, unlocked ? 0x1a1228 : 0x0e0a16, 0.95);
      const borderColor = unlocked ? Phaser.Display.Color.HexStringToColor(ach.color).color : 0x334155;
      bg.setStrokeStyle(1.5, borderColor);

      // Icon
      let icon: Phaser.GameObjects.GameObject;
      if (ach.iconFrame !== undefined) {
        icon = this.add.sprite(-cardW / 2 + 22, 0, ach.iconTexture, ach.iconFrame);
        (icon as Phaser.GameObjects.Sprite).setScale(1.2);
      } else {
        icon = this.add.sprite(-cardW / 2 + 22, 0, ach.iconTexture);
        (icon as Phaser.GameObjects.Sprite).setScale(1.0);
      }
      if (!unlocked) (icon as Phaser.GameObjects.Sprite).setTint(0x475569);

      const name = this.add
        .text(-cardW / 2 + 42, -12, ach.title, {
          fontFamily: FONT.UI,
          fontSize: '11px',
          fontStyle: '700',
          color: unlocked ? '#f0e2b8' : '#64748b',
        })
        .setOrigin(0, 0);

      const desc = this.add
        .text(-cardW / 2 + 42, 3, ach.desc, {
          fontFamily: FONT.UI,
          fontSize: '8px',
          color: unlocked ? '#94a3b8' : '#475569',
        })
        .setOrigin(0, 0);

      const status = this.add
        .text(cardW / 2 - 8, -12, unlocked ? '[OK]' : '[X]', {
          fontFamily: FONT.UI,
          fontSize: '9px',
          fontStyle: '700',
          color: unlocked ? '#4ade80' : '#64748b',
        })
        .setOrigin(1, 0);

      card.add([bg, icon, name, desc, status]);
      modal.add(card);
    });

    const closeBtn = createMenuButton(this, width / 2, height - 32, 160, 36, t().closeBtn ?? 'ЗАКРЫТЬ', {
      fontSize: '12px',
      onClick: () => modal.destroy(),
    });
    modal.add(closeBtn);
  }

  private openDebugMenu(selectedHero: HeroClass): void {
    const { width, height } = this.scale;
    const modal = this.add.container(width / 2, height / 2).setDepth(DEPTH.UI + 600);

    const modalW = 420;
    const modalH = 340;

    const backdrop = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7);
    backdrop.setInteractive();

    const bg = this.add.rectangle(0, 0, modalW, modalH, 0x0a0614, 0.98);
    bg.setStrokeStyle(2, 0x818cf8);

    const title = this.add
      .text(0, -modalH / 2 + 20, 'МЕНЮ РАЗРАБОТЧИКА (DEBUG)', {
        fontFamily: FONT.TITLE,
        fontSize: '16px',
        fontStyle: '700',
        color: '#818cf8',
      })
      .setOrigin(0.5);

    const closeBtn = this.add
      .text(modalW / 2 - 18, -modalH / 2 + 18, 'ЗАКРЫТЬ', {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: '700',
        color: '#ef4444',
      })
      .setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => modal.destroy());

    modal.add([backdrop, bg, title, closeBtn]);

    // Section 1: Level Warp
    const sec1Title = this.add
      .text(-modalW / 2 + 20, -105, 'БЫСТРЫЙ СТАРТ С ВЫБРАННЫМ ГЕРОЕМ:', {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: '700',
        color: '#fbbf24',
      })
      .setOrigin(0, 0.5);
    modal.add(sec1Title);

    const levels = [
      { depth: 1, name: '[1] РУИНЫ', color: 0x22c55e, hex: '#86efac' },
      { depth: 2, name: '[2] КАТАКОМБЫ', color: 0xa855f7, hex: '#d8b4fe' },
      { depth: 3, name: '[3] НЕДРА', color: 0xef4444, hex: '#fca5a5' },
      { depth: 4, name: '[4] БЕЗДНА', color: 0x6366f1, hex: '#a5b4fc' },
    ];

    levels.forEach((lvl, i) => {
      const btnX = -100 + (i % 2) * 200;
      const btnY = -75 + Math.floor(i / 2) * 32;

      const btnBg = this.add.rectangle(btnX, btnY, 185, 26, 0x1e1b4b, 0.9);
      btnBg.setStrokeStyle(1.5, lvl.color);

      const btnText = this.add
        .text(btnX, btnY, lvl.name, {
          fontFamily: FONT.UI,
          fontSize: '9px',
          fontStyle: '700',
          color: lvl.hex,
        })
        .setOrigin(0.5);

      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on('pointerdown', () => {
        modal.destroy();
        this.cameras.main.fadeOut(200, 8, 6, 12);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(SCENE.GAME, { depth: lvl.depth, heroClass: selectedHero });
        });
      });

      modal.add([btnBg, btnText]);
    });

    // Section 2: Meta Cheats
    const sec2Title = this.add
      .text(-modalW / 2 + 20, 0, 'УПРАВЛЕНИЕ ПРОГРЕССОМ:', {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: '700',
        color: '#38bdf8',
      })
      .setOrigin(0, 0.5);
    modal.add(sec2Title);

    const cheats = [
      {
        label: '+1000 УГЛЕЙ (EMBERS)',
        color: 0xf97316,
        hex: '#fdba74',
        onClick: () => {
          MetaManager.get().addEmbers(1000);
          modal.destroy();
          this.scene.restart();
        },
      },
      {
        label: 'ОТКРЫТЬ ВСЕ АЧИВКИ',
        color: 0x34d399,
        hex: '#a7f3d0',
        onClick: () => {
          Object.values(ACHIEVEMENTS).forEach((a) => AchievementManager.get().unlock(a.id, this));
          modal.destroy();
          this.openAchievementsModal();
        },
      },
      {
        label: 'СТАРТ: РЕЖИМ БОГА (GOD)',
        color: 0xeab308,
        hex: '#fef08a',
        onClick: () => {
          modal.destroy();
          this.scene.start(SCENE.GAME, { depth: 1, heroClass: selectedHero, godMode: true });
        },
      },
      {
        label: 'СБРОСИТЬ ВЕСЬ ПРОГРЕСС',
        color: 0xef4444,
        hex: '#fca5a5',
        onClick: () => {
          MetaManager.get().resetProgress();
          modal.destroy();
          this.scene.restart();
        },
      },
    ];

    cheats.forEach((c, i) => {
      const btnX = -100 + (i % 2) * 200;
      const btnY = 30 + Math.floor(i / 2) * 32;

      const btnBg = this.add.rectangle(btnX, btnY, 185, 26, 0x18181b, 0.9);
      btnBg.setStrokeStyle(1.5, c.color);

      const btnText = this.add
        .text(btnX, btnY, c.label, {
          fontFamily: FONT.UI,
          fontSize: '9px',
          fontStyle: '700',
          color: c.hex,
        })
        .setOrigin(0.5);

      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on('pointerdown', () => c.onClick());

      modal.add([btnBg, btnText]);
    });
  }
}
