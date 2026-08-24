/**
 * Hybrid High-Fidelity Audio Engine for Emberdeep:
 * 1. Sample-based Polyphonic Web Audio Engine with pre-decoded AudioBuffers.
 * 2. Overlapping voice allocation with pitch variation (cascading coin pickups, organic combat hits).
 * 3. 2D Positional / Spatial Audio with distance attenuation & stereo panning.
 * 4. High-fidelity dynamic music streaming & crossfading engine for soundtrack & stingers.
 * 5. Dual volume control (Music & SFX) with localStorage persistence.
 * 6. Full procedural Web Audio fallback synthesizer.
 */

import { asset } from '../gfx/pack';

export type SurfaceType = 'grass' | 'dirt' | 'stone';
export type EmitterType = 'bonfire' | 'torch' | 'shrine_blood' | 'shrine_chance' | 'altar';
export type MusicTrack = 'menu' | 'dungeon' | 'boss' | 'gameover' | 'victory';

export interface SpatialEmitter {
  id: string;
  x: number;
  y: number;
  type: EmitterType;
  maxDist: number;
  baseVolume: number;
  currentGain?: GainNode;
  panner?: StereoPannerNode;
  noiseSource?: AudioBufferSourceNode;
  oscSource?: OscillatorNode;
  filterNode?: BiquadFilterNode;
}

const STORAGE_SETTINGS_KEY = 'emberdeep_audio_settings';

const MUSIC_TRACKS: Record<MusicTrack, string> = {
  menu: 'audio/track_menu.mp3',
  dungeon: 'audio/track_dungeon.mp3',
  boss: 'audio/track_boss.mp3',
  gameover: 'audio/track_gameover.mp3',
  victory: 'audio/track_victory.mp3',
};

export const SFX_CLIP = {
  SWORD_SWING: 'audio/sfx/sword_swing.mp3',
  SHIELD_BLOCK: 'audio/sfx/shield_block.mp3',
  ARROW_SHOOT: 'audio/sfx/arrow_shoot.mp3',
  ARROW_HIT: 'audio/sfx/arrow_hit.mp3',
  STAFF_CAST: 'audio/sfx/staff_cast.mp3',
  ENERGY_HIT: 'audio/sfx/energy_hit.mp3',
  SUPERNOVA: 'audio/sfx/supernova.mp3',
  DASH: 'audio/sfx/dash.mp3',
  FOOTSTEP_1: 'audio/sfx/footstep_1.mp3',
  FOOTSTEP_2: 'audio/sfx/footstep_2.mp3',
  ENEMY_HIT: 'audio/sfx/enemy_hit.mp3',
  CRIT_HIT: 'audio/sfx/crit_hit.mp3',
  PLAYER_HURT: 'audio/sfx/player_hurt.mp3',
  ENEMY_DEATH: 'audio/sfx/enemy_death.mp3',
  PLAYER_DEATH: 'audio/sfx/player_death.mp3',
  WOLF_SNARL: 'audio/sfx/wolf_snarl.mp3',
  WOLF_HOWL: 'audio/sfx/wolf_howl.mp3',
  BONE_CLEAVE: 'audio/sfx/bone_cleave.mp3',
  SKELETON_DEATH: 'audio/sfx/skeleton_death.mp3',
  ENEMY_FIREBALL_CHARGE: 'audio/sfx/enemy_fireball_charge.mp3',
  ENEMY_FIREBALL: 'audio/sfx/enemy_fireball.mp3',
  CLEAVE_WINDUP: 'audio/sfx/cleave_windup.mp3',
  ORC_ROAR: 'audio/sfx/orc_roar.mp3',
  GROUND_SLAM: 'audio/sfx/ground_slam.mp3',
  BOSS_ROAR: 'audio/sfx/boss_roar.mp3',
  BOSS_SPAWN: 'audio/sfx/boss_spawn.mp3',
  SHOCKWAVE: 'audio/sfx/shockwave.mp3',
  PROJECTILE_LAUNCH: 'audio/sfx/projectile_launch.mp3',
  BOSS_DEATH: 'audio/sfx/boss_death.mp3',
  FIRE_EXPLOSION: 'audio/sfx/fire_explosion.mp3',
  ICE_SHATTER: 'audio/sfx/ice_shatter.mp3',
  LIGHTNING_ZAP: 'audio/sfx/lightning_zap.mp3',
  SPIKE_THRUST: 'audio/sfx/spike_thrust.mp3',
  WOOD_BREAK: 'audio/sfx/wood_break.mp3',
  CHEST_OPEN: 'audio/sfx/chest_open.mp3',
  COIN_PICKUP_1: 'audio/sfx/coin_pickup_1.mp3',
  COIN_PICKUP_2: 'audio/sfx/coin_pickup_2.mp3',
  FLASK_PICKUP_1: 'audio/sfx/flask_pickup_1.mp3',
  FLASK_PICKUP_2: 'audio/sfx/flask_pickup_2.mp3',
  ITEM_ACQUIRED: 'audio/sfx/item_acquired.mp3',
  THREAT_LEVEL_UP: 'audio/sfx/threat_level_up.mp3',
  BUTTON_HOVER: 'audio/sfx/button_hover.mp3',
  MENU_CLICK: 'audio/sfx/menu_click.mp3',
  MODAL_OPEN: 'audio/sfx/modal_open.mp3',
  ACHIEVEMENT_UNLOCK: 'audio/sfx/achievement_unlock.mp3',
} as const;

