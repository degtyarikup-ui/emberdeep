import Phaser from 'phaser';
import { SCENE } from './keys';
import { TEXTURE, ANIM, DEPTH, FONT } from '../gfx/registry';
import { TILE_INDEX } from '../gfx/tiles';
import { MetaManager, META_UPGRADES } from '../meta/MetaManager';
import { SoundFX } from '../audio/SoundFX';

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

    // flanking torches
    const torchY = height * 0.36;
    for (const tx of [width * 0.28, width * 0.72]) {
      const sprite = this.add.sprite(tx, torchY, TEXTURE.TORCH, 0).setDepth(DEPTH.DECOR).setPipeline('Light2D').setScale(2.4);
      sprite.play(ANIM.TORCH_FLICKER);
      this.lights.addLight(tx, torchY, 220, 0xff9a4d, 1.6);
    }

    this.lights.addLight(width / 2, height * 0.3, 260, 0xcbb3ff, 0.35);

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

    this.add
      .text(width / 2, height * 0.32, 'EMBERDEEP', {
        fontFamily: FONT.TITLE,
        fontSize: '58px',
        fontStyle: '700',
        color: '#f0e2b8',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI)
      .setStroke('#0d0a10', 8)
      .setShadow(0, 4, '#000000', 10, true, true);

    this.add
      .text(width / 2, height * 0.32 + 46, 'тёмное фэнтези · кооп-рогалик · до 4 игроков', {
        fontFamily: FONT.UI,
        fontSize: '13px',
        fontStyle: '500',
        color: '#a89bc4',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.UI);

    let selectedHero: 'knight' | 'ranger' = 'knight';

    // Hero Selection Container
    const heroY = height * 0.48;
    const knightBtn = this.add.container(width / 2 - 95, heroY).setDepth(DEPTH.UI);
    const knightBg = this.add.rectangle(0, 0, 160, 42, 0x1e1528, 0.9).setStrokeStyle(2, 0xfbbf24);
    const knightText = this.add
      .text(0, -6, '🗡️ РЫЦАРЬ', {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '700',
        color: '#f0e2b8',
      })
      .setOrigin(0.5);
    const knightSub = this.add
      .text(0, 8, '3 HP · Меч · Вихрь (ПКМ)', {
        fontFamily: FONT.UI,
        fontSize: '8px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
    knightBtn.add([knightBg, knightText, knightSub]);
    knightBg.setInteractive({ useHandCursor: true });

    const rangerBtn = this.add.container(width / 2 + 95, heroY).setDepth(DEPTH.UI);
    const rangerBg = this.add.rectangle(0, 0, 160, 42, 0x120d1c, 0.6).setStrokeStyle(1.5, 0x475569);
    const rangerText = this.add
      .text(0, -6, '🏹 СЛЕДОПЫТ', {
        fontFamily: FONT.UI,
        fontSize: '12px',
        fontStyle: '700',
        color: '#8b8398',
      })
      .setOrigin(0.5);
    const rangerSub = this.add
      .text(0, 8, '2 HP · Лук · Залп стрел (ПКМ)', {
        fontFamily: FONT.UI,
        fontSize: '8px',
        color: '#64748b',
      })
      .setOrigin(0.5);
    rangerBtn.add([rangerBg, rangerText, rangerSub]);
    rangerBg.setInteractive({ useHandCursor: true });

    const updateHeroSelection = () => {
      if (selectedHero === 'knight') {
        knightBg.setFillStyle(0x1e1528, 0.95).setStrokeStyle(2, 0xfbbf24);
        knightText.setColor('#f0e2b8');
        rangerBg.setFillStyle(0x120d1c, 0.6).setStrokeStyle(1.5, 0x475569);
        rangerText.setColor('#8b8398');
      } else {
        rangerBg.setFillStyle(0x1e1528, 0.95).setStrokeStyle(2, 0x4ade80);
        rangerText.setColor('#4ade80');
        knightBg.setFillStyle(0x120d1c, 0.6).setStrokeStyle(1.5, 0x475569);
        knightText.setColor('#8b8398');
      }
    };

    knightBg.on('pointerdown', () => {
      selectedHero = 'knight';
      updateHeroSelection();
    });

    rangerBg.on('pointerdown', () => {
      selectedHero = 'ranger';
      updateHeroSelection();
    });

    const playBtn = makeButton(this, width / 2, height * 0.60, 'ИГРАТЬ');
    playBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(280, 8, 6, 12);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE.GAME, { heroClass: selectedHero });
      });
    });

    const altarBtn = makeButton(this, width / 2, height * 0.60 + 40, '🔥 АЛТАРЬ ДУШ (ПРОКАЧКА)');
    altarBtn.on('pointerdown', () => {
      this.openSoulAltar();
    });

    const coopBtn = makeButton(this, width / 2, height * 0.60 + 80, 'СЕТЕВОЙ КООПЕРАТИВ', { fontSize: '15px', muted: true });
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
}
