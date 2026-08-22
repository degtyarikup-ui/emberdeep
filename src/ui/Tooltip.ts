import Phaser from 'phaser';
import { DEPTH, FONT } from '../gfx/registry';
import { PixelUI } from '../gfx/PixelUI';

export interface TooltipData {
  title: string;
  description: string;
  rarityColor?: string;
  stats?: string[];
  subtext?: string;
}

export class Tooltip {
  private static instance?: Tooltip;
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bgPanel: Phaser.GameObjects.NineSlice;
  private titleText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private subText: Phaser.GameObjects.Text;
  private isShown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(DEPTH.UI + 800);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    // 1. 9-slice stone panel
    this.bgPanel = PixelUI.createPanel(scene, 0, 0, 210, 80);
    this.bgPanel.setOrigin(0, 0);
    this.container.add(this.bgPanel);

    // 2. Title Text
    this.titleText = scene.add.text(12, 10, '', {
      fontFamily: FONT.UI,
      fontSize: '12px',
      fontStyle: '700',
      color: '#fde047',
    });
    this.titleText.setStroke('#000000', 2.5);
    this.titleText.setShadow(0, 1, '#000000', 2, true, true);
    this.container.add(this.titleText);

    // Decorative 1px Divider Line
    this.dividerLine = scene.add.rectangle(12, 26, 186, 1, 0x475569, 0.8);
    this.dividerLine.setOrigin(0, 0);
    this.container.add(this.dividerLine);

    // 3. Description Text
    this.descText = scene.add.text(12, 32, '', {
      fontFamily: FONT.UI,
      fontSize: '10px',
      color: '#e2d9c8',
      wordWrap: { width: 186 },
    });
    this.descText.setStroke('#000000', 2);
    this.container.add(this.descText);

    // 4. Stats Text
    this.statsText = scene.add.text(12, 52, '', {
      fontFamily: FONT.UI,
      fontSize: '10px',
      fontStyle: '700',
      color: '#4ade80',
    });
    this.statsText.setStroke('#000000', 2);
    this.container.add(this.statsText);

    // 5. Subtext / Lore
    this.subText = scene.add.text(12, 70, '', {
      fontFamily: FONT.UI,
      fontSize: '9px',
      fontStyle: 'italic',
      color: '#94a3b8',
    });
    this.subText.setStroke('#000000', 2);
    this.container.add(this.subText);

    // Ignore world camera
    scene.cameras.main.ignore(this.container);
  }

  private dividerLine!: Phaser.GameObjects.Rectangle;

  public static get(scene?: Phaser.Scene): Tooltip {
    if (!Tooltip.instance && scene) {
      Tooltip.instance = new Tooltip(scene);
    }
    return Tooltip.instance!;
  }

  public show(x: number, y: number, data: TooltipData): void {
    this.titleText.setText(data.title.toUpperCase());
    this.titleText.setColor(data.rarityColor ?? '#fde047');

    this.descText.setText(data.description);

    let curY = 34 + this.descText.height + 6;
    if (data.stats && data.stats.length > 0) {
      this.statsText.setText(data.stats.join('\n'));
      this.statsText.setPosition(12, curY);
      this.statsText.setVisible(true);
      curY += this.statsText.height + 6;
    } else {
      this.statsText.setVisible(false);
    }

    if (data.subtext) {
      this.subText.setText(data.subtext);
      this.subText.setPosition(12, curY);
      this.subText.setVisible(true);
      curY += this.subText.height + 8;
    } else {
      this.subText.setVisible(false);
      curY += 8;
    }

    const totalWidth = 210;
    const totalHeight = Math.max(64, curY);
    this.bgPanel.setSize(totalWidth, totalHeight);

    // Clamp to screen bounds
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;

    let posX = x + 16;
    let posY = y + 16;

    if (posX + totalWidth > screenW - 12) {
      posX = x - totalWidth - 12;
    }
    if (posY + totalHeight > screenH - 12) {
      posY = y - totalHeight - 12;
    }

    this.container.setPosition(Math.max(10, posX), Math.max(10, posY));
    this.container.setVisible(true);
    this.isShown = true;
  }

  public hide(): void {
    if (!this.isShown) return;
    this.container.setVisible(false);
    this.isShown = false;
  }

  public destroy(): void {
    this.container.destroy();
    if (Tooltip.instance === this) {
      Tooltip.instance = undefined;
    }
  }
}
