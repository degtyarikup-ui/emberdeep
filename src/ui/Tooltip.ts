import Phaser from 'phaser';
import { DEPTH, FONT } from '../gfx/registry';

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
  private bg: Phaser.GameObjects.Rectangle;
  private innerBorder: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private subText: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(DEPTH.UI + 500);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    this.bg = scene.add.rectangle(0, 0, 180, 80, 0x090d16, 0.95);
    this.bg.setOrigin(0, 0);
    this.bg.setStrokeStyle(2, 0xd97706, 0.95);

    this.innerBorder = scene.add.rectangle(3, 3, 174, 74, 0x000000, 0);
    this.innerBorder.setOrigin(0, 0);
    this.innerBorder.setStrokeStyle(1, 0xfbbf24, 0.35);

    this.titleText = scene.add.text(10, 8, '', {
      fontFamily: FONT.UI,
      fontSize: '11px',
      fontStyle: '700',
      color: '#fde047',
    });
    this.titleText.setStroke('#000000', 3);

    this.descText = scene.add.text(10, 26, '', {
      fontFamily: FONT.UI,
      fontSize: '9px',
      color: '#e2e8f0',
      wordWrap: { width: 160 },
    });

    this.statsText = scene.add.text(10, 48, '', {
      fontFamily: FONT.UI,
      fontSize: '9px',
      fontStyle: '700',
      color: '#4ade80',
    });

    this.subText = scene.add.text(10, 64, '', {
      fontFamily: FONT.UI,
      fontSize: '8px',
      color: '#94a3b8',
    });

    this.container.add([this.bg, this.innerBorder, this.titleText, this.descText, this.statsText, this.subText]);
    
    // Ignore world camera so it renders fixed on screen
    const cam = scene.cameras.main;
    cam.ignore(this.container);
  }

  public static get(scene?: Phaser.Scene): Tooltip {
    if (!Tooltip.instance && scene) {
      Tooltip.instance = new Tooltip(scene);
    }
    return Tooltip.instance!;
  }

  public show(x: number, y: number, data: TooltipData): void {
    this.titleText.setText(data.title.toUpperCase());
    this.titleText.setColor(data.rarityColor ?? '#fde047');
    this.bg.setStrokeStyle(2, data.rarityColor ? Phaser.Display.Color.HexStringToColor(data.rarityColor).color : 0xd97706);

    this.descText.setText(data.description);
    
    let curY = 26 + this.descText.height + 4;
    if (data.stats && data.stats.length > 0) {
      this.statsText.setText(data.stats.join('\n'));
      this.statsText.setPosition(10, curY);
      this.statsText.setVisible(true);
      curY += this.statsText.height + 4;
    } else {
      this.statsText.setVisible(false);
    }

    if (data.subtext) {
      this.subText.setText(data.subtext);
      this.subText.setPosition(10, curY);
      this.subText.setVisible(true);
      curY += this.subText.height + 6;
    } else {
      this.subText.setVisible(false);
      curY += 6;
    }

    const totalHeight = Math.max(50, curY);
    const totalWidth = 180;
    this.bg.setSize(totalWidth, totalHeight);
    this.innerBorder.setSize(totalWidth - 6, totalHeight - 6);

    // Clamping to screen edges
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;

    let posX = x + 16;
    let posY = y + 16;

    if (posX + totalWidth > screenW - 10) {
      posX = x - totalWidth - 10;
    }
    if (posY + totalHeight > screenH - 10) {
      posY = y - totalHeight - 10;
    }

    this.container.setPosition(Math.max(10, posX), Math.max(10, posY));
    this.container.setVisible(true);
    this.visible = true;
  }

  public hide(): void {
    if (!this.visible) return;
    this.container.setVisible(false);
    this.visible = false;
  }

  public destroy(): void {
    this.container.destroy();
    if (Tooltip.instance === this) {
      Tooltip.instance = undefined;
    }
  }
}
