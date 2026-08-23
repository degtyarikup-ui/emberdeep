import Phaser from 'phaser';

export const HUD_ICON = {
  HEART_FULL: 'heart_full',
  HEART_HALF: 'heart_half',
  HEART_EMPTY: 'heart_empty',
} as const;

// Pixel-perfect dark-fantasy ruby heart sprites without any white outline.
const FULL_HEART_MATRIX = [
  '__DDD___DDD__',
  '_DRRRD_DRRRD_',
  'DHRRRRDDRRRRD',
  'DHRRRRRRRRRRD',
  'DHRRRRRRRRRSD',
  '_DRRRRRRRRSD_',
  '__DRRRRRRSD__',
  '___DRRRRSD___',
  '____DRRSD____',
  '_____DSD_____',
  '______D______',
  '_____________',
];

const HALF_HEART_MATRIX = [
  '__DDD___DDD__',
  '_DRRRD_DEEED_',
  'DHRRRRDDEEEED',
  'DHRRRRDEEEEED',
  'DHRRRRDEEEEeD',
  '_DRRRRDEEEeD_',
  '__DRRRDEEeD__',
  '___DRRDEeD___',
  '____DRDeD____',
  '_____DDe_____',
  '______D______',
  '_____________',
];

const EMPTY_HEART_MATRIX = [
  '__DDD___DDD__',
  '_DEEED_DEEED_',
  'DEEEEDDDEEEED',
  'DEEEEEEEEEEED',
  'DEEEEEEEEEEeD',
  '_DEEEEEEEEeD_',
  '__DEEEEEEEe__',
  '___DEEEEEe___',
  '____DEEEe____',
  '_____DEe_____',
  '______D______',
  '_____________',
];

const COLOR_MAP: Record<string, string> = {
  D: '#1a0408', // Dark gothic crimson outline (no white border!)
  R: '#e11d48', // Vibrant ruby red fill
  H: '#f43f5e', // Warm ruby highlight (no white glare!)
  S: '#9f1239', // Deep crimson shadow
  E: 'rgba(28, 6, 12, 0.85)', // Dark empty cavity fill
  e: '#140306', // Empty cavity shadow border
};

export function buildHudAtlas(scene: Phaser.Scene, outKey: string): void {
  if (scene.textures.exists(outKey)) return;

  const w = 13;
  const h = 12;
  const canvas = document.createElement('canvas');
  canvas.width = w * 3;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const matrices = [FULL_HEART_MATRIX, HALF_HEART_MATRIX, EMPTY_HEART_MATRIX];
  matrices.forEach((mat, idx) => {
    const ox = idx * w;
    for (let y = 0; y < mat.length; y++) {
      const line = mat[y];
      for (let x = 0; x < line.length; x++) {
        const ch = line[x];
        const color = COLOR_MAP[ch];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(ox + x, y, 1, 1);
        }
      }
    }
  });

  const texture = scene.textures.addCanvas(outKey, canvas)!;
  const order = [HUD_ICON.HEART_FULL, HUD_ICON.HEART_HALF, HUD_ICON.HEART_EMPTY];
  order.forEach((name, i) => {
    texture.add(name, 0, i * w, 0, w, h);
    texture.add(i, 0, i * w, 0, w, h);
  });
}
