import Phaser from 'phaser';
import { TEXTURE, ANIM, DEPTH, FONT } from '../gfx/registry';
import { GameScene } from '../scenes/GameScene';

export class BonfireEntity extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private light: Phaser.GameObjects.Light;
  private stage: number = 10;
  private burnTimer: Phaser.Time.TimerEvent;
  private promptText: Phaser.GameObjects.Text;
  private isPlayerNear: boolean = false;
  // private crackleSound: Phaser.Sound.BaseSound; // Optional audio

  constructor(public scene: GameScene, x: number, y: number) {
    super(scene, x, y);

    this.sprite = scene.add.sprite(0, 0, TEXTURE.BONFIRE);
    this.sprite.play(ANIM.BONFIRE_FLICKER);
    this.sprite.setPipeline('Light2D');
    this.add(this.sprite);

    // Dynamic light: vibrant warm bonfire illumination
    this.light = scene.lights.addLight(x, y, 180, 0xff9922, 1.8);

    // Interaction prompt
    this.promptText = scene.add
      .text(0, -30, 'E — ПОДБРОСИТЬ ДРОВА', {
        fontFamily: FONT.UI,
        fontSize: '11px',
        fontStyle: '700',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(DEPTH.UI);
    this.promptText.setStroke('#000000', 2.5);
    this.add(this.promptText);

    // Burn timer: 1 stage every 25s
    this.burnTimer = scene.time.addEvent({
      delay: 25000,
      callback: this.decreaseStage,
      callbackScope: this,
      loop: true,
    });

    scene.add.existing(this);
    this.setDepth(DEPTH.YSORT_BASE + y + 16);
  }

  update(players: Phaser.GameObjects.Sprite[]) {
    if (this.stage === 0) {
      this.promptText.setVisible(false);
      this.isPlayerNear = false;
      return;
    }

    // Check player proximity
    let near = false;
    for (const player of players) {
      if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 40) {
        near = true;
        break;
      }
    }

    if (near !== this.isPlayerNear) {
      this.isPlayerNear = near;
      this.promptText.setVisible(near);
    }

    // Interaction handled in GameScene (listening to 'E' key)
    // Flicker light intensity slightly
    if (this.stage > 0) {
      const baseIntensity = this.stage / 10 * 1.5;
      this.light.intensity = baseIntensity + Math.random() * 0.2;
    }
  }

  public interact() {
    if (this.isPlayerNear && this.stage < 10) {
      this.restoreFuel();
    }
  }

  private decreaseStage() {
    if (this.stage > 0) {
      this.stage--;
      this.updateVisuals();
      
      // Emit smoke puffs
      if (this.scene.particles) {
        // Assume scene.particles has a method or we can just create smoke
        for (let i = 0; i < 3; i++) {
          this.scene.particles.spawnSmoke(this.x + Phaser.Math.Between(-5, 5), this.y - 10);
        }
      }
    }
    
    if (this.stage === 0) {
      this.burnTimer.remove();
    }
  }

  private restoreFuel() {
    this.stage = 10;
    this.updateVisuals();
    
    // Burst of sparks
    if (this.scene.particles) {
      for (let i = 0; i < 15; i++) {
        this.scene.particles.spawnSpark(this.x, this.y);
      }
    }

    // Restart timer if it was stopped
    if (!this.burnTimer.hasDispatched) { // Or recreate
      this.burnTimer.remove();
      this.burnTimer = this.scene.time.addEvent({
        delay: 25000,
        callback: this.decreaseStage,
        callbackScope: this,
        loop: true,
      });
    }
  }

  private updateVisuals() {
    if (this.stage === 0) {
      this.sprite.stop(); // Stop animation
      this.sprite.setFrame(0); // Extinguished frame? or tint
      this.sprite.setTint(0x555555);
      this.light.setIntensity(0);
      this.light.setRadius(0);
    } else {
      this.sprite.setTint(0xffffff);
      if (!this.sprite.anims.isPlaying) {
        this.sprite.play(ANIM.BONFIRE_FLICKER);
      }
      
      const scale = 0.5 + (this.stage / 10) * 0.5;
      this.sprite.setScale(scale);
      
      this.light.setRadius(40 + (this.stage / 10) * 80);
      this.light.setIntensity(this.stage / 10 * 1.5);
    }
  }

  destroy(fromScene?: boolean) {
    if (this.light) {
      this.scene.lights.removeLight(this.light);
    }
    this.burnTimer.remove();
    super.destroy(fromScene);
  }
}
