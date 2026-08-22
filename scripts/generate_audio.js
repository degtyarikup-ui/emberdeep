import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.resolve(__dirname, '../public/assets/audio');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const SAMPLE_RATE = 44100;

class SynthAudioBuffer {
  constructor(durationSec) {
    this.length = Math.floor(durationSec * SAMPLE_RATE);
    this.left = new Float32Array(this.length);
    this.right = new Float32Array(this.length);
  }

  addSample(index, l, r) {
    if (index >= 0 && index < this.length) {
      this.left[index] += l;
      this.right[index] += r;
    }
  }

  // Multi-tap stereo reverb delay
  applyReverb(decay = 0.45, delaySamples = 4410) {
    const taps = [
      { delay: Math.floor(delaySamples * 0.7), gain: decay * 0.7, pan: -0.5 },
      { delay: Math.floor(delaySamples * 1.0), gain: decay * 0.6, pan: 0.5 },
      { delay: Math.floor(delaySamples * 1.37), gain: decay * 0.4, pan: -0.3 },
      { delay: Math.floor(delaySamples * 1.83), gain: decay * 0.3, pan: 0.3 },
      { delay: Math.floor(delaySamples * 2.5), gain: decay * 0.2, pan: 0.0 },
    ];

    const outL = new Float32Array(this.length);
    const outR = new Float32Array(this.length);

    for (let i = 0; i < this.length; i++) {
      let l = this.left[i];
      let r = this.right[i];

      for (const tap of taps) {
        if (i >= tap.delay) {
          const prevL = this.left[i - tap.delay];
          const prevR = this.right[i - tap.delay];
          const panL = 0.5 - tap.pan * 0.5;
          const panR = 0.5 + tap.pan * 0.5;
          l += (prevL * panL + prevR * (1 - panR)) * tap.gain;
          r += (prevR * panR + prevL * (1 - panL)) * tap.gain;
        }
      }
      outL[i] = l;
      outR[i] = r;
    }

    this.left = outL;
    this.right = outR;
  }

  // Soft master limiter to prevent clipping and add warmth
  normalizeAndMaster(targetPeak = 0.92) {
    let max = 0;
    for (let i = 0; i < this.length; i++) {
      max = Math.max(max, Math.abs(this.left[i]), Math.abs(this.right[i]));
    }
    if (max > 0.001) {
      const scale = targetPeak / max;
      for (let i = 0; i < this.length; i++) {
        // Soft tube saturation curve: x / (1 + |x|)
        let l = this.left[i] * scale;
        let r = this.right[i] * scale;
        this.left[i] = Math.tanh(l * 1.1) / 1.1;
        this.right[i] = Math.tanh(r * 1.1) / 1.1;
      }
    }
  }

  toWavBuffer() {
    const numChannels = 2;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = SAMPLE_RATE * blockAlign;
    const dataSize = this.length * blockAlign;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // subchunk1size (PCM)
    buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(SAMPLE_RATE, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    let offset = 44;
    for (let i = 0; i < this.length; i++) {
      const sL = Math.max(-1, Math.min(1, this.left[i]));
      const sR = Math.max(-1, Math.min(1, this.right[i]));
      const valL = sL < 0 ? sL * 32768 : sL * 32767;
      const valR = sR < 0 ? sR * 32768 : sR * 32767;
      buffer.writeInt16LE(Math.floor(valL), offset);
      buffer.writeInt16LE(Math.floor(valR), offset + 2);
      offset += 4;
    }

    return buffer;
  }
}

// Lowpass Biquad Filter
class BiquadFilter {
  constructor(cutoff, q = 1) {
    const w0 = (2 * Math.PI * cutoff) / SAMPLE_RATE;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);

    const b0 = (1 - cosw0) / 2;
    const b1 = 1 - cosw0;
    const b2 = (1 - cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;

    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
  }

