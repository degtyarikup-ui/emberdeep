import Phaser from 'phaser';
import { SCENE } from './keys';
import { TEXTURE, ANIM, DEPTH, FONT } from '../gfx/registry';
import { TILE_INDEX } from '../gfx/tiles';
import { ACTORS } from '../gfx/actors';
import { MetaManager, META_UPGRADES } from '../meta/MetaManager';
import { SoundFX } from '../audio/SoundFX';
import { ACHIEVEMENTS } from '../achievements/registry';
import { AchievementManager } from '../achievements/AchievementManager';

function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts: { muted?: boolean; fontSize?: string } = {}
): Phaser.GameObjects.Text {
  const txt = scene.add
    .text(x, y, label, {
      fontFamily: FONT.UI,
      fontSize: opts.fontSize ?? '20px',
      fontStyle: '600',
      color: opts.muted ? '#8b8398' : '#f0e2b8',
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.UI)
    .setPadding(14, 10, 14, 10)
    .setInteractive({ useHandCursor: true });

  txt.on('pointerover', () => {
    scene.tweens.add({ targets: txt, scale: 1.08, duration: 120 });
    txt.setColor(opts.muted ? '#b3aabd' : '#ffce6b');
  });
  txt.on('pointerout', () => {
    scene.tweens.add({ targets: txt, scale: 1, duration: 120 });
    txt.setColor(opts.muted ? '#8b8398' : '#f0e2b8');
  });
  txt.on('pointerdown', () => {
    scene.tweens.add({ targets: txt, scale: 0.96, duration: 60, yoyo: true });
  });

  return txt;
}

export class MenuScene extends Phaser.Scene {
  private resizeTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super(SCENE.MENU);
  }

  create(): void {
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

    this.add.rectangle(0, 0, width, height, 0x0a0710, 0.55).setOrigin(0, 0).setDepth(1);

    // Centered Emberdeep Animated Emblem Crest
    const emblemY = height * 0.16;
    const emblemSprite = this.add
      .sprite(width / 2, emblemY, TEXTURE.GAME_EMBLEM)
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setScale(0.72);
    this.tweens.add({
      targets: emblemSprite,
      y: emblemY - 6,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Flanking wall torches
    const torchY = height * 0.27;
    for (const tx of [width * 0.26, width * 0.74]) {
      const sprite = this.add.sprite(tx, torchY, TEXTURE.TORCH, 0).setDepth(DEPTH.DECOR).setPipeline('Light2D').setScale(2.4);
      sprite.play(ANIM.TORCH_FLICKER);
      this.lights.addLight(tx, torchY, 220, 0xff9a4d, 1.6);
    }

    this.lights.addLight(width / 2, emblemY, 220, 0xff8822, 1.8);
    this.lights.addLight(width / 2, height * 0.29, 260, 0xcbb3ff, 0.45);

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

    // Title & Subtitle
    this.add
      .text(width / 2, height * 0.28, 'EMBERDEEP', {
        fontFamily: FONT.TITLE,
        fontSize: '54px',
        fontStyle: '700',
        color: '#f0e2b8',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setStroke('#0d0a10', 8)
      .setShadow(0, 4, '#000000', 10, true, true);

    this.add
      .text(width / 2, height * 0.28 + 42, 'тёмное фэнтези · кооп-рогалик · до 4 игроков', {
        fontFamily: FONT.UI,
        fontSize: '13px',
        fontStyle: '500',
        color: '#a89bc4',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI);

    let selectedHero: 'knight' | 'ranger' = 'knight';

    // Hero Selection Showcase Cards with Animated Sprites
    const heroY = height * 0.47;
    const cardW = 205;
    const cardH = 68;

    // 1. Knight Card
    const knightBtn = this.add.container(width / 2 - 115, heroY).setDepth(DEPTH.UI);
    const knightBg = this.add.rectangle(0, 0, cardW, cardH, 0x1e1528, 0.95).setStrokeStyle(2, 0xfbbf24);

    const knightSprite = this.add.sprite(-cardW / 2 + 28, 22, ACTORS.HERO.idle.key);
    knightSprite.setOrigin(0.5, 1.0);
    knightSprite.setScale(1.7);
    knightSprite.play(ACTORS.HERO.idle.key);

    const knightSword = this.add.sprite(-cardW / 2 + 38, 10, TEXTURE.WEAPON_SWORD);
    knightSword.setOrigin(0.5, 0.88);
    knightSword.setScale(1.15);
    knightSword.setAngle(20);

    const knightText = this.add
      .text(-cardW / 2 + 56, -20, '🗡️ РЫЦАРЬ', {
        fontFamily: FONT.UI,
        fontSize: '13px',
        fontStyle: '700',
        color: '#f0e2b8',
      })
      .setOrigin(0, 0);

    const knightSub = this.add
      .text(-cardW / 2 + 56, -3, '3 HP · Меч (2x Урон)', {
        fontFamily: FONT.UI,
        fontSize: '9px',
        color: '#fcd34d',
      })
      .setOrigin(0, 0);

    const knightSkill = this.add
      .text(-cardW / 2 + 56, 12, 'ПКМ · Круговой Вихрь', {
        fontFamily: FONT.UI,
        fontSize: '8px',
        color: '#94a3b8',
      })
      .setOrigin(0, 0);

    knightBtn.add([knightBg, knightSprite, knightSword, knightText, knightSub, knightSkill]);
    knightBg.setInteractive({ useHandCursor: true });

    // 2. Ranger Card
    const rangerBtn = this.add.container(width / 2 + 115, heroY).setDepth(DEPTH.UI);
    const rangerBg = this.add.rectangle(0, 0, cardW, cardH, 0x120d1c, 0.65).setStrokeStyle(1.5, 0x475569);

    const rangerSprite = this.add.sprite(-cardW / 2 + 28, 22, TEXTURE.RANGER_IDLE);
    rangerSprite.setOrigin(0.5, 1.0);
    rangerSprite.setScale(1.7);
    rangerSprite.play(ANIM.RANGER_IDLE);

    const rangerBow = this.add.sprite(-cardW / 2 + 38, 10, TEXTURE.BOW);
    rangerBow.setOrigin(0.5, 0.5);
    rangerBow.setScale(1.1);

    const rangerText = this.add
      .text(-cardW / 2 + 56, -20, '🏹 СЛЕДОПЫТ', {
        fontFamily: FONT.UI,
        fontSize: '13px',
        fontStyle: '700',
        color: '#8b8398',
      })
      .setOrigin(0, 0);

    const rangerSub = this.add
      .text(-cardW / 2 + 56, -3, '2 HP · Дальний бой', {
        fontFamily: FONT.UI,
        fontSize: '9px',
        color: '#4ade80',
      })
      .setOrigin(0, 0);

    const rangerSkill = this.add
      .text(-cardW / 2 + 56, 12, 'ПКМ · Залп из 5 стрел', {
        fontFamily: FONT.UI,
        fontSize: '8px',
        color: '#64748b',
      })
      .setOrigin(0, 0);

    rangerBtn.add([rangerBg, rangerSprite, rangerBow, rangerText, rangerSub, rangerSkill]);
    rangerBg.setInteractive({ useHandCursor: true });

    // Gentle idle weapon bobbing
    this.tweens.add({
      targets: [knightSword, rangerBow],
      y: '+=2',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const updateHeroSelection = () => {
      if (selectedHero === 'knight') {
        knightBg.setFillStyle(0x1e1528, 0.95).setStrokeStyle(2, 0xfbbf24);
        knightText.setColor('#f0e2b8');
        knightSprite.setAlpha(1);
        knightSword.setAlpha(1);

        rangerBg.setFillStyle(0x120d1c, 0.6).setStrokeStyle(1.5, 0x475569);
        rangerText.setColor('#8b8398');
        rangerSprite.setAlpha(0.55);
        rangerBow.setAlpha(0.55);
      } else {
        rangerBg.setFillStyle(0x1e1528, 0.95).setStrokeStyle(2, 0x4ade80);
        rangerText.setColor('#4ade80');
        rangerSprite.setAlpha(1);
        rangerBow.setAlpha(1);

        knightBg.setFillStyle(0x120d1c, 0.6).setStrokeStyle(1.5, 0x475569);
        knightText.setColor('#8b8398');
        knightSprite.setAlpha(0.55);
        knightSword.setAlpha(0.55);
      }
    };

    updateHeroSelection();

    knightBg.on('pointerdown', () => {
      selectedHero = 'knight';
      updateHeroSelection();
      this.tweens.add({ targets: knightBtn, scale: 1.05, duration: 80, yoyo: true });
    });

    rangerBg.on('pointerdown', () => {
      selectedHero = 'ranger';
      updateHeroSelection();
      this.tweens.add({ targets: rangerBtn, scale: 1.05, duration: 80, yoyo: true });
    });

    const playBtn = makeButton(this, width / 2, height * 0.60 + 8, 'ИГРАТЬ');
    playBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(280, 8, 6, 12);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE.GAME, { heroClass: selectedHero });
      });
    });

    const altarBtn = makeButton(this, width / 2 - 110, height * 0.60 + 50, '🔥 АЛТАРЬ ДУШ', { fontSize: '15px' });
    altarBtn.on('pointerdown', () => {
      this.openSoulAltar();
    });

    const achBtn = makeButton(this, width / 2 + 110, height * 0.60 + 50, '🏆 ДОСТИЖЕНИЯ', { fontSize: '15px' });
    achBtn.on('pointerdown', () => {
      this.openAchievementsModal();
    });

    const coopBtn = makeButton(this, width / 2, height * 0.60 + 88, 'СЕТЕВОЙ КООПЕРАТИВ', { fontSize: '14px', muted: true });
    coopBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(280, 8, 6, 12);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE.LOBBY, { heroClass: selectedHero });
      });
    });

    // Top Embers counter
    const embersCounter = this.add
      .text(width - 24, 24, `🔥 ${MetaManager.get().embers}`, {
        fontFamily: FONT.UI,
        fontSize: '15px',
        fontStyle: '700',
        color: '#f97316',
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.UI);
    embersCounter.setStroke('#0d0a10', 4);

    this.add
      .image(width / 2, height / 2, TEXTURE.VIGNETTE)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY)
      .setDisplaySize(width * 1.2, height * 1.2);

    const enterToPlay = () => playBtn.emit('pointerdown');
    this.input.keyboard?.once('keydown-ENTER', enterToPlay);
    this.input.keyboard?.once('keydown-SPACE', enterToPlay);
  }

  private openSoulAltar(): void {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(DEPTH.UI + 200);

    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x06040c, 0.94);
    backdrop.setInteractive();

    const title = this.add
      .text(width / 2, 45, '🔥 АЛТАРЬ ДУШ · ВЕЧНАЯ ПРОКАЧКА', {
        fontFamily: FONT.TITLE,
        fontSize: '22px',
        fontStyle: '700',
        color: '#f97316',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 5);

    const embersLabel = this.add
      .text(width / 2, 75, `Доступно Углей: ${MetaManager.get().embers} 🔥`, {
        fontFamily: FONT.UI,
        fontSize: '13px',
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

      embersLabel.setText(`Доступно Углей: ${meta.embers} 🔥`);

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
          .text(150, 0, isMax ? 'МАКС.' : `+ КУПИТЬ (${cost} 🔥)`, {
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

    const closeBtn = makeButton(this, width / 2, height - 35, 'ЗАКРЫТЬ', { fontSize: '15px' });
    closeBtn.on('pointerdown', () => {
      modal.destroy();
      this.scene.restart();
    });
    modal.add(closeBtn);
  }

  private openAchievementsModal(): void {
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(DEPTH.UI + 250);

    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x06040c, 0.94);
    backdrop.setInteractive();

    const achMgr = AchievementManager.get();
    const achList = Object.values(ACHIEVEMENTS);
    const unlockedCount = achList.filter((a) => achMgr.isUnlocked(a.id)).length;
    const totalCount = achList.length;

    const title = this.add
      .text(width / 2, 40, '🏆 ЗАЛ СЛАВЫ · ДОСТИЖЕНИЯ', {
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
        .text(cardW / 2 - 8, -12, unlocked ? '✅' : '🔒', {
          fontSize: '11px',
        })
        .setOrigin(1, 0);

      card.add([bg, icon, name, desc, status]);
      modal.add(card);
    });

    const closeBtn = makeButton(this, width / 2, height - 35, '✖ ЗАКРЫТЬ', { fontSize: '15px' });
    closeBtn.on('pointerdown', () => modal.destroy());
    modal.add(closeBtn);
  }
}
