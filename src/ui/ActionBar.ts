import Phaser from 'phaser';
import { DEPTH, FONT, TEXTURE } from '../gfx/registry';
import { HeroClass, Player } from '../entities/Player';
import { ITEM_SPRITE_MAP } from '../gfx/UIAtlas';
import { PixelUI, PIXEL_UI_TEXTURE } from '../gfx/PixelUI';
import { Tooltip } from './Tooltip';

export class ActionBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Slot Containers
  private attackSlot!: Phaser.GameObjects.Container;
  private attackElementRune!: Phaser.GameObjects.Sprite;
  private attackSlotBg!: Phaser.GameObjects.NineSlice;

  private specialSlot!: Phaser.GameObjects.Container;
  private specialSlotBg!: Phaser.GameObjects.NineSlice;
  private specialCooldownSweep!: Phaser.GameObjects.Graphics;
  private specialCooldownText!: Phaser.GameObjects.Text;

  private dashSlot!: Phaser.GameObjects.Container;
  private dashElementRune!: Phaser.GameObjects.Sprite;
  private dashSlotBg!: Phaser.GameObjects.NineSlice;

  private interactSlot!: Phaser.GameObjects.Container;
  private interactGlow!: Phaser.GameObjects.Rectangle;
  private interactPromptText!: Phaser.GameObjects.Text;
  private wasSpecialOnCd = false;

  private heroClass: HeroClass;

  constructor(scene: Phaser.Scene, heroClass: HeroClass) {
    this.scene = scene;
    this.heroClass = heroClass;

    const w = scene.scale.width;
    const h = scene.scale.height;

    this.container = scene.add.container(w / 2, h - 42);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);

    this.createActionBar();

    scene.cameras.main.ignore(this.container);
  }

  private createActionBar(): void {
    const slotSize = 46;
    const spacing = 12;
    const totalSlots = 4;
    const barW = totalSlots * slotSize + (totalSlots - 1) * spacing + 28;
    const barH = 58;

    // 1. Console Stone Backing Plate
    const backing = PixelUI.createPanel(this.scene, 0, 0, barW, barH);
    this.container.add(backing);

    const startX = -((totalSlots * slotSize + (totalSlots - 1) * spacing) / 2) + slotSize / 2;

    // 2. Slot 1: Attack (LMB)
    const attackX = startX;
    this.attackSlot = this.scene.add.container(attackX, 0);
    this.attackSlotBg = PixelUI.createSlot(this.scene, 0, 0, slotSize, 'common');
    this.attackSlot.add(this.attackSlotBg);

    const attackIconCoord =
      this.heroClass === 'wizard'
        ? ITEM_SPRITE_MAP.wizard_staff
        : this.heroClass === 'ranger'
        ? ITEM_SPRITE_MAP.ranger_bow
        : ITEM_SPRITE_MAP.knight_sword;
    const attackFrame = attackIconCoord.row * 11 + attackIconCoord.col;
    const attackIcon = this.scene.add.sprite(0, -2, TEXTURE.ITEMS_32ROGUES, attackFrame);
    attackIcon.setScale(1.0);
    this.attackSlot.add(attackIcon);

    // Elemental Rune indicator on Attack
    this.attackElementRune = this.scene.add.sprite(14, -14, PIXEL_UI_TEXTURE.ICONS_SHEET, 9);
    this.attackElementRune.setScale(0.85);
    this.attackElementRune.setVisible(false);
    this.attackSlot.add(this.attackElementRune);

    // Hotkey Button Badge
    const btn1 = this.createButtonBadge('ЛКМ');
    this.attackSlot.add(btn1);

    this.setupHoverTooltip(
      this.attackSlotBg,
      '[ ЛКМ ] ОСНОВНАЯ АТАКА',
      this.heroClass === 'wizard'
        ? 'Выстрел сгустком энергии из посоха. Наносит магический урон и передает эффекты рун.'
        : this.heroClass === 'ranger'
        ? 'Выстрел стрелой во врага. Урон масштабируется от силы атаки и стихийных рун.'
        : 'Размашистый удар мечом по дуге. Наносит физический урон и отбрасывает врагов.'
    );
    this.container.add(this.attackSlot);

    // 3. Slot 2: Special Ability (RMB / Q)
    const specialX = startX + (slotSize + spacing);
    this.specialSlot = this.scene.add.container(specialX, 0);
    this.specialSlotBg = PixelUI.createSlot(this.scene, 0, 0, slotSize, 'uncommon');
    this.specialSlot.add(this.specialSlotBg);

    const specIconCoord =
      this.heroClass === 'wizard'
        ? ITEM_SPRITE_MAP.supernova_icon
        : this.heroClass === 'ranger'
        ? { col: 1, row: 9 }
        : ITEM_SPRITE_MAP.shield;
    const specFrame = specIconCoord.row * 11 + specIconCoord.col;
    const specIcon = this.scene.add.sprite(0, -2, TEXTURE.ITEMS_32ROGUES, specFrame);
    specIcon.setScale(1.0);
    this.specialSlot.add(specIcon);

    // Cooldown Radial Sweep
    this.specialCooldownSweep = this.scene.add.graphics();
    this.specialSlot.add(this.specialCooldownSweep);

    this.specialCooldownText = this.scene.add.text(0, -2, '', {
      fontFamily: FONT.UI,
      fontSize: '14px',
      fontStyle: '700',
      color: '#fde047',
    });
    this.specialCooldownText.setOrigin(0.5, 0.5);
    this.specialCooldownText.setStroke('#000000', 4);
    this.specialCooldownText.setShadow(0, 2, '#000000', 3, true, true);
    this.specialSlot.add(this.specialCooldownText);

    const btn2 = this.createButtonBadge('ПКМ');
    this.specialSlot.add(btn2);

    this.setupHoverTooltip(
      this.specialSlotBg,
      '[ ПКМ / Q ] СПЕЦУМЕНИЕ',
      this.heroClass === 'wizard'
        ? 'Чародейская Сверхновая: выпускает кольцо из 8 сфер энергии вокруг мага.'
        : this.heroClass === 'ranger'
        ? 'Веерный залп: выпускает 5 пробивающих стрел веером.'
        : 'Стойка со щитом: поднимает щитовой барьер на 2.5 сек, поглощая урон. При блоке отбрасывает врагов ударной волной.'
    );
    this.container.add(this.specialSlot);

    // 4. Slot 3: Dash / Sprint (Shift)
    const dashX = startX + 2 * (slotSize + spacing);
    this.dashSlot = this.scene.add.container(dashX, 0);
    this.dashSlotBg = PixelUI.createSlot(this.scene, 0, 0, slotSize, 'common');
    this.dashSlot.add(this.dashSlotBg);

    const dashFrame = ITEM_SPRITE_MAP.dash_icon.row * 11 + ITEM_SPRITE_MAP.dash_icon.col;
    const dashIcon = this.scene.add.sprite(0, -2, TEXTURE.ITEMS_32ROGUES, dashFrame);
    dashIcon.setScale(1.0);
    this.dashSlot.add(dashIcon);

    this.dashElementRune = this.scene.add.sprite(14, -14, PIXEL_UI_TEXTURE.ICONS_SHEET, 10);
    this.dashElementRune.setScale(0.85);
    this.dashElementRune.setVisible(false);
    this.dashSlot.add(this.dashElementRune);

    const btn3 = this.createButtonBadge('SHIFT');
    this.dashSlot.add(btn3);

    this.setupHoverTooltip(
      this.dashSlotBg,
      '[ SHIFT ] РЫВОК И СПРИНТ',
      'Резкое ускорение героя. Позволяет уклоняться от ударов и снарядов.'
    );
    this.container.add(this.dashSlot);

    // 5. Slot 4: Context Interaction (E)
    const interactX = startX + 3 * (slotSize + spacing);
    this.interactSlot = this.scene.add.container(interactX, 0);

    this.interactGlow = this.scene.add.rectangle(0, 0, slotSize + 6, slotSize + 6, 0xb89830, 0);
    this.interactGlow.setStrokeStyle(2.5, 0xb89830, 0);
    this.interactSlot.add(this.interactGlow);

    const interactSlotBg = PixelUI.createSlot(this.scene, 0, 0, slotSize, 'inset');
    this.interactSlot.add(interactSlotBg);

    const interactFrame = ITEM_SPRITE_MAP.interact_icon.row * 11 + ITEM_SPRITE_MAP.interact_icon.col;
    const interactIcon = this.scene.add.sprite(0, -2, TEXTURE.ITEMS_32ROGUES, interactFrame);
    interactIcon.setScale(1.0);
    this.interactSlot.add(interactIcon);

    const btn4 = this.createButtonBadge('E');
    this.interactSlot.add(btn4);

    // Floating Interaction Context Text above slot
    this.interactPromptText = this.scene.add.text(0, -36, '', {
      fontFamily: FONT.UI,
      fontSize: '10px',
      fontStyle: '700',
      color: '#facc15',
    });
    this.interactPromptText.setOrigin(0.5, 0.5);
    this.interactPromptText.setStroke('#000000', 3);
    this.interactSlot.add(this.interactPromptText);

    this.setupHoverTooltip(
      interactSlotBg,
      '[ E ] ДЕЙСТВИЕ',
      'Контекстное взаимодействие: открытие сундуков, святилищ, костров и спуск на следующий этаж.'
    );
    this.container.add(this.interactSlot);
  }

  private createButtonBadge(label: string): Phaser.GameObjects.Container {
    const cont = this.scene.add.container(0, 20);
    const bg = this.scene.add.rectangle(0, 0, 34, 14, 0x050810, 0.95);
    bg.setStrokeStyle(1.5, 0x475569);

    const txt = this.scene.add.text(0, 0, label, {
      fontFamily: FONT.UI,
      fontSize: '9px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0.5, 0.5);
    txt.setShadow(0, 1, '#000000', 1, true, true);

    cont.add([bg, txt]);
    return cont;
  }

  private setupHoverTooltip(target: Phaser.GameObjects.GameObject, title: string, desc: string): void {
    target.setInteractive({ useHandCursor: true })
      .on('pointerover', (pointer: Phaser.Input.Pointer) => {
        Tooltip.get(this.scene).show(pointer.x, pointer.y, {
          title,
          description: desc,
          rarityColor: '#38bdf8',
        });
      })
      .on('pointerout', () => {
        Tooltip.get(this.scene).hide();
      });
  }

  public update(player?: Player, specialCooldownRatio = 0, specialCooldownSec = 0, inInteractRange = false): void {
    // 1. Update Elemental Infusion Runes on Attack and Dash
    if (player) {
      const attackEl = player.elementalSlots.attack;
      if (attackEl) {
        this.attackElementRune.setVisible(true);
        const iconIndex = attackEl === 'fire' ? 9 : attackEl === 'frost' ? 10 : 11;
        this.attackElementRune.setFrame(iconIndex);
      } else {
        this.attackElementRune.setVisible(false);
      }

      const dashEl = player.elementalSlots.dash;
      if (dashEl) {
        this.dashElementRune.setVisible(true);
        const iconIndex = dashEl === 'fire' ? 9 : dashEl === 'frost' ? 10 : 11;
        this.dashElementRune.setFrame(iconIndex);
      } else {
        this.dashElementRune.setVisible(false);
      }
    }

    // 2. Update Special Cooldown Overlay
    this.specialCooldownSweep.clear();
    if (specialCooldownRatio > 0) {
      const size = 42;
      this.specialCooldownSweep.fillStyle(0x020617, 0.88);
      this.specialCooldownSweep.slice(
        0,
        -2,
        size / 2,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * specialCooldownRatio,
        false
      );
      this.specialCooldownSweep.fillPath();

      this.specialCooldownText.setText(specialCooldownSec > 0 ? specialCooldownSec.toFixed(1) : '');
      this.specialCooldownText.setVisible(true);
      this.wasSpecialOnCd = true;
    } else {
      if (this.wasSpecialOnCd) {
        this.wasSpecialOnCd = false;
        // Pop tween on ready!
        this.scene.tweens.add({
          targets: this.specialSlot,
          scaleX: 1.14,
          scaleY: 1.14,
          duration: 90,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }
      this.specialCooldownText.setVisible(false);
    }

    // 3. Update Interact Slot Glow & Prompt
    if (inInteractRange) {
      const pulse = 0.5 + Math.sin(this.scene.time.now / 140) * 0.4;
      this.interactGlow.setAlpha(pulse);
      this.interactGlow.setStrokeStyle(2.5, 0xb89830, pulse);
      this.interactPromptText.setText('НАЖМИТЕ E');
      this.interactPromptText.setVisible(true);
    } else {
      this.interactGlow.setAlpha(0);
      this.interactPromptText.setVisible(false);
    }
  }

  public handleResize(width: number, height: number): void {
    this.container.setPosition(width / 2, height - 42);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