  process(sample) {
    const out = this.b0 * sample + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = sample;
    this.y2 = this.y1;
    this.y1 = out;
    return out;
  }
}

// Helpers
const mtof = (note) => 440 * Math.pow(2, (note - 69) / 12);

// Pluck sound generator (Lute / Harp / Bells)
function renderPluck(buf, startTime, duration, freq, gain = 0.3, pan = 0) {
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const filter = new BiquadFilter(freq * 3.5, 2);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * (4.5 + freq * 0.003));
    // Plucked string harmonic spectrum
    let s = Math.sin(2 * Math.PI * freq * t) * 0.6 +
            Math.sin(4 * Math.PI * freq * t) * 0.25 +
            Math.sin(6 * Math.PI * freq * t) * 0.12 +
            Math.sin(8 * Math.PI * freq * t) * 0.05;
    // Transient pluck noise
    if (i < 400) {
      s += (Math.random() * 2 - 1) * Math.exp(-i / 80) * 0.4;
    }
    s = filter.process(s) * env * gain;

    const panL = 0.5 - pan * 0.5;
    const panR = 0.5 + pan * 0.5;
    buf.addSample(startIdx + i, s * panL, s * panR);
  }
}

// Pad generator (warm strings / atmosphere)
function renderPadChord(buf, startTime, duration, freqs, gain = 0.15) {
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const attackSamples = Math.floor(0.8 * SAMPLE_RATE);
  const releaseSamples = Math.floor(1.0 * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let env = 1.0;
    if (i < attackSamples) env = i / attackSamples;
    else if (i > totalSamples - releaseSamples) env = (totalSamples - i) / releaseSamples;

    let sL = 0;
    let sR = 0;

    for (let fIdx = 0; fIdx < freqs.length; fIdx++) {
      const f = freqs[fIdx];
      // Detuned chorus
      const s1 = Math.sin(2 * Math.PI * (f * 0.998) * t);
      const s2 = Math.sin(2 * Math.PI * (f * 1.002) * t);
      const s3 = Math.sin(2 * Math.PI * (f * 0.5) * t) * 0.5; // sub octave
      const saw = ((t * f) % 1) * 2 - 1; // mild sawtooth warmth

      const wave = (s1 + s2 + s3 + saw * 0.2) * 0.25;
      const pan = (fIdx / (freqs.length - 1 || 1)) * 0.6 - 0.3;
      sL += wave * (0.5 - pan * 0.5);
      sR += wave * (0.5 + pan * 0.5);
    }

    buf.addSample(startIdx + i, sL * env * gain, sR * env * gain);
  }
}

// Deep Sub Bass Note
function renderSubBass(buf, startTime, duration, freq, gain = 0.4) {
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const attackSamples = Math.floor(0.04 * SAMPLE_RATE);
  const releaseSamples = Math.floor(0.2 * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let env = 1.0;
    if (i < attackSamples) env = i / attackSamples;
    else if (i > totalSamples - releaseSamples) env = (totalSamples - i) / releaseSamples;

    const s = (Math.sin(2 * Math.PI * freq * t) * 0.8 +
               Math.sin(2 * Math.PI * freq * 2 * t) * 0.25) * env * gain;
    buf.addSample(startIdx + i, s * 0.5, s * 0.5);
  }
}

// Drum Hit (Kick / Taiko)
function renderKick(buf, startTime, gain = 0.5) {
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(0.35 * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const pitch = 140 * Math.exp(-t * 26) + 40;
    const env = Math.exp(-t * 9);
    const click = i < 120 ? (Math.random() * 2 - 1) * 0.3 : 0;
    const s = (Math.sin(2 * Math.PI * pitch * t) + click) * env * gain;
    buf.addSample(startIdx + i, s * 0.5, s * 0.5);
  }
}

// Snare / Rim Drum
function renderSnare(buf, startTime, gain = 0.35) {
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(0.25 * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const tone = Math.sin(2 * Math.PI * (180 * Math.exp(-t * 20)) * t) * 0.4;
    const noise = (Math.random() * 2 - 1) * 0.6;
    const env = Math.exp(-t * 14);
    const s = (tone + noise) * env * gain;
    buf.addSample(startIdx + i, s * 0.5, s * 0.5);
  }
}

