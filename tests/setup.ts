/**
 * Phaser probes canvas capabilities at import time (CanvasFeatures), and jsdom
 * ships no 2D context. Several modules under test pull Phaser in transitively
 * — world/level1 → gfx/tiles → phaser — so importing them would throw.
 *
 * A stub is used rather than the `canvas` npm package on purpose: that package
 * needs native build tooling, which would make CI fragile for a handful of
 * feature probes whose answers we do not care about. Nothing here is a
 * rendering test; anything that truly needs pixels belongs in the browser.
 */
const stubContext2D = () =>
  ({
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false,
    canvas: { width: 1, height: 1 },
    fillRect: () => undefined,
    clearRect: () => undefined,
    strokeRect: () => undefined,
    drawImage: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    scale: () => undefined,
    rotate: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    arc: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    measureText: () => ({ width: 0 }),
    fillText: () => undefined,
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    // Opaque black: Phaser's inverse-alpha probe reads this back and only
    // needs well-formed data, not any particular value.
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4).fill(255),
      width: w,
      height: h,
    }),
    putImageData: () => undefined,
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4),
      width: w,
      height: h,
    }),
  }) as unknown as CanvasRenderingContext2D;

HTMLCanvasElement.prototype.getContext = function getContext(kind: string) {
  // Phaser falls back to Canvas when WebGL is absent, which is what we want.
  return kind === '2d' ? stubContext2D() : null;
} as HTMLCanvasElement['getContext'];

HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
