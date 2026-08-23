import Phaser from 'phaser';
import { DEPTH, FONT } from '../gfx/registry';
import { t } from '../i18n';

export type ObjectiveKind = 'altar' | 'boss' | 'exit';

export class ObjectiveMarker {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private arrow: Phaser.GameObjects.Graphics;
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

    // Direction pointer arrow
    this.arrow = scene.add.graphics();
    this.container.add(this.arrow);

    // Target label
    this.labelText = scene.add
      .text(0, -4, '', {
        fontFamily: FONT.UI,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#f0e2b8',
      })
      .setOrigin(0.5, 0.5);
    this.labelText.setStroke('#000000', 2.5);
    this.labelText.setShadow(0, 1, '#000000', 2, true, true);
    this.container.add(this.labelText);

    // Distance readout
    this.distText = scene.add
      .text(0, 8, '', {
        fontFamily: FONT.UI,
        fontSize: '9px',
        color: '#94a3b8',
      })
      .setOrigin(0.5, 0.5);
    this.distText.setStroke('#000000', 2);
    this.container.add(this.distText);

    // Initial badge draw
    this.drawBadge(0x0e0a16, 0x5a4835);
  }

  private drawBadge(fillColor: number, strokeColor: number): void {
    const w = 114;
    const h = 30;
    this.bg.clear();
    // Shadow
    this.bg.fillStyle(0x000000, 0.65);
    this.bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w, h, 4);
    // Base Obsidian
    this.bg.fillStyle(fillColor, 0.92);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    // Top highlight bevel
    this.bg.fillStyle(0xffffff, 0.08);
    this.bg.fillRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, 2, 2);
    // Metallic Border
    this.bg.lineStyle(1.5, strokeColor, 1.0);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
  }

  private drawArrow(color: number): void {
    this.arrow.clear();
    this.arrow.fillStyle(color, 1.0);
    this.arrow.lineStyle(1.5, 0x000000, 0.9);

    // Clean pointer triangle pointing UP in local coordinates
    this.arrow.beginPath();
    this.arrow.moveTo(0, -6);
    this.arrow.lineTo(5, 4);
    this.arrow.lineTo(-5, 4);
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
    const camMidX = worldCam.midPoint.x;
    const camMidY = worldCam.midPoint.y;

    const dx = targetX - camMidX;
    const dy = targetY - camMidY;
    const worldDist = Math.hypot(dx, dy);

    // Exact conversion of world coordinates to screen/viewport coordinates under worldCam zoom
    const screenX = (targetX - camMidX) * worldCam.zoom + sw / 2;
    const screenY = (targetY - camMidY) * worldCam.zoom + sh / 2;

    // Check if target is inside the player's viewport
    const inViewMarginX = 65;
    const inViewMarginY = 50;
    const inView =
      screenX >= inViewMarginX &&
      screenX <= sw - inViewMarginX &&
      screenY >= inViewMarginY &&
      screenY <= sh - inViewMarginY;

    // Color and label themes per objective kind
    let label = '';
    let labelColor = '#ffffff';
    let themeColor = 0xffc83b;
    let strokeColor = 0x8a6a3b;

    if (kind === 'altar') {
      label = t().objectiveAltar;
      labelColor = '#e9d5ff';
      themeColor = 0xc084fc;
      strokeColor = 0x7e22ce;
    } else if (kind === 'boss') {
      label = t().objectiveBoss;
      labelColor = '#fecaca';
      themeColor = 0xef4444;
      strokeColor = 0x991b1b;
    } else if (kind === 'exit') {
      label = t().objectiveExit;
      labelColor = '#bbf7d0';
      themeColor = 0x22c55e;
      strokeColor = 0x15803d;
    }

    this.drawBadge(0x0e0a16, strokeColor);
    this.drawArrow(themeColor);
    this.labelText.setText(label).setColor(labelColor);

    const meters = Math.max(1, Math.round(worldDist / 32));
    this.distText.setText(`${meters} ${t().distanceMeter}`);

    if (inView) {
      // -------------------------------------------------------------
      // ON-SCREEN: Plaque hovers directly above the target in world
      // -------------------------------------------------------------
      const bob = Math.sin(this.scene.time.now * 0.005) * 3;
      const markerX = Phaser.Math.Clamp(screenX, 64, sw - 64);
      const markerY = Phaser.Math.Clamp(screenY - 42 + bob, 24, sh - 24);

      this.container.setPosition(markerX, markerY);

      // Arrow sits at the bottom center of the badge pointing straight DOWN (▼) at the target
      this.arrow.setPosition(0, 16);
      this.arrow.setRotation(Math.PI);
    } else {
      // -------------------------------------------------------------
      // OFF-SCREEN: Plaque clamps to the screen edge pointing toward target
      // -------------------------------------------------------------
      const cx = sw / 2;
      const cy = sh / 2;
      const angle = Math.atan2(dy, dx);

      const padX = 72;
      const padY = 48;
      const halfW = sw / 2 - padX;
      const halfH = sh / 2 - padY;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      let edgeX: number;
      let edgeY: number;

      if (Math.abs(cos) * halfH > Math.abs(sin) * halfW) {
        const signX = cos > 0 ? 1 : -1;
        edgeX = cx + signX * halfW;
        edgeY = cy + (signX * halfW * sin) / (cos || 0.0001);
      } else {
        const signY = sin > 0 ? 1 : -1;
        edgeY = cy + signY * halfH;
        edgeX = cx + (signY * halfH * cos) / (sin || 0.0001);
      }

      this.container.setPosition(edgeX, edgeY);

      // Arrow sits on the outer rim of the badge pointing outward in direction of target
      const bw = 114 / 2 + 3;
      const bh = 30 / 2 + 3;
      let ax: number;
      let ay: number;
      if (Math.abs(cos) * bh > Math.abs(sin) * bw) {
        const signX = cos > 0 ? 1 : -1;
        ax = signX * bw;
        ay = (signX * bw * sin) / (cos || 0.0001);
      } else {
        const signY = sin > 0 ? 1 : -1;
        ay = signY * bh;
        ax = (signY * bh * cos) / (sin || 0.0001);
      }

      this.arrow.setPosition(ax, ay);
      this.arrow.setRotation(angle + Math.PI / 2);
    }

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

