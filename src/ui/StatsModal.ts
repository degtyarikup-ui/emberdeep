import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { Player } from '../entities/Player';
import { ITEMS } from '../items/registry';
import { ItemDef } from '../items/types';
import { ITEM_SPRITE_MAP } from '../gfx/UIAtlas';
import { MetaManager } from '../meta/MetaManager';
import { PixelUI, PIXEL_UI_TEXTURE } from '../gfx/PixelUI';
import { Tooltip } from './Tooltip';

export class StatsModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isVisible = false;

  private statsTexts: Phaser.GameObjects.GameObject[] = [];
  private itemSlotsContainer!: Phaser.GameObjects.Container;
  private itemDetailContainer!: Phaser.GameObjects.Container;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailDesc!: Phaser.GameObjects.Text;
  private detailTag!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.container = scene.add.container(w / 2, h / 2);
    this.container.setDepth(DEPTH.UI + 500);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    this.buildModal();

    scene.cameras.main.ignore(this.container);
  }

  private buildModal(): void {
    const modalW = 560;
    const modalH = 360;

    // 1. Dark Backdrop Overlay
    const backdrop = this.scene.add.rectangle(0, 0, this.scene.scale.width * 2, this.scene.scale.height * 2, 0x000000, 0.78);
    backdrop.setInteractive(); // Prevent clicking behind
    this.container.add(backdrop);

    // 2. Main 9-slice Stone Panel
    const mainPanel = PixelUI.createPanel(this.scene, 0, 0, modalW, modalH);
    this.container.add(mainPanel);

    // 3. Header Strip
    const header = PixelUI.createHeader(this.scene, 0, -modalH / 2 + 16, modalW - 16, 26);
    this.container.add(header);

    const title = this.scene.add.text(0, -modalH / 2 + 16, '[ I ] ИНВЕНТАРЬ И ХАРАКТЕРИСТИКИ ГЕРОЯ', {
      fontFamily: FONT.TITLE,
      fontSize: '13px',
      fontStyle: '700',
      color: '#fde047',
    }).setOrigin(0.5, 0.5);
    title.setStroke('#000000', 4);
    this.container.add(title);

    // Close [X] Button on Header
    const closeBtn = this.scene.add.sprite(modalW / 2 - 20, -modalH / 2 + 16, PIXEL_UI_TEXTURE.ICONS_SHEET, 8);
    closeBtn.setScale(1.2);
    closeBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.container.add(closeBtn);

    // 4. Left Column: Stats & Hero Info (240px wide)
    const leftW = 240;
    const leftH = modalH - 56;
    const leftX = -modalW / 2 + leftW / 2 + 16;
    const leftY = 16;

    const leftBg = PixelUI.createPanel(this.scene, leftX, leftY, leftW, leftH);
    this.container.add(leftBg);

    const statsHeader = this.scene.add.text(leftX, leftY - leftH / 2 + 14, 'ХАРАКТЕРИСТИКИ', {
      fontFamily: FONT.UI,
      fontSize: '12px',
      fontStyle: '700',
      color: '#38bdf8',
    }).setOrigin(0.5, 0.5);
    statsHeader.setStroke('#000000', 3);
    this.container.add(statsHeader);

    // 5. Right Column: Items Grid & Detail Box (270px wide)
    const rightW = 270;
    const rightH = modalH - 56;
    const rightX = modalW / 2 - rightW / 2 - 16;
    const rightY = 16;

    const rightBg = PixelUI.createPanel(this.scene, rightX, rightY, rightW, rightH);
    this.container.add(rightBg);

    const itemsHeader = this.scene.add.text(rightX, rightY - rightH / 2 + 14, 'СОБРАННЫЕ АРТЕФАКТЫ', {
      fontFamily: FONT.UI,
      fontSize: '12px',
      fontStyle: '700',
      color: '#fbbf24',
    }).setOrigin(0.5, 0.5);
    itemsHeader.setStroke('#000000', 3);
    this.container.add(itemsHeader);

    this.itemSlotsContainer = this.scene.add.container(rightX, rightY - 30);
    this.container.add(this.itemSlotsContainer);

    // Inset Detail Card at bottom of right column
    this.itemDetailContainer = this.scene.add.container(rightX, rightY + 95);
    const detailBox = PixelUI.createSlot(this.scene, 0, 0, rightW - 20, 'inset');
    detailBox.setDisplaySize(rightW - 20, 80);
    this.itemDetailContainer.add(detailBox);

    this.detailTitle = this.scene.add.text(-rightW / 2 + 20, -28, 'ВЫБЕРИТЕ ПРЕДМЕТ', {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#fbbf24',
    });
    this.detailTitle.setStroke('#000000', 3);
    this.itemDetailContainer.add(this.detailTitle);

    this.detailTag = this.scene.add.text(rightW / 2 - 24, -28, '', {
      fontFamily: FONT.UI,
      fontSize: '9px',
      fontStyle: '700',
      color: '#38bdf8',
    }).setOrigin(1, 0);
    this.itemDetailContainer.add(this.detailTag);

    this.detailDesc = this.scene.add.text(-rightW / 2 + 20, -10, 'Наведите курсор на артефакт в инвентаре для просмотра подробного описания и свойств.', {
      fontFamily: FONT.UI,
      fontSize: '9px',
      color: '#cbd5e1',
      wordWrap: { width: rightW - 40 },
    });
    this.detailDesc.setStroke('#000000', 2);
    this.itemDetailContainer.add(this.detailDesc);

    this.container.add(this.itemDetailContainer);
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
    this.container.setScale(0.88);
    this.container.setAlpha(0);

    this.refresh(player);

    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 220,
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
    // 1. Update Stats List on the Left Column
    for (const obj of this.statsTexts) obj.destroy();
    this.statsTexts = [];

    const meta = MetaManager.get();
    const metaBonuses = meta.getBonuses();
    const items = player.items;

    const whetstoneBonus = (items.whetstone ?? 0) * 20;
    const prismBonus = (items.prismatic_prism ?? 0) * 25;
    const totalDmgPercent = Math.round((100 + whetstoneBonus + prismBonus) * metaBonuses.damageMultiplier);

    const critBonus = (items.crit_dagger ?? 0) * 15;
    const totalCrit = Math.round(5 + critBonus + metaBonuses.extraCrit * 100);

    const bootsBonus = (items.boots ?? 0) * 15;
    const totalSpeedPercent = Math.round((100 + bootsBonus) * metaBonuses.speedMultiplier);

    const atkSpeedBonus = (items.berserker_wristband ?? 0) * 20;
    const cooldownReduction = (items.chrono_hourglass ?? 0) * 25;

    const shieldStatus = player.radiantShieldActive
      ? 'ЩИТ [АКТИВЕН]'
      : items.radiant_shield
      ? 'ЩИТ [ЗАРЯД]'
      : items.immortal_crown
      ? `КОРОНА x${items.immortal_crown}`
      : 'НЕТ';

    const statsList = [
      { iconIdx: 0, label: 'ЗДОРОВЬЕ (HP):', val: `${player.hp} / ${player.maxHp}`, col: '#ef4444' },
      { iconIdx: 1, label: 'СИЛА АТАКИ:', val: `${totalDmgPercent}%`, col: '#f87171' },
      { iconIdx: 2, label: 'ШАНС КРИТА:', val: `${totalCrit}%`, col: '#fbbf24' },
      { iconIdx: 3, label: 'СКОРОСТЬ БЕГА:', val: `${totalSpeedPercent}%`, col: '#4ade80' },
      { iconIdx: 4, label: 'СКОР. АТАКИ / КД:', val: `+${atkSpeedBonus}% / -${cooldownReduction}%`, col: '#c084fc' },
      { iconIdx: 5, label: 'БАХИ ЗАЩИТЫ:', val: shieldStatus, col: '#67e8f9' },
      { iconIdx: 6, label: `ЗОЛОТО (x${player.goldMultiplier.toFixed(1)}):`, val: `${player.gold}`, col: '#fbbf24' },
      { iconIdx: 7, label: 'ЭМБЕРЫ БЕЗДНЫ:', val: `${meta.embers}`, col: '#f97316' },
    ];

    const modalW = 560;
    const leftW = 240;
    const leftX = -modalW / 2 + leftW / 2 + 16;
    const startY = -105;

    statsList.forEach((stat, i) => {
      const y = startY + i * 28;

      // Inset Row Strip
      const rowBg = this.scene.add.rectangle(leftX, y, leftW - 24, 22, 0x050811, 0.85);
      rowBg.setStrokeStyle(1, 0x1e293b);
      this.container.add(rowBg);
      this.statsTexts.push(rowBg);

      // Icon
      const icon = this.scene.add.sprite(leftX - leftW / 2 + 24, y, PIXEL_UI_TEXTURE.ICONS_SHEET, stat.iconIdx);
      this.container.add(icon);
      this.statsTexts.push(icon);

      // Label
      const lbl = this.scene.add.text(leftX - leftW / 2 + 38, y, stat.label, {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: '700',
        color: '#94a3b8',
      }).setOrigin(0, 0.5);
      lbl.setStroke('#000000', 3);
      this.container.add(lbl);
      this.statsTexts.push(lbl);

      // Value
      const val = this.scene.add.text(leftX + leftW / 2 - 20, y, stat.val, {
        fontFamily: FONT.UI,
        fontSize: '11px',
        fontStyle: '700',
        color: stat.col,
      }).setOrigin(1, 0.5);
      val.setStroke('#000000', 3);
      this.container.add(val);
      this.statsTexts.push(val);
    });

    // 2. Update Right Column Item Grid
    this.itemSlotsContainer.removeAll(true);

    const activeItemIds = Object.keys(items).filter((id) => items[id] > 0);
    const totalGridSlots = 15; // 3 rows x 5 cols
    const cols = 5;
    const slotSize = 42;
    const spacing = 8;
    const startGridX = -((cols * slotSize + (cols - 1) * spacing) / 2) + slotSize / 2;
    const startGridY = -40;

    for (let i = 0; i < totalGridSlots; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sx = startGridX + col * (slotSize + spacing);
      const sy = startGridY + row * (slotSize + spacing);

      const itemId = activeItemIds[i];
      if (itemId) {
        const count = items[itemId];
        const itemDef: ItemDef | undefined = ITEMS[itemId];
        if (itemDef) {
          const slot = this.createItemGridSlot(sx, sy, itemDef, count, slotSize);
          this.itemSlotsContainer.add(slot);
          continue;
        }
      }

      // Empty Recessed Slot
      const emptySlot = PixelUI.createSlot(this.scene, sx, sy, slotSize, 'inset');
      this.itemSlotsContainer.add(emptySlot);
    }
  }

  private createItemGridSlot(
    x: number,
    y: number,
    item: ItemDef,
    count: number,
    size: number
  ): Phaser.GameObjects.Container {
    const slot = this.scene.add.container(x, y);

    let tier: 'common' | 'uncommon' | 'rare' | 'legendary' = 'common';
    if (item.tier === 'legendary') tier = 'legendary';
    else if (item.tier === 'uncommon') tier = 'uncommon';
    else tier = 'common';

    const slotBg = PixelUI.createSlot(this.scene, 0, 0, size, tier);
    slot.add(slotBg);

    const iconCoord = ITEM_SPRITE_MAP[item.id];
    let icon: Phaser.GameObjects.Sprite;
    if (iconCoord) {
      const frameIndex = iconCoord.row * 11 + iconCoord.col;
      icon = this.scene.add.sprite(0, 0, TEXTURE.ITEMS_32ROGUES, frameIndex);
      icon.setScale(0.95);
    } else {
      icon = this.scene.add.sprite(0, 0, TEXTURE.PROPS, item.icon);
      icon.setScale(1.2);
    }
    slot.add(icon);

    if (count > 1) {
      const badgeBg = this.scene.add.rectangle(12, 11, 16, 12, 0x050811, 0.95);
      badgeBg.setStrokeStyle(1.5, 0xfbbf24);

      const countText = this.scene.add.text(12, 11, `x${count}`, {
        fontFamily: FONT.UI,
        fontSize: '9px',
        fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0.5, 0.5);
      countText.setShadow(0, 1, '#000000', 1, true, true);

      slot.add([badgeBg, countText]);
    }

    slotBg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.detailTitle.setText(item.name.toUpperCase());
        this.detailTitle.setColor(item.color ?? '#fde047');
        this.detailTag.setText(item.element ? `[ ${item.element.toUpperCase()} ]` : '');
        this.detailDesc.setText(item.desc);
      })
      .on('pointerdown', () => {
        this.detailTitle.setText(item.name.toUpperCase());
        this.detailTitle.setColor(item.color ?? '#fde047');
        this.detailTag.setText(item.element ? `[ ${item.element.toUpperCase()} ]` : '');
        this.detailDesc.setText(item.desc);
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
