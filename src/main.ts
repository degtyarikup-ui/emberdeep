import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';
import { GameScene } from './scenes/GameScene';
import { logBuildInfo } from './buildInfo';

function bootstrap(): void {
  logBuildInfo();

  // Disable browser context menu across entire canvas area
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Prevent browser default F1 help popup
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
    }
  });

  // Create Phaser Game
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
      width: window.innerWidth || 960,
      height: window.innerHeight || 600,
    },
    scene: [BootScene, MenuScene, LobbyScene, GameScene],
  });

  // dev-only escape hatch for debugging from the browser console
  (window as unknown as { game: Phaser.Game }).game = game;
}

bootstrap();
