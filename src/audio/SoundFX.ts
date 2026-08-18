/**
 * Procedural Web Audio API sound synthesizer for Emberdeep.
 * Zero external audio files or dependencies needed.
 */
class SoundFXManager {
  private ctx?: AudioContext;
  private masterGain?: GainNode;
  private initialized = false;

  private init(): void {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
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

  /** Subtle whoosh / swoosh sound when swinging a blade */
  playSwordSwing(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Noise buffer for blade cutting air
    const bufferSize = Math.floor(ctx.sampleRate * 0.12);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    filter.type = 'bandpass';
    const pitchJitter = 0.9 + Math.random() * 0.2;
    filter.frequency.setValueAtTime(450 * pitchJitter, t);
    filter.frequency.exponentialRampToValueAtTime(1400 * pitchJitter, t + 0.05);
    filter.frequency.exponentialRampToValueAtTime(300 * pitchJitter, t + 0.12);
    filter.Q.setValueAtTime(3, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.12);

    // Low whoosh undertone
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 * pitchJitter, t);
    osc.frequency.exponentialRampToValueAtTime(110 * pitchJitter, t + 0.1);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Impact sound when blade hits an enemy */
  playEnemyHit(kind: string): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const jitter = 0.88 + Math.random() * 0.24;

    if (kind === 'skeleton') {
      // Sharp crunchy bone crack
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(720 * jitter, t);
      osc.frequency.exponentialRampToValueAtTime(140 * jitter, t + 0.07);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      // Noise click
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(1200, t);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      osc.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      osc.start(t);
      osc.stop(t + 0.08);
    } else {
      // Fleshy punch / squelch impact for Orc / Imp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160 * jitter, t);
      osc.frequency.exponentialRampToValueAtTime(42 * jitter, t + 0.12);

      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.12);

      // Squelch noise burst
      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.7;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      noise.connect(filter);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.08);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  /** Heavy crunch / crumble sound when enemy dies */
  playEnemyDeath(kind: string): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const jitter = 0.9 + Math.random() * 0.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === 'skeleton' ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(220 * jitter, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /** Heavy impact when hero takes damage */
  playPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Healing flask pickup shimmer chime */
  playFlaskPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);
      gain.gain.setValueAtTime(0.2, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.15);
    });
  }

  /** Chest opening creak & treasure sound */
  playChestOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    // Creak
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(260, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);

    // Chime
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(freq, t + 0.08 + i * 0.05);
      cGain.gain.setValueAtTime(0.25, t + 0.08 + i * 0.05);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08 + i * 0.05 + 0.22);
      chime.connect(cGain);
      cGain.connect(this.masterGain!);
      chime.start(t + 0.08 + i * 0.05);
      chime.stop(t + 0.08 + i * 0.05 + 0.22);
    });
  }

  /** Splintering wood crack / smash sound when a barrel or crate breaks */
  playWoodBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const jitter = 0.88 + Math.random() * 0.24;

    // Heavy low wood thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180 * jitter, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.16);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);

    // High crunch splinter noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.14);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 * jitter, t);
    filter.frequency.exponentialRampToValueAtTime(250 * jitter, t + 0.14);
    filter.Q.setValueAtTime(2.5, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.14);
  }

  /** Pleasant retro coin pickup chime */
  playCoinPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, t); // B5
    gain1.gain.setValueAtTime(0.22, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, t + 0.06); // E6
    gain2.gain.setValueAtTime(0.28, t + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t + 0.06);
    osc2.stop(t + 0.22);
  }

  /** Triumphant item acquired fanfare chord */
  playItemAcquired(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C Major arpeggio
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);
      gain.gain.setValueAtTime(0.3, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.35);
    });
  }

  /** Heavy crunchy critical hit sound */
  playCritHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /** Electric lightning crackle for Storm Earring */
  playLightningZap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.12);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.frequency.linearRampToValueAtTime(400, t + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.12);
  }

  /** Fiery explosion blast for Oil Lamp */
  playFireExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

export const SoundFX = new SoundFXManager();
