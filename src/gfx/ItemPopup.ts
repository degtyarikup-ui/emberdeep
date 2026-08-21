import Phaser from 'phaser';

export class ItemPopup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, name: string, desc: string, isRarityHigh = false) {
    super(scene, x, y);
    this.setDepth(1001); // DEPTH.UI

    const w = 180;
    const h = 50;

    const bg = scene.add.rectangle(0, 0, w, h, 0x090514, 0.9);
    bg.setStrokeStyle(2, isRarityHigh ? 0x9a8028 : 0x555555);

    const title = scene.add.text(0, -10, name, {
      fontFamily: '"Cinzel Decorative", serif',
      fontSize: '12px',
      color: isRarityHigh ? '#c8a830' : '#d4c4a0',
      fontStyle: '700'
    }).setOrigin(0.5);

    const sub = scene.add.text(0, 8, desc, {
      fontFamily: '"Pixelify Sans", sans-serif',
      fontSize: '10px',
      color: '#4a9aaa'
    }).setOrigin(0.5);

    this.add([bg, title, sub]);
    scene.add.existing(this);

    this.setScale(0.5);
    this.setAlpha(0);

    scene.tweens.add({
      targets: this,
      scale: 1.1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: this,
          scale: 1.0,
          duration: 100,
          onComplete: () => {
            scene.tweens.add({
              targets: this,
              y: y - 20,
              alpha: 0,
              delay: 2000,
              duration: 500,
              onComplete: () => this.destroy()
            });
          }
        });
      }
    });
  }
}
