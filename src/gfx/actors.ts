import Phaser from 'phaser';
import { asset } from './pack';

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
  idle: { key: 'anim-hero-idle', url: asset('pc-knight-idle.png'), frameWidth: 32, frameHeight: 32, frameCount: 4, frameRate: 5, repeat: -1 },
  run: { key: 'anim-hero-run', url: asset('pc-knight-run.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 10, repeat: -1 },
  death: { key: 'anim-hero-death', url: asset('pc-knight-death.png'), frameWidth: 32, frameHeight: 32, frameCount: 9, frameRate: 10, repeat: 0 },
};

const ORC: ActorClips = {
  idle: { key: 'anim-orc-idle', url: asset('pc-orc-idle.png'), frameWidth: 32, frameHeight: 32, frameCount: 4, frameRate: 5, repeat: -1 },
  run: { key: 'anim-orc-run', url: asset('pc-orc-run.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 12, repeat: -1 },
  death: { key: 'anim-orc-death', url: asset('pc-orc-death.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 10, repeat: 0 },
};

const SKELETON: ActorClips = {
  idle: { key: 'anim-skeleton-idle', url: asset('pc-skeleton-idle.png'), frameWidth: 32, frameHeight: 32, frameCount: 4, frameRate: 4, repeat: -1 },
  run: { key: 'anim-skeleton-run', url: asset('pc-skeleton-run.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 8, repeat: -1 },
  death: { key: 'anim-skeleton-death', url: asset('pc-skeleton-death.png'), frameWidth: 48, frameHeight: 48, frameCount: 8, frameRate: 10, repeat: 0 },
};

const WOLF: ActorClips = {
  idle: { key: 'anim-wolf-idle', url: asset('pc-wolf-idle.png'), frameWidth: 32, frameHeight: 32, frameCount: 4, frameRate: 6, repeat: -1 },
  run: { key: 'anim-wolf-run', url: asset('pc-wolf-run.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 14, repeat: -1 },
  death: { key: 'anim-wolf-death', url: asset('pc-wolf-death.png'), frameWidth: 48, frameHeight: 48, frameCount: 6, frameRate: 10, repeat: 0 },
};

const ORC_WARRIOR: ActorClips = {
  idle: { key: 'anim-orc-warrior-idle', url: asset('orc-warrior-idle.png'), frameWidth: 24, frameHeight: 26, frameCount: 4, frameRate: 6, repeat: -1 },
  run: { key: 'anim-orc-warrior-run', url: asset('orc-warrior-run.png'), frameWidth: 24, frameHeight: 26, frameCount: 4, frameRate: 8, repeat: -1 },
  death: { key: 'anim-orc-death', url: asset('pc-orc-death.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 10, repeat: 0 },
};

const MASKED_ORC: ActorClips = {
  idle: { key: 'anim-masked-orc-idle', url: asset('masked-orc-idle.png'), frameWidth: 24, frameHeight: 26, frameCount: 4, frameRate: 6, repeat: -1 },
  run: { key: 'anim-masked-orc-run', url: asset('masked-orc-run.png'), frameWidth: 24, frameHeight: 26, frameCount: 4, frameRate: 8, repeat: -1 },
  death: { key: 'anim-orc-death', url: asset('pc-orc-death.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 10, repeat: 0 },
};

const DIREWOLF: ActorClips = {
  idle: { key: 'anim-direwolf-idle', url: asset('direwolf-idle.png'), frameWidth: 32, frameHeight: 32, frameCount: 4, frameRate: 6, repeat: -1 },
  run: { key: 'anim-direwolf-run', url: asset('direwolf-run.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 14, repeat: -1 },
  death: { key: 'anim-wolf-death', url: asset('pc-wolf-death.png'), frameWidth: 48, frameHeight: 48, frameCount: 6, frameRate: 10, repeat: 0 },
};

const ORC_GRUNT: ActorClips = {
  idle: { key: 'anim-orc-grunt-idle', url: asset('orc-grunt-idle.png'), frameWidth: 24, frameHeight: 26, frameCount: 4, frameRate: 6, repeat: -1 },
  run: { key: 'anim-orc-grunt-run', url: asset('orc-grunt-run.png'), frameWidth: 24, frameHeight: 26, frameCount: 4, frameRate: 8, repeat: -1 },
  death: { key: 'anim-orc-death', url: asset('pc-orc-death.png'), frameWidth: 64, frameHeight: 64, frameCount: 6, frameRate: 10, repeat: 0 },
};

export const ACTORS = { HERO, ORC, SKELETON, WOLF, DIREWOLF, ORC_WARRIOR, MASKED_ORC, ORC_GRUNT };

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
