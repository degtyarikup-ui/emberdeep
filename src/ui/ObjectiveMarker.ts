import Phaser from 'phaser';
import { DEPTH, FONT } from '../gfx/registry';
import { t } from '../i18n';

export type ObjectiveKind = 'altar' | 'boss' | 'exit';

export class ObjectiveMarker {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private arrow: Phaser.GameObjects.Graphics;
  private iconText: Phaser.GameObjects.Text;
  private labelText: Phaser.GameObjects.Text;
  private distText: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    // Background badge
    this.bg = scene.add.graphics();
    this.container.add(this.bg);

    // Direction arrow
    this.arrow = scene.add.graphics();
    this.container.add(this.arrow);

    // Small icon / tag
    this.iconText = scene.add
      .text(0, -9, '◆', {
        fontFamily: FONT.UI,
        fontSize: '11px',
        color: '#ffc83b',
      })
      .setOrigin(0.5, 0.5);
    this.container.add(this.iconText);

    // Target label
    this.labelText = scene.add
      .text(0, 1, '', {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#f0e2b8',
      })
      .setOrigin(0.5, 0.5);
    this.container.add(this.labelText);

    // Distance readout
    this.distText = scene.add
      .text(0, 11, '', {
        fontFamily: FONT.UI,
        fontSize: '9px',
        color: '#a09882',
      })
      .setOrigin(0.5, 0.5);
    this.container.add(this.distText);

    // Redraw badge styling
    this.drawBadge(0x1a1520, 0x5a4835);
  }

  private drawBadge(fillColor: number, strokeColor: number): void {
    const w = 110;
    const h = 32;
    this.bg.clear();
    // Shadow
    this.bg.fillStyle(0x000000, 0.6);
    this.bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w, h, 4);
    // Base
    this.bg.fillStyle(fillColor, 0.9);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    // Border
    this.bg.lineStyle(1.5, strokeColor, 1.0);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
  }

  private drawArrow(color: number): void {
    this.arrow.clear();
    this.arrow.fillStyle(color, 0.95);
    this.arrow.lineStyle(1, 0x000000, 0.8);

    // Sharp triangle pointing up (0, -22)
    this.arrow.beginPath();
    this.arrow.moveTo(0, -22);
    this.arrow.lineTo(7, -13);
    this.arrow.lineTo(-7, -13);
    this.arrow.closePath();
    this.arrow.fillPath();
    this.arrow.strokePath();
  }

  public update(
    worldCam: Phaser.Cameras.Scene2D.Camera,
    targetX: number,
    targetY: number,
    kind: ObjectiveKind,
    active = true
  ): void {
    if (!active) {
      if (this.visible) {
        this.container.setVisible(false);
        this.visible = false;
      }
      return;
    }

    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;
    const camX = worldCam.midPoint.x;
    const camY = worldCam.midPoint.y;

    const dx = targetX - camX;
    const dy = targetY - camY;
    const worldDist = Math.hypot(dx, dy);

    // Convert target world position to screen coordinates on worldCam
    const screenX = (targetX - worldCam.scrollX) * worldCam.zoom;
    const screenY = (targetY - worldCam.scrollY) * worldCam.zoom;

    // Check if target is well inside the screen viewport (e.g. margin 55px)
    const margin = 55;
    const inView =
      screenX >= margin &&
      screenX <= sw - margin &&
      screenY >= margin &&
      screenY <= sh - margin;

    if (inView) {
      if (this.visible) {
        this.container.setVisible(false);
        this.visible = false;
      }
      return;
    }

    // Target is off-screen: project ray from screen center to edge
    const cx = sw / 2;
    const cy = sh / 2;
    const angle = Math.atan2(dy, dx);

    const padX = 65;
    const padY = 45;
    const halfW = sw / 2 - padX;
    const halfH = sh / 2 - padY;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let edgeX: number;
    let edgeY: number;

    if (Math.abs(cos) * halfH > Math.abs(sin) * halfW) {
      // Hits left or right boundary
      const signX = cos > 0 ? 1 : -1;
      edgeX = cx + signX * halfW;
      edgeY = cy + (signX * halfW * sin) / cos;
    } else {
      // Hits top or bottom boundary
      const signY = sin > 0 ? 1 : -1;
      edgeY = cy + signY * halfH;
      edgeX = cx + (signY * halfH * cos) / sin;
    }

    this.container.setPosition(edgeX, edgeY);

    // Color and icon themes per objective kind
    let iconChar = '◆';
    let label = '';
    let themeColor = 0xffc83b;
    let strokeColor = 0x8a6a3b;

    if (kind === 'altar') {
      iconChar = '✦';
      label = t().objectiveAltar;
      themeColor = 0xb545ff;
      strokeColor = 0x6e28a0;
    } else if (kind === 'boss') {
      iconChar = '▲';
      label = t().objectiveBoss;
      themeColor = 0xff3b30;
      strokeColor = 0xa01818;
    } else if (kind === 'exit') {
      iconChar = '▼';
      label = t().objectiveExit;
      themeColor = 0x4cd964;
      strokeColor = 0x228038;
    }

    this.drawBadge(0x18141d, strokeColor);
    this.drawArrow(themeColor);
    // Rotate arrow towards target (offset by +PI/2 because base points UP)
    this.arrow.setRotation(angle + Math.PI / 2);

    this.iconText.setText(iconChar).setColor(Phaser.Display.Color.IntegerToColor(themeColor).rgba);
    this.labelText.setText(label);

    const meters = Math.max(1, Math.round(worldDist / 32));
    this.distText.setText(`${meters} ${t().distanceMeter}`);

    if (!this.visible) {
      this.container.setVisible(true);
      this.visible = true;
    }
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
