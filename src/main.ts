import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 600,
  backgroundColor: '#0a0710',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    // a 0x0 initial size (possible if the tab hasn't been laid out yet at
    // load time) crashes WebGL framebuffer setup before any scene can start
    width: window.innerWidth || 960,
    height: window.innerHeight || 600,
  },
  scene: [BootScene, MenuScene, LobbyScene, GameScene],
});

// dev-only escape hatch for debugging from the browser console
(window as unknown as { game: Phaser.Game }).game = game;
