import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { Player } from '../entities/Player';
import { ITEMS } from '../items/registry';
import { ItemDef } from '../items/types';
import { ITEM_SPRITE_MAP } from '../gfx/UIAtlas';
import { MetaManager } from '../meta/MetaManager';
import { Tooltip } from './Tooltip';

export class StatsModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isVisible = false;

  private statsTexts: Phaser.GameObjects.Text[] = [];
  private itemSlotsContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.container = scene.add.container(w / 2, h / 2);
    this.container.setDepth(DEPTH.UI + 300);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    this.buildModal();

    scene.cameras.main.ignore(this.container);
  }

  private buildModal(): void {
    const modalW = 500;
    const modalH = 300;

    // Dark backdrop overlay
    const backdrop = this.scene.add.rectangle(0, 0, this.scene.scale.width * 2, this.scene.scale.height * 2, 0x000000, 0.75);
    backdrop.setInteractive(); // Blocks clicks to the game world while open
    this.container.add(backdrop);

    // Main Ornate Panel
    const panelBg = this.scene.add.rectangle(0, 0, modalW, modalH, 0x0f172a, 0.96);
    panelBg.setStrokeStyle(2, 0xd97706, 0.98);

    const innerBevel = this.scene.add.rectangle(0, 0, modalW - 8, modalH - 8, 0x020617, 0.5);
    innerBevel.setStrokeStyle(1, 0xfbbf24, 0.35);

    // Header Title
    const title = this.scene.add.text(0, -modalH / 2 + 18, 'ХАРАКТЕРИСТИКИ ГЕРОЯ И АРТЕФАКТЫ', {
      fontFamily: FONT.TITLE,
      fontSize: '14px',
      fontStyle: '700',
      color: '#fbbf24',
    }).setOrigin(0.5, 0.5);
    title.setStroke('#451a03', 4);

    // Close button prompt
    const closePrompt = this.scene.add.text(0, modalH / 2 - 16, '[TAB] / [ESC] — ЗАКРЫТЬ ОКНО', {
      fontFamily: FONT.UI,
      fontSize: '9px',
      color: '#94a3b8',
    }).setOrigin(0.5, 0.5);

    // Left Column: Stats Panel
    const leftW = 210;
    const leftH = modalH - 70;
    const leftX = -modalW / 2 + leftW / 2 + 20;
    const leftY = 6;

    const leftBg = this.scene.add.rectangle(leftX, leftY, leftW, leftH, 0x0b1120, 0.9);
    leftBg.setStrokeStyle(1, 0x334155);

    const statsHeader = this.scene.add.text(leftX, leftY - leftH / 2 + 14, 'ХАРАКТЕРИСТИКИ', {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#38bdf8',
    }).setOrigin(0.5, 0.5);

    // Right Column: Items Panel
    const rightW = 230;
    const rightH = modalH - 70;
    const rightX = modalW / 2 - rightW / 2 - 20;
    const rightY = 6;

    const rightBg = this.scene.add.rectangle(rightX, rightY, rightW, rightH, 0x0b1120, 0.9);
    rightBg.setStrokeStyle(1, 0x334155);

    const itemsHeader = this.scene.add.text(rightX, rightY - rightH / 2 + 14, 'СОБРАННЫЕ АРТЕФАКТЫ', {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#fbbf24',
    }).setOrigin(0.5, 0.5);

    this.itemSlotsContainer = this.scene.add.container(rightX, rightY);

    this.container.add([
      panelBg,
      innerBevel,
      title,
      closePrompt,
      leftBg,
      statsHeader,
      rightBg,
      itemsHeader,
      this.itemSlotsContainer,
    ]);
  }

  public toggle(player: Player): void {
    if (this.isVisible) {
      this.close();
    } else {
      this.open(player);
    }
  }

  public open(player: Player): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.container.setVisible(true);
    this.container.setScale(0.85);
    this.container.setAlpha(0);

    this.refresh(player);

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  public close(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    Tooltip.get(this.scene).hide();

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 0.9,
      scaleY: 0.9,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }

  public get isOpen(): boolean {
    return this.isVisible;
  }

  public refresh(player: Player): void {
    // 1. Update Stats on the left
    for (const st of this.statsTexts) st.destroy();
    this.statsTexts = [];

    const meta = MetaManager.get();
    const metaBonuses = meta.getBonuses();
    const items = player.items;

    // Damage bonus
    const whetstoneBonus = (items.whetstone ?? 0) * 20;
    const totalDmgPercent = Math.round((100 + whetstoneBonus) * metaBonuses.damageMultiplier);

    // Crit chance
    const critBonus = (items.crit_dagger ?? 0) * 15;
    const totalCrit = Math.round(5 + critBonus + metaBonuses.extraCrit * 100);

    // Speed
    const bootsBonus = (items.boots ?? 0) * 15;
    const totalSpeedPercent = Math.round((100 + bootsBonus) * metaBonuses.speedMultiplier);

    const statsList = [
      { label: 'Класс:', val: player.heroClass === 'ranger' ? 'Лучник' : 'Рыцарь', col: '#cbd5e1' },
      { label: 'Здоровье (HP):', val: `${player.hp} / ${player.maxHp}`, col: '#ef4444' },
      { label: 'Сила атаки:', val: `${totalDmgPercent}%`, col: '#f87171' },
      { label: 'Шанс крита:', val: `${totalCrit}%`, col: '#fbbf24' },
      { label: 'Скорость бега:', val: `${totalSpeedPercent}%`, col: '#4ade80' },
      { label: 'Вампиризм:', val: items.leech_fang ? 'АКТИВЕН (15%)' : 'НЕТ', col: items.leech_fang ? '#a855f7' : '#64748b' },
      { label: 'Бессмертие:', val: items.immortal_crown ? `ДА (${items.immortal_crown})` : 'НЕТ', col: items.immortal_crown ? '#facc15' : '#64748b' },
      { label: 'Золото в кармане:', val: `${player.gold} 🪙`, col: '#fbbf24' },
      { label: 'Эмберы бездны:', val: `${meta.embers} 🔥`, col: '#f97316' },
    ];

    const leftX = -500 / 2 + 210 / 2 + 20;
    const startY = -80;

    statsList.forEach((stat, i) => {
      const y = startY + i * 18;
      const lbl = this.scene.add.text(leftX - 90, y, stat.label, {
        fontFamily: FONT.UI,
        fontSize: '9px',
        color: '#94a3b8',
      });
      const val = this.scene.add.text(leftX + 90, y, stat.val, {
        fontFamily: FONT.UI,
        fontSize: '9px',
        fontStyle: '700',
        color: stat.col,
      }).setOrigin(1, 0);

      this.container.add([lbl, val]);
      this.statsTexts.push(lbl, val);
    });

    // 2. Update Items Grid on the right
    this.itemSlotsContainer.removeAll(true);

    const activeItemIds = Object.keys(items).filter((id) => items[id] > 0);
    if (activeItemIds.length === 0) {
      const noItems = this.scene.add.text(0, 0, 'НЕТ СОБРАННЫХ АРТЕФАКТОВ\n\nОткрывайте сундуки и\nпосещайте святилища!', {
        fontFamily: FONT.UI,
        fontSize: '10px',
        color: '#64748b',
        align: 'center',
      }).setOrigin(0.5, 0.5);
      this.itemSlotsContainer.add(noItems);
      return;
    }

    const slotSize = 38;
    const cols = 5;
    const spacing = 6;
    const startGridX = -((cols * (slotSize + spacing) - spacing) / 2) + slotSize / 2;
    const startGridY = -70;

    activeItemIds.forEach((id, idx) => {
      const count = items[id];
      const itemDef: ItemDef | undefined = ITEMS[id];
      if (!itemDef) return;

      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const sx = startGridX + col * (slotSize + spacing);
      const sy = startGridY + row * (slotSize + spacing);

      const slot = this.createItemGridSlot(sx, sy, itemDef, count);
      this.itemSlotsContainer.add(slot);
    });
  }

  private createItemGridSlot(x: number, y: number, item: ItemDef, count: number): Phaser.GameObjects.Container {
    const slot = this.scene.add.container(x, y);

    const rarityHex = item.color ?? '#facc15';
    const rarityColor = Phaser.Display.Color.HexStringToColor(rarityHex).color;

    const bg = this.scene.add.rectangle(0, 0, 36, 36, 0x0f172a, 0.95);
    bg.setStrokeStyle(2, rarityColor, 0.95);

    const inner = this.scene.add.rectangle(0, 0, 30, 30, 0x030712, 0.6);

    const iconCoord = ITEM_SPRITE_MAP[item.id];
    let icon: Phaser.GameObjects.Sprite;
    if (iconCoord) {
      const frameIndex = iconCoord.row * 11 + iconCoord.col;
      icon = this.scene.add.sprite(0, 0, TEXTURE.ITEMS_32ROGUES, frameIndex);
      icon.setScale(0.9);
    } else {
      icon = this.scene.add.sprite(0, 0, TEXTURE.PROPS, item.icon);
      icon.setScale(1.2);
    }

    slot.add([bg, inner, icon]);

    if (count > 1) {
      const badgeBg = this.scene.add.rectangle(12, 11, 14, 11, 0x000000, 0.9);
      badgeBg.setStrokeStyle(1, 0xfbbf24);

      const countText = this.scene.add.text(12, 11, `x${count}`, {
        fontFamily: FONT.UI,
        fontSize: '8px',
        fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0.5, 0.5);

      slot.add([badgeBg, countText]);
    }

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', (pointer: Phaser.Input.Pointer) => {
        Tooltip.get(this.scene).show(pointer.x, pointer.y, {
          title: item.name,
          description: item.desc,
          rarityColor: item.color,
          subtext: item.element ? `[ЭЛЕМЕНТ: ${item.element.toUpperCase()}]` : undefined,
        });
      })
      .on('pointerout', () => {
        Tooltip.get(this.scene).hide();
      });

    return slot;
  }

  public handleResize(width: number, height: number): void {
    this.container.setPosition(width / 2, height / 2);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
