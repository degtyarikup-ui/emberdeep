import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { ITEMS } from '../items/registry';
import { ItemDef } from '../items/types';
import { ITEM_SPRITE_MAP } from '../gfx/UIAtlas';
import { PixelUI } from '../gfx/PixelUI';
import { Tooltip } from './Tooltip';

export class InventoryTray {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private itemSlots: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.container = scene.add.container(w - 20, h - 42);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);

    scene.cameras.main.ignore(this.container);
  }

  public updateItems(itemsMap: Record<string, number>): void {
    for (const slot of this.itemSlots) {
      slot.destroy();
    }
    this.itemSlots = [];

    const activeItemIds = Object.keys(itemsMap).filter((id) => itemsMap[id] > 0);
    const slotSize = 42;
    const spacing = 8;

    activeItemIds.forEach((id, idx) => {
      const count = itemsMap[id];
      const itemDef: ItemDef | undefined = ITEMS[id];
      if (!itemDef) return;

      const posX = -((activeItemIds.length - 1 - idx) * (slotSize + spacing)) - slotSize / 2;
      const slot = this.createItemSlot(posX, 0, itemDef, count, slotSize);
      this.container.add(slot);
      this.itemSlots.push(slot);
    });
  }

  private createItemSlot(
    x: number,
    y: number,
    item: ItemDef,
    count: number,
    size: number
  ): Phaser.GameObjects.Container {
    const slot = this.scene.add.container(x, y);

    const tier: 'common' | 'uncommon' | 'rare' | 'legendary' =
      item.tier === 'legendary' ? 'legendary' : item.tier === 'uncommon' ? 'uncommon' : 'common';

    const slotBg = PixelUI.createSlot(this.scene, 0, 0, size, tier);
    slot.add(slotBg);

    // Sprite Icon (32rogues 32x32)
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

    // Stack Count Badge
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

    // Hover Tooltip & Interactive Pulse
    slotBg.setInteractive({ useHandCursor: true })
      .on('pointerover', (pointer: Phaser.Input.Pointer) => {
        this.scene.tweens.add({
          targets: slot,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 100,
          ease: 'Quad.easeOut',
        });
        Tooltip.get(this.scene).show(pointer.x, pointer.y, {
          title: item.name,
          description: item.desc,
          rarityColor: item.color,
          subtext: item.element ? `[ СТИХИЯ: ${item.element.toUpperCase()} ]` : undefined,
        });
      })
      .on('pointerout', () => {
        this.scene.tweens.add({
          targets: slot,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 100,
          ease: 'Quad.easeOut',
        });
        Tooltip.get(this.scene).hide();
      });

    return slot;
  }

  public handleResize(width: number, height: number): void {
    this.container.setPosition(width - 20, height - 42);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
