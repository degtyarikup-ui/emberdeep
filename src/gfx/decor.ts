import { Legend, PixelGrid } from './PixelArtFactory';
import { row } from './shapes';

const W = 16;
const H = 16;

export const TORCH_LEGEND: Legend = {
  w: 'metalDark',
  x: 'metal',
  y: 'metalLight',
  r: 'emberDeep',
  s: 'emberMid',
  t: 'emberBright',
  u: 'emberCore',
  v: 'emberWhite',
};

function blank(): string[][] {
  return Array.from({ length: H }, () => row(W, '.', []).split(''));
}

// Wall bracket holding a flickering flame. `variant` (0-3) drives the wobble
// so the four frames read as one flame animating, not four unrelated shapes.
function makeTorchFrame(variant: number): PixelGrid {
  const g = blank();
  const bx = 7;

  // bracket
  g[13][bx] = 'w';
  g[13][bx + 1] = 'w';
  g[12][bx] = 'x';
  g[12][bx + 1] = 'x';
  g[11][bx] = 'y';
  g[11][bx + 1] = 'y';
  g[14][bx - 1] = 'w';
  g[14][bx + 2] = 'w';

  const wobble = [0, 1, 0, -1][variant % 4];
  const lift = [0, 1, 2, 1][variant % 4];
  const flameTop = 3 - lift;

  for (let y = flameTop; y <= 11; y++) {
    const t = (y - flameTop) / (11 - flameTop); // 0 tip .. 1 base
    const halfw = Math.max(0, Math.round(t * 2.4));
    const cx = bx + (y < flameTop + 4 ? wobble : Math.round(wobble * 0.4));
    for (let x = cx - halfw; x <= cx + halfw; x++) {
      if (x < 0 || x >= W) continue;
      g[y][x] = t > 0.65 ? 's' : t > 0.3 ? 't' : 'u';
    }
    if (halfw >= 1) g[y][cx] = t > 0.5 ? 't' : 'v';
  }

  return g.map((r) => r.join(''));
}

export function buildTorchFrames(): PixelGrid[] {
  return [makeTorchFrame(0), makeTorchFrame(1), makeTorchFrame(2), makeTorchFrame(3)];
}
