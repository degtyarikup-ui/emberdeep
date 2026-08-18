import Phaser from 'phaser';

// Animated actors from "Pixel Crawler" by Anokolisa — see
// vendor/pixel-crawler/CREDIT.md. Each state is its own spritesheet file
// with its own frame size (idle/run/death canvases differ per the source).
export interface AnimClip {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  repeat: number; // -1 = loop, 0 = play once
}

export interface ActorClips {
  idle: AnimClip;
  run: AnimClip;
  death: AnimClip;
}

const HERO: ActorClips = {
  idle: { key: 'anim-hero-idle', url: '/assets/pc-knight-idle.png', frameWidth: 32, frameHeight: 32, frameCount: 4, frameRate: 5, repeat: -1 },
  run: { key: 'anim-hero-run', url: '/assets/pc-knight-run.png', frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 10, repeat: -1 },
  death: { key: 'anim-hero-death', url: '/assets/pc-knight-death.png', frameWidth: 32, frameHeight: 32, frameCount: 9, frameRate: 10, repeat: 0 },
};

const ORC: ActorClips = {
  idle: { key: 'anim-orc-idle', url: '/assets/pc-orc-idle.png', frameWidth: 32, frameHeight: 32, frameCount: 4, frameRate: 5, repeat: -1 },
  run: { key: 'anim-orc-run', url: '/assets/pc-orc-run.png', frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 12, repeat: -1 },
  death: { key: 'anim-orc-death', url: '/assets/pc-orc-death.png', frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 10, repeat: 0 },
};

const SKELETON: ActorClips = {
  idle: { key: 'anim-skeleton-idle', url: '/assets/pc-skeleton-idle.png', frameWidth: 32, frameHeight: 32, frameCount: 4, frameRate: 4, repeat: -1 },
  run: { key: 'anim-skeleton-run', url: '/assets/pc-skeleton-run.png', frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 8, repeat: -1 },
  death: { key: 'anim-skeleton-death', url: '/assets/pc-skeleton-death.png', frameWidth: 48, frameHeight: 48, frameCount: 8, frameRate: 10, repeat: 0 },
};

export const ACTORS = { HERO, ORC, SKELETON };

export function preloadActor(scene: Phaser.Scene, clips: ActorClips): void {
  for (const clip of Object.values(clips)) {
    scene.load.spritesheet(clip.key, clip.url, { frameWidth: clip.frameWidth, frameHeight: clip.frameHeight });
  }
}

export function createActorAnims(scene: Phaser.Scene, clips: ActorClips): void {
  for (const clip of Object.values(clips)) {
    scene.anims.create({
      key: clip.key,
      frames: scene.anims.generateFrameNumbers(clip.key, { start: 0, end: clip.frameCount - 1 }),
      frameRate: clip.frameRate,
      repeat: clip.repeat,
    });
  }
}