// Hi-hat / Shaker
function renderHat(buf, startTime, gain = 0.15, pan = 0.2) {
  const startIdx = Math.floor(startTime * SAMPLE_RATE);
  const totalSamples = Math.floor(0.06 * SAMPLE_RATE);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const noise = (Math.random() * 2 - 1);
    const env = Math.exp(-t * 45);
    const s = noise * env * gain;
    buf.addSample(startIdx + i, s * (0.5 - pan * 0.5), s * (0.5 + pan * 0.5));
  }
}

// ==========================================
// 1. TRACK_MENU (Dark Fantasy Campfire Refuge)
// ==========================================
function generateMenuTrack() {
  console.log('Generating track_menu.wav...');
  const duration = 24.0; // 24s loop at 80 BPM
  const bpm = 80;
  const beat = 60 / bpm;
  const buf = new SynthAudioBuffer(duration);

  // Chord progression: Dm -> Bb -> C -> Am (each 3.0s, repeated 4 times)
  const chords = [
    { notes: [50, 57, 62, 65], root: 38 }, // Dm (D2, D3, A3, D4, F4)
    { notes: [46, 58, 62, 65], root: 34 }, // Bb (Bb1, Bb3, D4, F4)
    { notes: [48, 55, 60, 64], root: 36 }, // C (C2, G3, C4, E4)
    { notes: [45, 57, 60, 64], root: 33 }, // Am (A1, A3, C4, E4)
    { notes: [50, 57, 62, 65], root: 38 }, // Dm
    { notes: [46, 58, 62, 65], root: 34 }, // Bb
    { notes: [48, 55, 60, 64], root: 36 }, // C
    { notes: [50, 57, 62, 65], root: 38 }, // Dm
  ];

  chords.forEach((chord, cIdx) => {
    const cTime = cIdx * 3.0;
    const freqs = chord.notes.map(mtof);
    renderPadChord(buf, cTime, 3.2, freqs, 0.16);
    renderSubBass(buf, cTime, 2.9, mtof(chord.root), 0.35);

    // Atmospheric arpeggio plucks
    const arpNotes = [...chord.notes, chord.notes[1] + 12, chord.notes[2] + 12];
    for (let step = 0; step < 8; step++) {
      const pTime = cTime + step * (3.0 / 8);
      const note = arpNotes[(step * 2 + (cIdx % 3)) % arpNotes.length];
      const pan = Math.sin(step * 1.5) * 0.45;
      renderPluck(buf, pTime, 0.65, mtof(note), 0.18, pan);
    }
  });

  // Ambient wind chime & soft texture
  buf.applyReverb(0.48, 5200);
  buf.normalizeAndMaster(0.92);
  return buf;
}

