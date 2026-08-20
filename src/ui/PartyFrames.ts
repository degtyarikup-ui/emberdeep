import Phaser from 'phaser';
import { DEPTH, FONT, PLAYER_LABEL_COLORS } from '../gfx/registry';
import { Player } from '../entities/Player';

export class PartyFrames {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private frames: Map<number, Phaser.GameObjects.Container> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(20, 84);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);

    scene.cameras.main.ignore(this.container);
  }

  public update(players: Player[], myPlayer: Player): void {
    const allies = players.filter((p) => p.slot !== myPlayer.slot).sort((a, b) => a.slot - b.slot);

    // If no allies, hide
    if (allies.length === 0) {
      this.container.setVisible(false);
      return;
    }
    this.container.setVisible(true);

    // Keep frames synced
    const currentSlots = new Set(allies.map((a) => a.slot));
    for (const [slot, frame] of this.frames) {
      if (!currentSlots.has(slot)) {
        frame.destroy();
        this.frames.delete(slot);
      }
    }

    allies.forEach((ally, index) => {
      let frame = this.frames.get(ally.slot);
      if (!frame) {
        frame = this.createAllyFrame(ally);
        this.container.add(frame);
        this.frames.set(ally.slot, frame);
      }

      frame.setY(index * 26);
      this.updateAllyFrame(frame, ally);
    });
  }

  private createAllyFrame(player: Player): Phaser.GameObjects.Container {
    const frame = this.scene.add.container(0, 0);

    const tintHex = PLAYER_LABEL_COLORS[player.slot] ?? '#ffffff';
    const strokeColor = Phaser.Display.Color.HexStringToColor(tintHex).color;

    // Background
    const bg = this.scene.add.rectangle(0, 0, 140, 22, 0x0f172a, 0.9);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1.5, strokeColor, 0.9);

    // Player Number Tag
    const tag = this.scene.add.text(6, 4, `P${player.slot + 1}`, {
      fontFamily: FONT.UI,
      fontSize: '9px',
      fontStyle: '700',
      color: tintHex,
    });
    tag.setStroke('#000000', 3);

    // Mini HP Bar
    const barX = 26;
    const barY = 5;
    const barW = 75;
    const barH = 12;

    const hpCavity = this.scene.add.rectangle(barX, barY, barW, barH, 0x020617);
    hpCavity.setOrigin(0, 0);

    const hpFill = this.scene.add.rectangle(barX, barY, barW, barH, 0xdc2626);
    hpFill.setOrigin(0, 0);
    hpFill.setName('hpFill');

    const hpText = this.scene.add.text(barX + barW / 2, barY + barH / 2, '3/3', {
      fontFamily: FONT.UI,
      fontSize: '8px',
      fontStyle: '700',
      color: '#ffffff',
    });
    hpText.setOrigin(0.5, 0.5);
    hpText.setStroke('#000000', 3);
    hpText.setName('hpText');

    // Status Label
    const status = this.scene.add.text(108, 4, 'ЖИВ', {
      fontFamily: FONT.UI,
      fontSize: '8px',
      fontStyle: '700',
      color: '#4ade80',
    });
    status.setName('status');

    frame.add([bg, tag, hpCavity, hpFill, hpText, status]);
    return frame;
  }

  private updateAllyFrame(frame: Phaser.GameObjects.Container, player: Player): void {
    const hpFill = frame.getByName('hpFill') as Phaser.GameObjects.Rectangle;
    const hpText = frame.getByName('hpText') as Phaser.GameObjects.Text;
    const status = frame.getByName('status') as Phaser.GameObjects.Text;

    if (!hpFill || !hpText || !status) return;

    const ratio = Math.max(0, Math.min(1, player.hp / player.maxHp));
    hpFill.width = Math.round(75 * ratio);

    hpText.setText(`${player.hp}/${player.maxHp}`);

    if (player.isDowned) {
      status.setText('ПАЛ');
      status.setColor('#ef4444');
      hpFill.fillColor = 0x475569;
    } else {
      status.setText('ЖИВ');
      status.setColor('#4ade80');
      hpFill.fillColor = 0xdc2626;
    }
  }

  public handleResize(): void {
    this.container.setPosition(20, 84);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
