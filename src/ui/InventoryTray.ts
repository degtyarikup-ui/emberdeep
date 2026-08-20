import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { ITEMS } from '../items/registry';
import { ItemDef } from '../items/types';
import { ITEM_SPRITE_MAP } from '../gfx/UIAtlas';
import { Tooltip } from './Tooltip';

export class InventoryTray {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private itemSlots: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.container = scene.add.container(w - 20, h - 34);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);

    scene.cameras.main.ignore(this.container);
  }

  public updateItems(itemsMap: Record<string, number>): void {
    // Clear old slot containers
    for (const slot of this.itemSlots) {
      slot.destroy();
    }
    this.itemSlots = [];

    const activeItemIds = Object.keys(itemsMap).filter((id) => itemsMap[id] > 0);
    const slotSize = 36;
    const spacing = 6;

    activeItemIds.forEach((id, idx) => {
      const count = itemsMap[id];
      const itemDef: ItemDef | undefined = ITEMS[id];
      if (!itemDef) return;

      // Layout from right to left
      const posX = -((activeItemIds.length - 1 - idx) * (slotSize + spacing)) - slotSize / 2;
      const slot = this.createItemSlot(posX, 0, itemDef, count);
      this.container.add(slot);
      this.itemSlots.push(slot);
    });
  }

  private createItemSlot(x: number, y: number, item: ItemDef, count: number): Phaser.GameObjects.Container {
    const slot = this.scene.add.container(x, y);

    const rarityHex = item.color ?? '#facc15';
    const rarityColor = Phaser.Display.Color.HexStringToColor(rarityHex).color;

    // Slot Background
    const bg = this.scene.add.rectangle(0, 0, 34, 34, 0x0f172a, 0.95);
    bg.setStrokeStyle(2, rarityColor, 0.95);

    const inner = this.scene.add.rectangle(0, 0, 28, 28, 0x030712, 0.6);

    // Sprite Icon (from 32rogues map or fallback to props)
    const iconCoord = ITEM_SPRITE_MAP[item.id];
    let icon: Phaser.GameObjects.Sprite;
    if (iconCoord) {
      const frameIndex = iconCoord.row * 11 + iconCoord.col;
      icon = this.scene.add.sprite(0, 0, TEXTURE.ITEMS_32ROGUES, frameIndex);
      icon.setScale(0.85);
    } else {
      icon = this.scene.add.sprite(0, 0, TEXTURE.PROPS, item.icon);
      icon.setScale(1.2);
    }

    slot.add([bg, inner, icon]);

    // Stack Count Badge
    if (count > 1) {
      const badgeBg = this.scene.add.rectangle(11, 10, 14, 11, 0x000000, 0.9);
      badgeBg.setStrokeStyle(1, 0xfbbf24);

      const countText = this.scene.add.text(11, 10, `x${count}`, {
        fontFamily: FONT.UI,
        fontSize: '8px',
        fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0.5, 0.5);

      slot.add([badgeBg, countText]);
    }

    // Hover Tooltip
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', (pointer: Phaser.Input.Pointer) => {
        Tooltip.get(this.scene).show(pointer.x, pointer.y, {
          title: item.name,
          description: item.desc,
          rarityColor: item.color,
          subtext: item.element ? `Элемент: [${item.element.toUpperCase()}]` : undefined,
        });
      })
      .on('pointerout', () => {
        Tooltip.get(this.scene).hide();
      });

    return slot;
  }

  public handleResize(width: number, height: number): void {
    this.container.setPosition(width - 20, height - 34);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
