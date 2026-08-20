/**
 * Procedural Web Audio API sound synthesizer and 2D Spatial Audio Engine for Emberdeep.
 * Zero external audio files or dependencies needed.
 */

export type SurfaceType = 'grass' | 'dirt' | 'stone';
export type EmitterType = 'bonfire' | 'torch' | 'shrine_blood' | 'shrine_chance' | 'altar';

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

class SoundFXManager {
  private ctx?: AudioContext;
  private masterGain?: GainNode;
  private ambientGain?: GainNode;
  private sfxGain?: GainNode;
  private spatialGain?: GainNode;
  private initialized = false;

  // Spatial Emitters
  private emitters: SpatialEmitter[] = [];
  private crackleAccum = 0;

  // Biome Ambient
  private currentBiomeDepth = 0;
  private ambientSource?: AudioBufferSourceNode;
  private ambientFilter?: BiquadFilterNode;
  private ambientOsc?: OscillatorNode;
  private ambientOscGain?: GainNode;
  private ambientTimer = 0;

  private init(): void {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.spatialGain = this.ctx.createGain();
      this.spatialGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.spatialGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.initialized = true;
    } catch {
      // Web Audio unsupported or blocked
    }
  }

  private ensureContext(): AudioContext | undefined {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
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
      // Pink/Brownian fire rumble buffer
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
      // 55Hz pulsing dark drone
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
      // Harmonic pure chime drone
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);

      osc.connect(emitter.currentGain);
      osc.start(t);
      emitter.oscSource = osc;
    } else if (emitter.type === 'altar') {
      // Deep 42Hz void sub-bass
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

      // Smooth inverse quadratic attenuation
      const normalized = 1 - dist / emitter.maxDist;
      const gainVal = Math.pow(normalized, 1.8) * emitter.baseVolume;
      emitter.currentGain.gain.setTargetAtTime(gainVal, t, 0.05);

      // Stereo Panning (-1 = left, +1 = right)
      if (emitter.panner) {
        const panVal = Math.max(-1, Math.min(1, dx / (emitter.maxDist * 0.75)));
        emitter.panner.pan.setTargetAtTime(panVal, t, 0.05);
      }

      // Procedural Fire Pop / Wood Crackle when close to campfire
      if (emitter.type === 'bonfire' && shouldPop && dist < 180 && Math.random() < 0.45) {
        this.playPopcornCrackle(emitter.x, emitter.y, listenerX, listenerY);
      }
    }

    // Biome Ambient One-Shot Triggers
    this.updateAmbientOneShots(delta);
  }

  private playPopcornCrackle(emitX: number, emitY: number, listX: number, listY: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.spatialGain) return;

    const dist = Math.hypot(emitX - listX, emitY - listY);
    if (dist > 220) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    const pitch = 1200 + Math.random() * 2400;
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.025);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch, t);
    filter.Q.setValueAtTime(4, t);

    const norm = 1 - dist / 220;
    const popVol = Math.pow(norm, 2) * (0.08 + Math.random() * 0.12);

    gain.gain.setValueAtTime(popVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.spatialGain);

    osc.start(t);
    osc.stop(t + 0.025);
  }

  // ==========================================
  // BIOME AMBIENT SOUNDSCAPES
  // ==========================================

  setBiome(depth: number): void {
    if (this.currentBiomeDepth === depth) return;
    this.currentBiomeDepth = depth;
    this.stopAmbient();

    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain) return;

    const t = ctx.currentTime;

    // Pink noise wind / draft loop
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();

    if (depth === 1) {
      // Ruins: Gentle nocturnal forest wind & leafy rustling
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);
      this.ambientGain.gain.setValueAtTime(0.28, t);
    } else if (depth === 2) {
      // Catacombs: Cold resonant underground air draft
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(220, t);
      filter.Q.setValueAtTime(2.5, t);
      this.ambientGain.gain.setValueAtTime(0.32, t);
    } else if (depth === 3) {
      // Magma: Heavy volcanic magma rumble
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, t);
      this.ambientGain.gain.setValueAtTime(0.38, t);
    } else {
      // Void: Hollow eerie cosmic ether
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(360, t);
      filter.Q.setValueAtTime(4.0, t);
      this.ambientGain.gain.setValueAtTime(0.35, t);
    }

    noise.connect(filter);
    filter.connect(this.ambientGain);
    noise.start(t);

    this.ambientSource = noise;
    this.ambientFilter = filter;
  }

  stopAmbient(): void {
    try {
      this.ambientSource?.stop();
      this.ambientSource?.disconnect();
      this.ambientFilter?.disconnect();
      this.ambientOsc?.stop();
      this.ambientOsc?.disconnect();
      this.ambientOscGain?.disconnect();
    } catch {}
    this.ambientSource = undefined;
    this.ambientFilter = undefined;
    this.ambientOsc = undefined;
    this.ambientOscGain = undefined;
  }

  private updateAmbientOneShots(delta: number): void {
    this.ambientTimer += delta;
    if (this.ambientTimer < 6000) return;
    this.ambientTimer = 0;

    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain) return;

    if (this.currentBiomeDepth === 1) {
      // Forest: Distant wind gust or night bird/cricket
      if (Math.random() < 0.6) this.playDistantWindGust();
    } else if (this.currentBiomeDepth === 2) {
      // Catacombs: Cave water drip with echo
      if (Math.random() < 0.75) this.playCaveWaterDrip();
    } else if (this.currentBiomeDepth === 3) {
      // Magma: Lava bubble pop
      if (Math.random() < 0.7) this.playLavaBubble();
    }
  }

  private playDistantWindGust(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 1.2);
    osc.frequency.exponentialRampToValueAtTime(80, t + 2.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(t);
    osc.stop(t + 2.5);
  }

  private playCaveWaterDrip(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const pitch = 900 + Math.random() * 600;
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, t + 0.14);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  private playLavaBubble(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.16);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // ==========================================
  // FOLEY & DYNAMIC FOOTSTEPS
  // ==========================================

  playFootstep(surface: SurfaceType, isSprinting = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const jitter = 0.9 + Math.random() * 0.2;
    const vol = (isSprinting ? 0.18 : 0.12) * jitter;

    if (surface === 'grass') {
      // Soft leafy swish / brush
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450 * jitter, t);
      filter.Q.setValueAtTime(1.8, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(t);
      noise.stop(t + 0.06);
    } else if (surface === 'dirt') {
      // Crunchy gravel step
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const bufferSize = Math.floor(ctx.sampleRate * 0.05);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100 * jitter, t);
      filter.Q.setValueAtTime(2.2, t);

      gain.gain.setValueAtTime(vol * 0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(t);
      noise.stop(t + 0.05);
    } else {
      // Stone tile tap with crisp transient
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 * jitter, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.04);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.04);
    }
  }

  // ==========================================
  // WEAPONS, ENVIRONMENT & INTERACTION SOUNDS
  // ==========================================

  /** Rich slicing blade swoosh with subtle steel resonance */
  playSwordSwing(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;

    // Cutting air whoosh
    const bufferSize = Math.floor(ctx.sampleRate * 0.14);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500 * jitter, t);
    filter.frequency.exponentialRampToValueAtTime(1600 * jitter, t + 0.05);
    filter.frequency.exponentialRampToValueAtTime(350 * jitter, t + 0.14);
    filter.Q.setValueAtTime(3.5, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.14);

    // Subtle metallic edge blade ring
    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(880 * jitter, t);
    ring.frequency.exponentialRampToValueAtTime(440 * jitter, t + 0.08);

    ringGain.gain.setValueAtTime(0.08, t);
    ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    ring.connect(ringGain);
    ringGain.connect(this.sfxGain);
    ring.start(t);
    ring.stop(t + 0.08);
  }

  /** Whistling arrow release from bow */
  playArrowShoot(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const twang = ctx.createOscillator();
    const twangGain = ctx.createGain();
    twang.type = 'triangle';
    twang.frequency.setValueAtTime(480, t);
    twang.frequency.exponentialRampToValueAtTime(140, t + 0.1);

    twangGain.gain.setValueAtTime(0.35, t);
    twangGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    twang.connect(twangGain);
    twangGain.connect(this.sfxGain);
    twang.start(t);
    twang.stop(t + 0.1);

    // Whistling zip
    const whoosh = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whoosh.type = 'sine';
    whoosh.frequency.setValueAtTime(900, t);
    whoosh.frequency.exponentialRampToValueAtTime(1800, t + 0.04);
    whoosh.frequency.exponentialRampToValueAtTime(550, t + 0.16);

    whooshGain.gain.setValueAtTime(0.22, t);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    whoosh.connect(whooshGain);
    whooshGain.connect(this.sfxGain);
    whoosh.start(t);
    whoosh.stop(t + 0.16);
  }

  /** Arrow impact thump */
  playArrowHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.09);

    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /** Resonant mystical staff energy cast */
  playStaffCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // Harmonic singing crystal/arcane chime
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(620, t);
    chime.frequency.exponentialRampToValueAtTime(1400, t + 0.06);
    chime.frequency.exponentialRampToValueAtTime(880, t + 0.18);

    chimeGain.gain.setValueAtTime(0.28, t);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    chime.connect(chimeGain);
    chimeGain.connect(this.sfxGain);
    chime.start(t);
    chime.stop(t + 0.18);

    // Deep mana surge resonance
    const surge = ctx.createOscillator();
    const surgeGain = ctx.createGain();
    surge.type = 'triangle';
    surge.frequency.setValueAtTime(220, t);
    surge.frequency.exponentialRampToValueAtTime(110, t + 0.14);

    surgeGain.gain.setValueAtTime(0.32, t);
    surgeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    surge.connect(surgeGain);
    surgeGain.connect(this.sfxGain);
    surge.start(t);
    surge.stop(t + 0.14);
  }

  /** Arcane energy blast impact / detonation */
  playEnergyHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // Crisp high-frequency glass/energy shatter
    const spark = ctx.createOscillator();
    const sparkGain = ctx.createGain();
    spark.type = 'sine';
    spark.frequency.setValueAtTime(1200, t);
    spark.frequency.exponentialRampToValueAtTime(320, t + 0.12);

    sparkGain.gain.setValueAtTime(0.35, t);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    spark.connect(sparkGain);
    sparkGain.connect(this.sfxGain);
    spark.start(t);
    spark.stop(t + 0.12);

    // Low sub-bass pop
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(240, t);
    sub.frequency.exponentialRampToValueAtTime(45, t + 0.14);

    subGain.gain.setValueAtTime(0.42, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.14);
  }

  /** Arcane Supernova cosmic release burst */
  playSupernova(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;

    // Rising ethereal power chord
    const freqs = [330, 440, 660, 880];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.45);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  /** Tree chop axe/blade thud into solid trunk */
  playTreeChop(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);

    this.playWoodBreak();
  }

  /** Tree toppling over with wood fracture and crash */
  playTreeFall(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    // Heavy wooden trunk creak & crash
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  /** Heavy chest open with creaking wood lid & latch */
  playChestOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    // Wooden lid creak
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.28);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, t);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.28);

    // Brass latch sparkle chime
    this.playItemAcquired();
  }

  /** Impact sound when blade hits an enemy */
  playEnemyHit(kind: string): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const jitter = 0.88 + Math.random() * 0.24;

    if (kind === 'skeleton') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(720 * jitter, t);
      osc.frequency.exponentialRampToValueAtTime(180 * jitter, t + 0.06);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.06);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240 * jitter, t);
      osc.frequency.exponentialRampToValueAtTime(70 * jitter, t + 0.08);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  /** Critical hit heavy slash */
  playCritHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Enemy death sound */
  playEnemyDeath(kind: string): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (kind === 'skeleton') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.22);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.26);
    }

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /** Player hurt sound */
  playPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.12);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Player death chord */
  playPlayerDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const notes = [220, 185, 146, 110];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.45);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  /** Item acquired chime */
  playItemAcquired(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  /** Gold coin pickup */
  playCoinPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const pitch = 987.77 + Math.random() * 80;
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.setValueAtTime(pitch * 1.33, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** Health flask pickup */
  playHealthPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /** Wood crate / barrel smash */
  playWoodBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /** Stairs descent */
  playStairsDescent(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const notes = [587.33, 493.88, 440, 329.63, 220];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  /** Altar activation shockwave */
  playAltarActivate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.8);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  /** Demon Boss spawn roar */
  playBossSpawn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.2);
    osc.frequency.exponentialRampToValueAtTime(45, t + 1.1);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.1);
  }

  /** Repel Shockwave */
  playShockwave(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /** Knight Whirlwind */
  playWhirlwind(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.35);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /** Ranger Volley */
  playVolley(): void {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.playArrowShoot(), i * 35);
    }
  }

  /** Shift Dash */
  playDash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /** Achievement Unlocked fanfare */
  playAchievementUnlocked(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  /** Threat Level Up warning chord */
  playThreatLevelUp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.4);

    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /** Menu click */
  playMenuClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  playBossRoar(): void {
    this.playBossSpawn();
  }

  playProjectileLaunch(): void {
    this.playArrowShoot();
  }

  playBossDeath(): void {
    this.playEnemyDeath('demon');
  }

  playFlaskPickup(): void {
    this.playHealthPickup();
  }

  playFireExplosion(): void {
    this.playAltarActivate();
  }

  playLightningZap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }
}

export const SoundFX = new SoundFXManager();
