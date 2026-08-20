import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';
import { GameScene } from './scenes/GameScene';
import { YandexSDK } from './yandex/yandexSdk';
import { MetaManager } from './meta/MetaManager';

async function bootstrap(): Promise<void> {
  // Disable browser context menu across entire canvas area (§ 1.6)
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Prevent browser default F1 help popup
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
    }
  });

  // 1. Initialize Yandex Games SDK BEFORE creating Phaser Game
  //    This is a hard requirement from Yandex (п. 1.1 Требований платформы):
  //    YaGames.init() must be called and awaited before any game logic runs.
  await YandexSDK.get().init();

  // 2. Sync player cloud saves (§ 1.9)
  void MetaManager.get().syncCloud();

  // 3. Create Phaser Game only after SDK is ready
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