// ==========================================
// 2. TRACK_DUNGEON (Subterranean Mystery & Tension)
// ==========================================
function generateDungeonTrack() {
  console.log('Generating track_dungeon.wav...');
  const duration = 28.8; // 100 BPM: 12 bars of 4/4
  const bpm = 100;
  const beat = 60 / bpm;
  const buf = new SynthAudioBuffer(duration);

  // Progression: Cm -> Ab -> Fm -> G (tense minor)
  const chords = [
    { notes: [48, 55, 60, 63], bass: 36 }, // Cm
    { notes: [44, 56, 60, 63], bass: 32 }, // Ab
    { notes: [41, 53, 56, 60], bass: 29 }, // Fm
    { notes: [43, 55, 59, 62], bass: 31 }, // G
    { notes: [48, 55, 60, 63], bass: 36 }, // Cm
    { notes: [44, 56, 60, 63], bass: 32 }, // Ab
    { notes: [41, 53, 56, 60], bass: 29 }, // Fm
    { notes: [43, 55, 59, 62], bass: 31 }, // G
    { notes: [48, 55, 60, 63], bass: 36 }, // Cm
    { notes: [44, 56, 60, 63], bass: 32 }, // Ab
    { notes: [41, 53, 56, 60], bass: 29 }, // Fm
    { notes: [48, 55, 60, 63], bass: 36 }, // Cm
  ];

  chords.forEach((c, idx) => {
    const cTime = idx * (beat * 4);
    const freqs = c.notes.map(mtof);
    renderPadChord(buf, cTime, beat * 4.2, freqs, 0.14);

    // Pulsing bassline
    for (let b = 0; b < 4; b++) {
      const bTime = cTime + b * beat;
      renderSubBass(buf, bTime, beat * 0.85, mtof(c.bass), 0.32);
      // Subtle heartbeat kick
      if (b === 0 || b === 2) renderKick(buf, bTime, 0.35);
      if (b === 1 || b === 3) renderSnare(buf, bTime, 0.18);
      renderHat(buf, bTime + beat * 0.5, 0.12, (b % 2 === 0 ? 0.3 : -0.3));
    }

    // Melodic eerie plucks
    const melody = [c.notes[2] + 12, c.notes[3] + 12, c.notes[1] + 12, c.notes[0] + 24];
    for (let s = 0; s < 4; s++) {
      const mTime = cTime + s * beat + beat * 0.5;
      renderPluck(buf, mTime, 0.5, mtof(melody[s]), 0.14, Math.sin(s + idx) * 0.4);
    }
  });

  buf.applyReverb(0.5, 4800);
  buf.normalizeAndMaster(0.92);
  return buf;
}

// ==========================================
// 3. TRACK_BOSS (Dynamic Epic Archdemon Battle)
// ==========================================
function generateBossTrack() {
  console.log('Generating track_boss.wav...');
  const duration = 28.0; // 137 BPM: 16 bars
  const bpm = 137;
  const beat = 60 / bpm;
  const buf = new SynthAudioBuffer(duration);

  // High intensity combat progression: Em -> C -> Am -> B7
  const chords = [
    { notes: [52, 59, 64, 67], bass: 40 }, // Em
    { notes: [48, 60, 64, 67], bass: 36 }, // C
    { notes: [45, 57, 60, 64], bass: 33 }, // Am
    { notes: [47, 59, 63, 66], bass: 35 }, // B
    { notes: [52, 59, 64, 67], bass: 40 }, // Em
    { notes: [48, 60, 64, 67], bass: 36 }, // C
    { notes: [45, 57, 60, 64], bass: 33 }, // Am
    { notes: [47, 59, 63, 66], bass: 35 }, // B
    { notes: [52, 59, 64, 67], bass: 40 }, // Em
    { notes: [48, 60, 64, 67], bass: 36 }, // C
    { notes: [45, 57, 60, 64], bass: 33 }, // Am
    { notes: [47, 59, 63, 66], bass: 35 }, // B
    { notes: [52, 59, 64, 67], bass: 40 }, // Em
    { notes: [48, 60, 64, 67], bass: 36 }, // C
    { notes: [47, 59, 63, 66], bass: 35 }, // B
    { notes: [52, 59, 64, 67], bass: 40 }, // Em
  ];

  chords.forEach((c, idx) => {
    const cTime = idx * (beat * 4);
    const freqs = c.notes.map(mtof);
    renderPadChord(buf, cTime, beat * 4.1, freqs, 0.22);

    // Fast driving combat percussion & bass
    for (let b = 0; b < 4; b++) {
      const bTime = cTime + b * beat;
      renderKick(buf, bTime, 0.55);
      if (b === 1 || b === 3) renderSnare(buf, bTime, 0.45);
      renderHat(buf, bTime + beat * 0.25, 0.2, 0.25);
      renderHat(buf, bTime + beat * 0.75, 0.2, -0.25);

      // Fast driving 8th note bassline
      renderSubBass(buf, bTime, beat * 0.45, mtof(c.bass), 0.38);
      renderSubBass(buf, bTime + beat * 0.5, beat * 0.45, mtof(c.bass + (b % 2 === 0 ? 0 : 7)), 0.32);
    }

    // Dramatic brass/string stabs
    for (let s = 0; s < 2; s++) {
      const sTime = cTime + (s === 0 ? 0 : beat * 2.5);
      c.notes.forEach((n, nIdx) => {
        renderPluck(buf, sTime, 0.4, mtof(n + 12), 0.25, (nIdx % 2 === 0 ? -0.3 : 0.3));
      });
    }
  });

  buf.applyReverb(0.4, 4000);
  buf.normalizeAndMaster(0.95);
  return buf;
}