class SoundFXManager {
  private ctx?: AudioContext;
  private masterGain?: GainNode;
  private ambientGain?: GainNode;
  private sfxGain?: GainNode;
  private sfxCompressor?: DynamicsCompressorNode;
  private reverbConvolver?: ConvolverNode;
  private reverbGain?: GainNode;
  private spatialGain?: GainNode;
  private initialized = false;

  // Buffer Cache for instant polyphonic playback
  private bufferCache = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer | null>>();

  // Contextual Dynamic State
  private coinPitchIndex = 0;
  private lastCoinPickupTime = 0;
  private coinComboCount = 0;
  private footstepIndex = 0;
  private flaskIndex = 0;

  // Volume channels (0.0 to 1.0)
  private musicVolume = 0.7;
  private sfxVolume = 0.8;

  // Music Player
  private currentTrack?: MusicTrack;
  private currentAudio?: HTMLAudioElement;
  private pendingTrack?: { track: MusicTrack; loop: boolean };
  private musicFadeInterval?: number;

  // Spatial Emitters
  private emitters: SpatialEmitter[] = [];
  private crackleAccum = 0;

  // Biome Ambient
  private currentBiomeDepth = 0;
  private ambientSource?: AudioBufferSourceNode;
  private ambientFilter?: BiquadFilterNode;
  private ambientTimer = 0;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { musicVolume?: number; sfxVolume?: number };
        if (typeof data.musicVolume === 'number') this.musicVolume = Math.max(0, Math.min(1, data.musicVolume));
        if (typeof data.sfxVolume === 'number') this.sfxVolume = Math.max(0, Math.min(1, data.sfxVolume));
      }
    } catch {
      // ignore
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(
        STORAGE_SETTINGS_KEY,
        JSON.stringify({ musicVolume: this.musicVolume, sfxVolume: this.sfxVolume })
      );
    } catch {
      // ignore
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
    if (this.currentAudio) {
      this.currentAudio.volume = this.musicVolume;
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.musicVolume * 0.4, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  private init(): void {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

            this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxCompressor = this.ctx.createDynamicsCompressor();
      this.sfxCompressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.sfxCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.sfxCompressor.ratio.setValueAtTime(2.5, this.ctx.currentTime);
      this.sfxCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.sfxCompressor.release.setValueAtTime(0.08, this.ctx.currentTime);
      this.sfxCompressor.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.sfxCompressor);

      if (this.ctx.createConvolver) {
        this.reverbConvolver = this.ctx.createConvolver();
        this.reverbConvolver.buffer = this.createDungeonImpulseResponse(this.ctx);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        this.reverbConvolver.connect(this.reverbGain);
        this.reverbGain.connect(this.sfxGain);
      }

      this.spatialGain = this.ctx.createGain();
      this.spatialGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.spatialGain.connect(this.sfxGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.musicVolume * 0.35, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.initialized = true;

      // Preload clips
      this.preloadAllClips();
    } catch {
      // Web Audio unsupported or blocked
    }
  }

  public unlockAudio(): void {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.pendingTrack) {
      const p = this.pendingTrack;
      this.pendingTrack = undefined;
      this.playMusic(p.track, p.loop, 0.4);
    }
  }

  private ensureContext(): AudioContext | undefined {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createDungeonImpulseResponse(ctx: AudioContext, duration = 0.9, decay = 2.4): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      const damping = Math.exp(-t * 4.0);
      left[i] = (Math.random() * 2 - 1) * env * damping;
      right[i] = (Math.random() * 2 - 1) * env * damping;
    }
    return impulse;
  }

  // ==========================================
  // SAMPLE BUFFER LOADING & POLYPHONIC PLAYBACK
  // ==========================================

  public async loadAudioBuffer(clipPath: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(clipPath);
    if (cached) return cached;

    if (this.loadingPromises.has(clipPath)) {
      return this.loadingPromises.get(clipPath)!;
    }

    const promise = (async () => {
      try {
        const ctx = this.ensureContext();
        if (!ctx) return null;
        const url = asset(clipPath);
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(clipPath, audioBuffer);
        return audioBuffer;
      } catch {
        return null;
      } finally {
        this.loadingPromises.delete(clipPath);
      }
    })();

    this.loadingPromises.set(clipPath, promise);
    return promise;
  }

  public preloadAllClips(): void {
    if (typeof window === 'undefined') return;
    Object.values(SFX_CLIP).forEach((clip) => {
      void this.loadAudioBuffer(clip);
    });
  }

  /**
   * Plays a pre-decoded audio clip with zero-latency polyphony, optional pitch variation, and 2D spatial positioning.
   */
  public playClip(
    clipPath: string,
    opts?: {
      volume?: number;
      pitch?: number;
      pitchVariance?: number;
      spatial?: { x: number; y: number; listenerX?: number; listenerY?: number; maxDist?: number };
      fallbackFn?: () => void;
      isUi?: boolean;
    }
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) {
      opts?.fallbackFn?.();
      return;
    }

    const volume = opts?.volume ?? 1.0;
    const variance = opts?.pitchVariance ?? 0;
    const basePitch = opts?.pitch ?? 1.0;
    const pitch = Math.max(0.2, basePitch + (variance > 0 ? (Math.random() * 2 - 1) * variance : 0));

    const playBuffer = (buffer: AudioBuffer) => {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.setValueAtTime(pitch, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);

        if (opts?.spatial && typeof opts.spatial.x === 'number' && typeof opts.spatial.y === 'number') {
          const lx = opts.spatial.listenerX ?? opts.spatial.x;
          const ly = opts.spatial.listenerY ?? opts.spatial.y;
          const dx = opts.spatial.x - lx;
          const dy = opts.spatial.y - ly;
          const dist = Math.hypot(dx, dy);
          const maxDist = opts.spatial.maxDist ?? 480;

          if (dist >= maxDist) return; // Beyond audible range

          const spatialVol = Math.pow(Math.max(0, 1 - dist / maxDist), 1.5);
          gain.gain.setValueAtTime(volume * spatialVol, ctx.currentTime);

          if (ctx.createStereoPanner) {
            const panner = ctx.createStereoPanner();
            const pan = Math.max(-1, Math.min(1, dx / (maxDist * 0.7)));
            panner.pan.setValueAtTime(pan, ctx.currentTime);
            source.connect(gain);
            gain.connect(panner);
            panner.connect(this.spatialGain ?? this.sfxGain!);
            source.start(0);
            return;
          }
        }

        source.connect(gain);
        gain.connect(this.sfxGain!);
        if (this.reverbConvolver && !opts?.isUi) {
          gain.connect(this.reverbConvolver);
        }
        source.start(0);
      } catch {
        opts?.fallbackFn?.();
      }
    };

    const cached = this.bufferCache.get(clipPath);
    if (cached) {
      playBuffer(cached);
      return;
    }

    // Lazy load & trigger immediately
    this.loadAudioBuffer(clipPath).then((buffer) => {
      if (buffer) {
        playBuffer(buffer);
      } else {
        opts?.fallbackFn?.();
      }
    });
  }

  // ==========================================
  // MUSIC TRACK PLAYBACK & CROSSFADE
  // ==========================================

  public playMusic(track: MusicTrack, loop = true, fadeDuration = 0.8): void {
    if (this.currentTrack === track && this.currentAudio && !this.currentAudio.paused) {
      return;
    }

    if (this.musicFadeInterval) {
      window.clearInterval(this.musicFadeInterval);
      this.musicFadeInterval = undefined;
    }

    const prevAudio = this.currentAudio;
    this.currentTrack = track;

    const audioUrl = asset(MUSIC_TRACKS[track]);
    const nextAudio = new Audio(audioUrl);
    nextAudio.loop = loop;
    nextAudio.volume = 0;

    const targetVolume = this.musicVolume;

    const startPlay = () => {
      nextAudio
        .play()
        .then(() => {
          this.currentAudio = nextAudio;
          const steps = 20;
          const stepTime = (fadeDuration * 1000) / steps;
          let currentStep = 0;

          this.musicFadeInterval = window.setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;

            if (prevAudio) {
              prevAudio.volume = Math.max(0, targetVolume * (1 - progress));
            }
            nextAudio.volume = Math.min(targetVolume, targetVolume * progress);

            if (currentStep >= steps) {
              if (this.musicFadeInterval) window.clearInterval(this.musicFadeInterval);
              this.musicFadeInterval = undefined;
              if (prevAudio) {
                prevAudio.pause();
                prevAudio.currentTime = 0;
              }
              nextAudio.volume = targetVolume;
            }
          }, stepTime);
        })
        .catch(() => {
          this.pendingTrack = { track, loop };
        });
    };

    startPlay();
  }

  public stopMusic(fadeDuration = 0.6): void {
    if (this.musicFadeInterval) {
      window.clearInterval(this.musicFadeInterval);
      this.musicFadeInterval = undefined;
    }
    this.currentTrack = undefined;
    this.pendingTrack = undefined;

    if (!this.currentAudio) return;

    const audioToStop = this.currentAudio;
    this.currentAudio = undefined;

    const startVol = audioToStop.volume;
    const steps = 15;
    const stepTime = (fadeDuration * 1000) / steps;
    let currentStep = 0;

    const interval = window.setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      audioToStop.volume = Math.max(0, startVol * (1 - progress));

      if (currentStep >= steps) {
        window.clearInterval(interval);
        audioToStop.pause();
        audioToStop.currentTime = 0;
      }
    }, stepTime);
  }

  // ==========================================
  // SPATIAL AUDIO SYSTEM (2D Positional Audio)
  // ==========================================

  registerSpatialEmitter(opts: { id: string; x: number; y: number; type: EmitterType; maxDist?: number; baseVolume?: number }): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.spatialGain) return;

    const existingIdx = this.emitters.findIndex((e) => e.id === opts.id);
    if (existingIdx >= 0) {
      this.stopEmitter(this.emitters[existingIdx]);
      this.emitters.splice(existingIdx, 1);
    }

    const maxDist = opts.maxDist ?? 240;
    const baseVolume = opts.baseVolume ?? 0.6;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);

    let panner: StereoPannerNode | undefined;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(0, ctx.currentTime);
      gainNode.connect(panner);
      panner.connect(this.spatialGain);
    } else {
      gainNode.connect(this.spatialGain);
    }

    const emitter: SpatialEmitter = {
      id: opts.id,
      x: opts.x,
      y: opts.y,
      type: opts.type,
      maxDist,
      baseVolume,
      currentGain: gainNode,
      panner,
    };

    this.startEmitterSound(emitter);
    this.emitters.push(emitter);
  }

  private startEmitterSound(emitter: SpatialEmitter): void {
    const ctx = this.ensureContext();
    if (!ctx || !emitter.currentGain) return;

    const t = ctx.currentTime;

    if (emitter.type === 'bonfire' || emitter.type === 'torch') {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(emitter.type === 'bonfire' ? 240 : 480, t);

      noise.connect(filter);
      filter.connect(emitter.currentGain);
      noise.start(t);

      emitter.noiseSource = noise;
      emitter.filterNode = filter;
    } else if (emitter.type === 'shrine_blood') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, t);

      osc.connect(filter);
      filter.connect(emitter.currentGain);
      osc.start(t);

      emitter.oscSource = osc;
      emitter.filterNode = filter;
    } else if (emitter.type === 'shrine_chance') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);

      osc.connect(emitter.currentGain);
      osc.start(t);
      emitter.oscSource = osc;
    } else if (emitter.type === 'altar') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(42, t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, t);

      osc.connect(filter);
      filter.connect(emitter.currentGain);
      osc.start(t);

      emitter.oscSource = osc;
      emitter.filterNode = filter;
    }
  }

  private stopEmitter(emitter: SpatialEmitter): void {
    try {
      emitter.noiseSource?.stop();
      emitter.noiseSource?.disconnect();
    } catch {}
    try {
      emitter.oscSource?.stop();
      emitter.oscSource?.disconnect();
    } catch {}
    try {
      emitter.filterNode?.disconnect();
      emitter.currentGain?.disconnect();
      emitter.panner?.disconnect();
    } catch {}
  }

  clearSpatialEmitters(): void {
    for (const emitter of this.emitters) {
      this.stopEmitter(emitter);
    }
    this.emitters = [];
  }

  updateSpatial(listenerX: number, listenerY: number, delta: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    this.crackleAccum += delta;
    const shouldPop = this.crackleAccum > 90;
    if (shouldPop) this.crackleAccum = 0;

    for (const emitter of this.emitters) {
      if (!emitter.currentGain) continue;

      const dx = emitter.x - listenerX;
      const dy = emitter.y - listenerY;
      const dist = Math.hypot(dx, dy);

      if (dist > emitter.maxDist) {
        emitter.currentGain.gain.setTargetAtTime(0, t, 0.05);
        continue;
      }

      const normalized = 1 - dist / emitter.maxDist;
      const gainVal = Math.pow(normalized, 1.8) * emitter.baseVolume;
      emitter.currentGain.gain.setTargetAtTime(gainVal, t, 0.05);

      if (emitter.panner) {
        const panVal = Math.max(-1, Math.min(1, dx / (emitter.maxDist * 0.75)));
        emitter.panner.pan.setTargetAtTime(panVal, t, 0.05);
      }
    }
  }

  // ==========================================
  // BIOME AMBIENT DRONE
  // ==========================================

  setBiome(depth: number): void {
    if (this.currentBiomeDepth === depth) return;
    this.currentBiomeDepth = depth;
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain) return;

    this.stopBiomeAmbient();

    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(depth === 1 ? 300 : depth === 2 ? 220 : 180, t);

    noise.connect(filter);
    filter.connect(this.ambientGain);
    noise.start(t);

    this.ambientSource = noise;
    this.ambientFilter = filter;
  }

    private stopBiomeAmbient(): void {
    try {
      this.ambientSource?.stop();
      this.ambientSource?.disconnect();
    } catch {}
    try {
      this.ambientFilter?.disconnect();
    } catch {}
    this.ambientSource = undefined;
    this.ambientFilter = undefined;
  }

  public stopAmbient(): void {
    this.stopBiomeAmbient();
  }

  updateAmbient(delta: number): void {
    this.ambientTimer += delta;
    if (this.ambientTimer > 8000 && this.ambientFilter && this.ctx) {
      this.ambientTimer = 0;
      const targetFreq = 160 + Math.random() * 200;
      this.ambientFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 2.5);
    }
  }

  // ==========================================
  // GAMEPLAY SOUND METHODS (Polyphonic Sample & Spatial)
  // ==========================================

  // --- Hero Combat & Abilities ---

  public playSwordSwing(): void {
    this.playClip(SFX_CLIP.SWORD_SWING, { volume: 0.65, pitchVariance: 0.06, fallbackFn: () => this.synthSwordSwing() });
  }

  public playWhirlwind(): void {
    this.playClip(SFX_CLIP.SWORD_SWING, { volume: 1.05, pitch: 0.95, pitchVariance: 0.03, fallbackFn: () => this.synthSwordSwing() });
  }

  public playShieldBlock(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.SHIELD_BLOCK, {
      volume: 1.0,
      pitchVariance: 0.04,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthShieldBlock(),
    });
  }

  public playArrowShoot(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.ARROW_SHOOT, {
      volume: 1.05,
      pitchVariance: 0.05,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthArrowShoot(),
    });
  }

  public playArrowVolley(x?: number, y?: number, lx?: number, ly?: number): void {
    // Cascading multi-arrow release for Ranger special attack (5 arrows fan)
    this.playArrowShoot(x, y, lx, ly);
    setTimeout(() => {
      this.playClip(SFX_CLIP.ARROW_SHOOT, {
        volume: 0.9,
        pitch: 1.08,
        spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      });
    }, 35);
    setTimeout(() => {
      this.playClip(SFX_CLIP.ARROW_SHOOT, {
        volume: 0.8,
        pitch: 0.94,
        spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      });
    }, 70);
  }

  public playArrowHit(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.ARROW_HIT, {
      volume: 0.95,
      pitchVariance: 0.06,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthArrowHit(),
    });
  }

  public playStaffCast(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.STAFF_CAST, {
      volume: 0.95,
      pitchVariance: 0.05,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 400 } : undefined,
      fallbackFn: () => this.synthStaffCast(),
    });
  }

  public playEnergyHit(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.ENERGY_HIT, {
      volume: 0.9,
      pitchVariance: 0.05,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthEnergyHit(),
    });
  }

  public playSupernova(): void {
    this.playClip(SFX_CLIP.SUPERNOVA, { volume: 1.1, fallbackFn: () => this.synthSupernova() });
  }

  public playDash(): void {
    this.playClip(SFX_CLIP.DASH, { volume: 0.5, pitch: 0.92, pitchVariance: 0.03, fallbackFn: () => this.synthDash() });
  }

  public playFootstep(surface: SurfaceType = 'stone', isSprinting = false, x?: number, y?: number, lx?: number, ly?: number): void {
    this.footstepIndex = (this.footstepIndex + 1) % 2;
    const clip = this.footstepIndex === 0 ? SFX_CLIP.FOOTSTEP_1 : SFX_CLIP.FOOTSTEP_2;
    const speedMult = isSprinting ? 1.15 : 1.0;
    const basePitch = (surface === 'grass' ? 0.9 : surface === 'dirt' ? 0.95 : 1.0) * speedMult;

    this.playClip(clip, {
      volume: isSprinting ? 0.45 : 0.35,
      pitch: basePitch,
      pitchVariance: 0.06,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 350 } : undefined,
      fallbackFn: () => this.synthFootstep(surface, isSprinting),
    });
  }

  // --- Impacts, Damage & Deaths ---

  public playEnemyHit(kind?: string | number, x?: number, y?: number, lx?: number, ly?: number): void {
    const posX = typeof kind === 'number' ? kind : x;
    const posY = typeof kind === 'number' ? x : y;
    const listX = typeof kind === 'number' ? y : lx;
    const listY = typeof kind === 'number' ? lx : ly;

    const clip = kind === 'skeleton' ? SFX_CLIP.BONE_CLEAVE : SFX_CLIP.ENEMY_HIT;

    this.playClip(clip, {
      volume: 1.0,
      pitchVariance: 0.07,
      spatial: (typeof posX === 'number' && typeof posY === 'number') ? { x: posX, y: posY, listenerX: listX, listenerY: listY, maxDist: 500 } : undefined,
      fallbackFn: () => this.synthEnemyHit(),
    });
  }

  public playCritHit(kind?: string | number, x?: number, y?: number, lx?: number, ly?: number): void {
    const posX = typeof kind === 'number' ? kind : x;
    const posY = typeof kind === 'number' ? x : y;
    const listX = typeof kind === 'number' ? y : lx;
    const listY = typeof kind === 'number' ? lx : ly;

    this.playClip(SFX_CLIP.CRIT_HIT, {
      volume: 1.15,
      pitchVariance: 0.04,
      spatial: (typeof posX === 'number' && typeof posY === 'number') ? { x: posX, y: posY, listenerX: listX, listenerY: listY, maxDist: 550 } : undefined,
      fallbackFn: () => this.synthCritHit(),
    });
  }

  public playEnemyDeath(kind?: string | number, x?: number, y?: number, lx?: number, ly?: number): void {
    const posX = typeof kind === 'number' ? kind : x;
    const posY = typeof kind === 'number' ? x : y;
    const listX = typeof kind === 'number' ? y : lx;
    const listY = typeof kind === 'number' ? lx : ly;

    const clip = kind === 'skeleton' ? SFX_CLIP.SKELETON_DEATH : SFX_CLIP.ENEMY_DEATH;

    this.playClip(clip, {
      volume: 0.95,
      pitchVariance: 0.05,
      spatial: (typeof posX === 'number' && typeof posY === 'number') ? { x: posX, y: posY, listenerX: listX, listenerY: listY, maxDist: 480 } : undefined,
      fallbackFn: () => this.synthEnemyDeath(),
    });
  }

  public playPlayerHurt(): void {
    this.playClip(SFX_CLIP.PLAYER_HURT, { volume: 1.0, pitchVariance: 0.04, fallbackFn: () => this.synthPlayerHurt() });
  }

  public playPlayerDeath(): void {
    this.playClip(SFX_CLIP.PLAYER_DEATH, { volume: 1.1, fallbackFn: () => this.synthPlayerDeath() });
  }

  // --- Monsters & Beasts ---

  public playWolfSnarl(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.WOLF_SNARL, {
      volume: 0.55,
      pitchVariance: 0.04,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 360 } : undefined,
      fallbackFn: () => this.synthWolfSnarl(),
    });
  }

  public playWolfHowl(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.WOLF_HOWL, {
      volume: 0.6,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 480 } : undefined,
      fallbackFn: () => this.synthWolfHowl(),
    });
  }

  public playWolfFrenzyRally(): void {
    this.playWolfHowl();
  }

  public playBoneCleave(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.BONE_CLEAVE, {
      volume: 0.9,
      pitchVariance: 0.05,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthBoneCleave(),
    });
  }

  public playSkeletonDeath(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.SKELETON_DEATH, {
      volume: 0.95,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthEnemyDeath(),
    });
  }

  public playEnemyFireballCharge(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.ENEMY_FIREBALL_CHARGE, {
      volume: 0.9,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthEnemyFireballCharge(),
    });
  }

  public playEnemyFireball(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.ENEMY_FIREBALL, {
      volume: 0.95,
      pitchVariance: 0.04,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthEnemyFireball(),
    });
  }

  public playCleaveWindup(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.CLEAVE_WINDUP, {
      volume: 0.9,
      pitchVariance: 0.03,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthCleaveWindup(),
    });
  }

  public playCleaveImpact(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playEnemyHit(x, y, lx, ly);
  }

  public playBossCleaveSlash(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.GROUND_SLAM, {
      volume: 1.15,
      pitch: 1.2,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 550 } : undefined,
      fallbackFn: () => this.synthGroundSlam(),
    });
  }

  public playOrcRoar(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.ORC_ROAR, {
      volume: 1.15,
      pitchVariance: 0.04,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 600 } : undefined,
      fallbackFn: () => this.synthOrcRoar(),
    });
  }

  public playOrcCharge(): void {
    this.playOrcRoar();
  }

  public playGroundSlam(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.GROUND_SLAM, {
      volume: 1.15,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 550 } : undefined,
      fallbackFn: () => this.synthGroundSlam(),
    });
  }

  // --- Archdemon Boss ---

  public playBossRoar(): void {
    this.playClip(SFX_CLIP.BOSS_ROAR, { volume: 1.2, fallbackFn: () => this.synthBossRoar() });
  }

  public playBossSpawn(): void {
    this.playClip(SFX_CLIP.BOSS_SPAWN, { volume: 1.2, fallbackFn: () => this.synthBossRoar() });
  }

  public playShockwave(): void {
    this.playClip(SFX_CLIP.SHOCKWAVE, { volume: 1.15, fallbackFn: () => this.synthShockwave() });
  }

  public playProjectileLaunch(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.PROJECTILE_LAUNCH, {
      volume: 1.0,
      pitchVariance: 0.04,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 500 } : undefined,
      fallbackFn: () => this.synthProjectileLaunch(),
    });
  }

  public playBossDeath(): void {
    this.playClip(SFX_CLIP.BOSS_DEATH, { volume: 1.2, fallbackFn: () => this.synthBossDeath() });
  }

  // --- Elemental Combos ---

  public playFireExplosion(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.FIRE_EXPLOSION, {
      volume: 1.05,
      pitchVariance: 0.04,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 550 } : undefined,
      fallbackFn: () => this.synthFireExplosion(),
    });
  }

  public playFireballImpact(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playFireExplosion(x, y, lx, ly);
  }

  public playIceShatter(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.ICE_SHATTER, {
      volume: 1.0,
      pitchVariance: 0.04,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 550 } : undefined,
      fallbackFn: () => this.synthIceShatter(),
    });
  }

  public playLightningZap(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.LIGHTNING_ZAP, {
      volume: 0.95,
      pitchVariance: 0.05,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 500 } : undefined,
      fallbackFn: () => this.synthLightningZap(),
    });
  }

  // --- Environment & Loot ---

  public playSpikeTrigger(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.SPIKE_THRUST, {
      volume: 0.95,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 400 } : undefined,
      fallbackFn: () => this.synthSpikeTrigger(),
    });
  }

  public playSpikeThrust(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playSpikeTrigger(x, y, lx, ly);
  }

  public playWoodBreak(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.WOOD_BREAK, {
      volume: 1.0,
      pitchVariance: 0.05,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 450 } : undefined,
      fallbackFn: () => this.synthWoodBreak(),
    });
  }

  public playChestOpen(x?: number, y?: number, lx?: number, ly?: number): void {
    this.playClip(SFX_CLIP.CHEST_OPEN, {
      volume: 1.0,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 500 } : undefined,
      fallbackFn: () => this.synthChestOpen(),
    });
  }

  /**
   * Polyphonic Coin Pickup with dynamic cascading musical scale pitch-up for rapid coin clusters!
   */
  public playCoinPickup(x?: number, y?: number, lx?: number, ly?: number): void {
    const now = Date.now();
    if (now - this.lastCoinPickupTime < 450) {
      this.coinComboCount = Math.min(10, this.coinComboCount + 1);
    } else {
      this.coinComboCount = 0;
    }
    this.lastCoinPickupTime = now;

    // Musical scale rise on chain pickups (0% -> +35% pitch)
    const pitch = 1.0 + this.coinComboCount * 0.035 + (Math.random() * 0.04 - 0.02);

    this.coinPitchIndex = (this.coinPitchIndex + 1) % 2;
    const clip = this.coinPitchIndex === 0 ? SFX_CLIP.COIN_PICKUP_1 : SFX_CLIP.COIN_PICKUP_2;

    this.playClip(clip, {
      volume: 0.85,
      pitch,
      spatial: (typeof x === 'number' && typeof y === 'number') ? { x, y, listenerX: lx, listenerY: ly, maxDist: 400 } : undefined,
      fallbackFn: () => this.synthCoinPickup(),
    });
  }

  public playFlaskPickup(): void {
    this.flaskIndex = (this.flaskIndex + 1) % 2;
    const clip = this.flaskIndex === 0 ? SFX_CLIP.FLASK_PICKUP_1 : SFX_CLIP.FLASK_PICKUP_2;
    this.playClip(clip, { volume: 0.9, pitchVariance: 0.03, fallbackFn: () => this.synthFlaskPickup() });
  }

  public playItemAcquired(): void {
    this.playClip(SFX_CLIP.ITEM_ACQUIRED, { volume: 1.05, fallbackFn: () => this.synthItemAcquired() });
  }

  public playPowerUp(): void {
    this.playItemAcquired();
  }

  public playThreatLevelUp(): void {
    this.playClip(SFX_CLIP.THREAT_LEVEL_UP, { volume: 1.1, fallbackFn: () => this.synthThreatLevelUp() });
  }

  // --- UI & Menu ---

  public playButtonHover(): void {
    this.playClip(SFX_CLIP.BUTTON_HOVER, { volume: 0.45, isUi: true, fallbackFn: () => this.synthButtonHover() });
  }

  public playMenuClick(): void {
    this.playClip(SFX_CLIP.MENU_CLICK, { volume: 0.7, isUi: true, fallbackFn: () => this.synthMenuClick() });
  }

  public playSliderTick(): void {
    this.playMenuClick();
  }

  public playModalOpen(): void {
    this.playClip(SFX_CLIP.MODAL_OPEN, { volume: 0.8, isUi: true, fallbackFn: () => this.synthModalOpen() });
  }

  public playModalClose(): void {
    this.playModalOpen();
  }

  public playAchievementUnlocked(): void {
    this.playClip(SFX_CLIP.ACHIEVEMENT_UNLOCK, { volume: 1.05, fallbackFn: () => this.synthAchievementUnlocked() });
  }

  // ==========================================
  // PROCEDURAL WEB AUDIO SYNTHESIZER FALLBACKS
  // ==========================================

  private synthSwordSwing(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private synthShieldBlock(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.18);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  private synthArrowShoot(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  private synthArrowHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  private synthStaffCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(840, t + 0.15);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  private synthEnergyHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  private synthSupernova(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(950, t + 0.35);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.7);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  private synthDash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.14);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  private synthFootstep(surface: SurfaceType, isSprinting: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = surface === 'stone' ? 120 : surface === 'dirt' ? 80 : 160;
    osc.frequency.setValueAtTime(baseFreq * (isSprinting ? 1.2 : 1.0), t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.06);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  private synthEnemyHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  private synthCritHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  private synthPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.16);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  private synthEnemyDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.25);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  private synthPlayerDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.8);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  private synthWolfSnarl(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(95, t + 0.2);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private synthWolfHowl(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(440, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.7);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  private synthBoneCleave(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private synthEnemyFireballCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.3);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  private synthEnemyFireball(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  private synthCleaveWindup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.25);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  private synthOrcRoar(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.5);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  private synthGroundSlam(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  private synthBossRoar(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.9);
    gain.gain.setValueAtTime(0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.9);
  }

  private synthShockwave(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.45);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  private synthProjectileLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private synthBossDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(18, t + 1.2);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  private synthFireExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  private synthIceShatter(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.2);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private synthLightningZap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  private synthSpikeTrigger(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.14);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  private synthWoodBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.16);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  private synthChestOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(420, t + 0.25);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  private synthCoinPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987, t);
    osc.frequency.exponentialRampToValueAtTime(1318, t + 0.08);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private synthFlaskPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.14);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private synthItemAcquired(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.35, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.35);
    });
  }

  private synthThreatLevelUp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.6);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  private synthButtonHover(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.03);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  private synthMenuClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private synthModalOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.linearRampToValueAtTime(560, t + 0.08);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private synthAchievementUnlocked(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.09);
      gain.gain.setValueAtTime(0.4, t + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.4);
    });
  }
}

export const SoundFX = new SoundFXManager();
