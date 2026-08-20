import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { HeroClass, Player } from '../entities/Player';
import { ITEM_SPRITE_MAP } from '../gfx/UIAtlas';
import { Tooltip } from './Tooltip';

export class ActionBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Slot Containers
  private attackSlot!: Phaser.GameObjects.Container;
  private specialSlot!: Phaser.GameObjects.Container;
  private dashSlot!: Phaser.GameObjects.Container;
  private interactSlot!: Phaser.GameObjects.Container;

  // Cooldown & Contextual Elements
  private specialCooldownSweep!: Phaser.GameObjects.Graphics;
  private specialCooldownText!: Phaser.GameObjects.Text;
  private interactGlow!: Phaser.GameObjects.Rectangle;

  private heroClass: HeroClass;

  constructor(scene: Phaser.Scene, heroClass: HeroClass) {
    this.scene = scene;
    this.heroClass = heroClass;

    const w = scene.scale.width;
    const h = scene.scale.height;

    this.container = scene.add.container(w / 2, h - 34);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);

    this.createSlots();

    scene.cameras.main.ignore(this.container);
  }

  private createSlots(): void {
    const slotSize = 40;
    const spacing = 12;
    const totalW = 4 * slotSize + 3 * spacing;
    const startX = -totalW / 2 + slotSize / 2;

    // 1. Attack Slot (LMB)
    this.attackSlot = this.createAbilitySlot(
      startX,
      'ЛКМ',
      this.heroClass === 'ranger' ? 'ВЫСТРЕЛ ИЗ ЛУКА' : 'УДАР МЕЧОМ',
      this.heroClass === 'ranger' ? ITEM_SPRITE_MAP.ranger_bow : ITEM_SPRITE_MAP.knight_sword,
      'Базовая атака оружием'
    );
    this.container.add(this.attackSlot);

    // 2. Special Slot (ПКМ / Q)
    const specialPos = startX + (slotSize + spacing);
    this.specialSlot = this.createAbilitySlot(
      specialPos,
      'ПКМ / Q',
      this.heroClass === 'ranger' ? 'ВЕЕРНЫЙ ЗАЛП' : 'ВИХРЬ КЛИНКОВ',
      this.heroClass === 'ranger' ? { col: 1, row: 9 } : { col: 6, row: 1 },
      this.heroClass === 'ranger'
        ? 'Выпускает 5 пробивающих стрел веером (Кулдаун: 4.0с)'
        : 'Круговой вихревой удар вокруг рыцаря (Кулдаун: 3.5с)'
    );

    // Cooldown overlay graphics
    this.specialCooldownSweep = this.scene.add.graphics();
    this.specialSlot.add(this.specialCooldownSweep);

    this.specialCooldownText = this.scene.add.text(0, 0, '', {
      fontFamily: FONT.UI,
      fontSize: '13px',
      fontStyle: '700',
      color: '#facc15',
    });
    this.specialCooldownText.setOrigin(0.5, 0.5);
    this.specialCooldownText.setStroke('#000000', 4);
    this.specialSlot.add(this.specialCooldownText);

    this.container.add(this.specialSlot);

    // 3. Dash Slot (Shift)
    const dashPos = startX + 2 * (slotSize + spacing);
    this.dashSlot = this.createAbilitySlot(
      dashPos,
      'SHIFT',
      'СПРИНТ / РЫВОК',
      ITEM_SPRITE_MAP.dash_icon,
      'Увеличение скорости бега и уклонение от врагов'
    );
    this.container.add(this.dashSlot);

    // 4. Interact Slot (E)
    const interactPos = startX + 3 * (slotSize + spacing);
    this.interactSlot = this.createAbilitySlot(
      interactPos,
      'E',
      'ДЕЙСТВИЕ',
      ITEM_SPRITE_MAP.interact_icon,
      'Взаимодействие с сундуками, алтарями, кострами и спуском'
    );

    this.interactGlow = this.scene.add.rectangle(0, 0, slotSize + 4, slotSize + 4, 0x38bdf8, 0);
    this.interactGlow.setStrokeStyle(2, 0x38bdf8, 0);
    this.interactSlot.addAt(this.interactGlow, 0);

    this.container.add(this.interactSlot);
  }

  private createAbilitySlot(
    x: number,
    hotkey: string,
    name: string,
    iconCoord: { col: number; row: number },
    desc: string
  ): Phaser.GameObjects.Container {
    const slot = this.scene.add.container(x, 0);

    // Slot Frame Background
    const bg = this.scene.add.rectangle(0, 0, 38, 38, 0x0f172a, 0.95);
    bg.setStrokeStyle(2, 0xd97706, 0.95);

    const inner = this.scene.add.rectangle(0, 0, 32, 32, 0x020617, 0.7);
    inner.setStrokeStyle(1, 0xfbbf24, 0.3);

    // 32rogues Icon
    const frameIndex = iconCoord.row * 11 + iconCoord.col;
    const icon = this.scene.add.sprite(0, 0, TEXTURE.ITEMS_32ROGUES, frameIndex);
    icon.setScale(0.9);

    // Hotkey badge at bottom
    const badgeBg = this.scene.add.rectangle(0, 16, 26, 11, 0x000000, 0.85);
    badgeBg.setStrokeStyle(1, 0x94a3b8);

    const badgeText = this.scene.add.text(0, 16, hotkey, {
      fontFamily: FONT.UI,
      fontSize: '8px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0.5, 0.5);

    slot.add([bg, inner, icon, badgeBg, badgeText]);

    // Hover Tooltip
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', (pointer: Phaser.Input.Pointer) => {
        Tooltip.get(this.scene).show(pointer.x, pointer.y, {
          title: `[${hotkey}] ${name}`,
          description: desc,
          rarityColor: '#38bdf8',
        });
      })
      .on('pointerout', () => {
        Tooltip.get(this.scene).hide();
      });

    return slot;
  }

  public update(_player?: Player, specialCooldownRatio = 0, specialCooldownSec = 0, inInteractRange = false): void {
    // 1. Update Special Cooldown Overlay
    this.specialCooldownSweep.clear();
    if (specialCooldownRatio > 0) {
      const size = 36;
      this.specialCooldownSweep.fillStyle(0x000000, 0.75);
      this.specialCooldownSweep.slice(
        0,
        0,
        size / 2,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * specialCooldownRatio,
        false
      );
      this.specialCooldownSweep.fillPath();

      this.specialCooldownText.setText(specialCooldownSec > 0 ? specialCooldownSec.toFixed(1) : '');
      this.specialCooldownText.setVisible(true);
    } else {
      this.specialCooldownText.setVisible(false);
    }

    // 2. Update Interact Slot Glow when in range
    if (inInteractRange) {
      this.interactGlow.setAlpha(0.6 + Math.sin(this.scene.time.now / 150) * 0.3);
      this.interactGlow.setStrokeStyle(2, 0x38bdf8, 0.9);
    } else {
      this.interactGlow.setAlpha(0);
    }
  }

  public handleResize(width: number, height: number): void {
    this.container.setPosition(width / 2, height - 34);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