// ==========================================
// 4. TRACK_GAMEOVER & TRACK_VICTORY
// ==========================================
function generateGameOver() {
  console.log('Generating track_gameover.wav...');
  const duration = 5.5;
  const buf = new SynthAudioBuffer(duration);
  const notes = [52, 48, 47, 43, 40]; // Em descent

  notes.forEach((note, idx) => {
    const t = idx * 0.9;
    renderPluck(buf, t, 1.8, mtof(note), 0.35, (idx % 2 === 0 ? -0.2 : 0.2));
    renderSubBass(buf, t, 1.5, mtof(note - 12), 0.3);
  });

  buf.applyReverb(0.55, 6000);
  buf.normalizeAndMaster(0.9);
  return buf;
}

function generateVictory() {
  console.log('Generating track_victory.wav...');
  const duration = 6.5;
  const buf = new SynthAudioBuffer(duration);
  // Fanfare in D Major: D -> F# -> A -> D5 -> A -> D5
  const fanfare = [
    { t: 0.0, n: 62 }, // D4
    { t: 0.3, n: 66 }, // F#4
    { t: 0.6, n: 69 }, // A4
    { t: 0.9, n: 74 }, // D5
    { t: 1.5, n: 69 }, // A4
    { t: 1.8, n: 74 }, // D5 (Hold)
  ];

  fanfare.forEach((f) => {
    renderPluck(buf, f.t, 1.8, mtof(f.n), 0.35, 0);
    renderPluck(buf, f.t, 1.8, mtof(f.n + 12), 0.2, 0.2);
  });

  renderPadChord(buf, 1.8, 4.0, [50, 57, 62, 66, 69].map(mtof), 0.28);
  renderSubBass(buf, 1.8, 3.8, mtof(38), 0.4);

  buf.applyReverb(0.45, 5000);
  buf.normalizeAndMaster(0.92);
  return buf;
}

// Generate and write
async function run() {
  const tracks = [
    { name: 'track_menu', gen: generateMenuTrack },
    { name: 'track_dungeon', gen: generateDungeonTrack },
    { name: 'track_boss', gen: generateBossTrack },
    { name: 'track_gameover', gen: generateGameOver },
    { name: 'track_victory', gen: generateVictory },
  ];

  for (const track of tracks) {
    const audioBuf = track.gen();
    const wavBuffer = audioBuf.toWavBuffer();
    const wavPath = path.join(AUDIO_DIR, `${track.name}.wav`);
    const mp3Path = path.join(AUDIO_DIR, `${track.name}.mp3`);

    fs.writeFileSync(wavPath, wavBuffer);
    console.log(`Wrote ${wavPath} (${(wavBuffer.length / 1024).toFixed(1)} KB)`);

    // Encode to high-quality MP3 via ffmpeg
    try {
      execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -b:a 192k "${mp3Path}"`, { stdio: 'ignore' });
      console.log(`Encoded ${mp3Path}`);
      // Remove temporary WAV
      fs.unlinkSync(wavPath);
    } catch (err) {
      console.error(`ffmpeg error on ${track.name}:`, err);
    }
  }

  console.log('All audio tracks generated successfully!');
}

run();
