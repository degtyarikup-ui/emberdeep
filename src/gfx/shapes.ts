// Small helpers for building PixelGrid rows from readable (from, to, char)
// segments instead of hand-counted literal strings — far less error-prone.
export type Seg = [from: number, to: number, ch: string];

export function row(width: number, base: string, segs: Seg[]): string {
  const arr: string[] = new Array(width).fill(base);
  for (const [from, to, ch] of segs) {
    for (let x = Math.max(0, from); x <= Math.min(width - 1, to); x++) arr[x] = ch;
  }
  return arr.join('');
}

// Deterministic pseudo-random generator (stable output — no Math.random noise
// between reloads, and no dependency on the disallowed Date/Math.random paths).
export function prand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
