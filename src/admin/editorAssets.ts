import { asset } from '../gfx/pack';
import { EDITOR_TILE, type EditorTileType } from './mapEditorHelper';

export interface SpriteDefinition {
  url: string;
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  drawW?: number;
  drawH?: number;
  offsetY?: number;
}

export const SPRITE_DEFS: Record<string, SpriteDefinition> = {
  // POIs
  spawn: { url: asset('pc-knight-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, drawW: 32, drawH: 32, offsetY: -4 },
  altar: { url: asset('prop_void_obelisk.png'), sw: 32, sh: 64, drawW: 28, drawH: 48, offsetY: -16 },
  exit: { url: asset('stairs.png'), sw: 32, sh: 32, drawW: 28, drawH: 28 },

  // Enemies
  wolf: { url: asset('pc-wolf-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, drawW: 28, drawH: 28 },
  direwolf: { url: asset('direwolf-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, drawW: 30, drawH: 30 },
  skeleton: { url: asset('pc-skeleton-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, drawW: 28, drawH: 28, offsetY: -2 },
  imp: { url: asset('pc-orc-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, drawW: 28, drawH: 28, offsetY: -2 },
  orc_grunt: { url: asset('orc-grunt-idle.png'), sx: 0, sy: 0, sw: 24, sh: 26, drawW: 26, drawH: 28, offsetY: -2 },
  orc_shield: { url: asset('orc-warrior-idle.png'), sx: 0, sy: 0, sw: 24, sh: 26, drawW: 26, drawH: 28, offsetY: -2 },
  orc_archer: { url: asset('masked-orc-idle.png'), sx: 0, sy: 0, sw: 24, sh: 26, drawW: 26, drawH: 28, offsetY: -2 },
  bandit_assassin: { url: asset('ranger-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, drawW: 28, drawH: 28, offsetY: -2 },

  // Pickups
  chest: { url: asset('chest_full_open_anim_f0.png'), sw: 16, sh: 16, drawW: 22, drawH: 22 },
  shrine_blood: { url: asset('wall_fountain_mid_red_anim_f0.png'), sw: 16, sh: 32, drawW: 20, drawH: 32, offsetY: -8 },
  shrine_chance: { url: asset('wall_fountain_mid_blue_anim_f0.png'), sw: 16, sh: 32, drawW: 20, drawH: 32, offsetY: -8 },
  flask_red: { url: asset('prop_flask_red.png'), sw: 16, sh: 16, drawW: 18, drawH: 18 },
  flask_yellow: { url: asset('dungeon-pack.png'), sx: 336, sy: 336, sw: 16, sh: 16, drawW: 18, drawH: 18 },
  flask_blue: { url: asset('prop_flask_blue.png'), sw: 16, sh: 16, drawW: 18, drawH: 18 },

  // Props & Hazards
  torch: { url: asset('torch-sheet.png'), sx: 0, sy: 0, sw: 16, sh: 16, drawW: 18, drawH: 18 },
  bonfire: { url: asset('bonfire-sheet.png'), sx: 0, sy: 0, sw: 48, sh: 48, drawW: 32, drawH: 32, offsetY: -6 },
  spikes: { url: asset('floor_spikes_anim_f3.png'), sw: 16, sh: 16, drawW: 22, drawH: 22 },
  barrel: { url: asset('prop_barrel.png'), sw: 16, sh: 22, drawW: 20, drawH: 24, offsetY: -4 },
  crate: { url: asset('prop_crate.png'), sw: 16, sh: 24, drawW: 22, drawH: 24, offsetY: -4 },
  fence: { url: asset('prop_fence.png'), sw: 16, sh: 16, drawW: 24, drawH: 20 },
  rock: { url: asset('prop_rock.png'), sw: 16, sh: 16, drawW: 22, drawH: 20 },
  tombstone: { url: asset('prop_tombstone.png'), sw: 16, sh: 22, drawW: 20, drawH: 24, offsetY: -4 },
  obelisk: { url: asset('prop_void_obelisk.png'), sw: 32, sh: 64, drawW: 24, drawH: 42, offsetY: -12 },
  minecart: { url: asset('prop_minecart.png'), sw: 16, sh: 16, drawW: 24, drawH: 20 },
  mushroom: { url: asset('prop_mushroom_giant.png'), sw: 16, sh: 16, drawW: 22, drawH: 22, offsetY: -2 },

  // Trees
  tree_pine: { url: asset('tree_pine.png'), sw: 64, sh: 96, drawW: 44, drawH: 64, offsetY: -32 },
  tree_oak: { url: asset('tree_oak.png'), sw: 64, sh: 80, drawW: 44, drawH: 56, offsetY: -26 },
};

class EditorAssetManager {
  private images: Map<string, HTMLImageElement> = new Map();
  private loaded = false;
  private previewCache: Map<string, string> = new Map();

  public preloadAll(onComplete?: () => void): void {
    const urls = new Set<string>();
    Object.values(SPRITE_DEFS).forEach((def) => urls.add(def.url));
    urls.add(asset('pc-dungeon-tiles.png'));

    let loadedCount = 0;
    const total = urls.size;

    urls.forEach((url) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        this.images.set(url, img);
        loadedCount++;
        if (loadedCount === total) {
          this.loaded = true;
          this.generatePreviews();
          onComplete?.();
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === total) {
          this.loaded = true;
          this.generatePreviews();
          onComplete?.();
        }
      };
    });
  }

  public getImage(url: string): HTMLImageElement | undefined {
    return this.images.get(url);
  }

  public isReady(): boolean {
    return this.loaded;
  }

  public getPreviewUrl(id: string): string | undefined {
    return this.previewCache.get(id);
  }

  private generatePreviews(): void {
    Object.entries(SPRITE_DEFS).forEach(([id, def]) => {
      const img = this.images.get(def.url);
      if (!img) return;

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      const sx = def.sx ?? 0;
      const sy = def.sy ?? 0;
      const sw = def.sw ?? img.naturalWidth;
      const sh = def.sh ?? img.naturalHeight;

      // Scale to fit inside 30x30 with aspect ratio preserved
      const scale = Math.min(28 / sw, 28 / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      const dx = (32 - dw) / 2;
      const dy = (32 - dh) / 2;

      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      this.previewCache.set(id, canvas.toDataURL());
    });
  }

  public drawSprite(
    ctx: CanvasRenderingContext2D,
    spriteId: string,
    centerX: number,
    centerY: number,
    tileSize: number
  ): boolean {
    const def = SPRITE_DEFS[spriteId];
    if (!def) return false;

    const img = this.images.get(def.url);
    if (!img) return false;

    const sx = def.sx ?? 0;
    const sy = def.sy ?? 0;
    const sw = def.sw ?? img.naturalWidth;
    const sh = def.sh ?? img.naturalHeight;

    const scale = (tileSize / 24) * 0.9;
    const dw = (def.drawW ?? sw) * scale;
    const dh = (def.drawH ?? sh) * scale;
    const dyOffset = (def.offsetY ?? 0) * scale;

    const dx = centerX - dw / 2;
    const dy = centerY - dh / 2 + dyOffset;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return true;
  }

  public drawTile(
    ctx: CanvasRenderingContext2D,
    tileType: EditorTileType,
    x: number,
    y: number,
    size: number,
    biomeId = 'forest'
  ): void {
    const tilesImg = this.images.get(asset('pc-dungeon-tiles.png'));

    if (tilesImg && tilesImg.complete && tilesImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      let sx = biomeId === 'catacombs' || biomeId === 'depths' ? 32 : 16;
      let sy = biomeId === 'catacombs' || biomeId === 'depths' ? 48 : 16;

      if (tileType === EDITOR_TILE.WALL) {
        sx = biomeId === 'catacombs' || biomeId === 'depths' ? 48 : 0;
        sy = 0;
      } else if (tileType === EDITOR_TILE.PATH) {
        sx = 48;
        sy = 64;
      } else if (tileType === EDITOR_TILE.RUIN_FLOOR) {
        sx = 16;
        sy = 48;
      } else if (tileType === EDITOR_TILE.WATER_DEEP) {
        sx = 80;
        sy = 80;
      } else if (tileType === EDITOR_TILE.BRIDGE) {
        sx = 96;
        sy = 96;
      } else if (tileType === EDITOR_TILE.SNOW) {
        sx = 16;
        sy = 128;
      } else if (tileType === EDITOR_TILE.ICE) {
        sx = 48;
        sy = 128;
      } else if (tileType === EDITOR_TILE.CANYON_DIRT) {
        sx = 32;
        sy = 64;
      } else if (tileType === EDITOR_TILE.RAIL) {
        sx = 112;
        sy = 112;
      } else if (tileType === EDITOR_TILE.GRATE) {
        sx = 64;
        sy = 48;
      }

      ctx.drawImage(tilesImg, sx, sy, 16, 16, x, y, size, size);
    } else {
      // Fallback procedural tint
      const colorMap: Record<number, string> = {
        [EDITOR_TILE.FLOOR]: biomeId === 'catacombs' ? '#1f2937' : '#14532d',
        [EDITOR_TILE.WALL]: '#1e293b',
        [EDITOR_TILE.PATH]: '#78350f',
        [EDITOR_TILE.RUIN_FLOOR]: '#334155',
        [EDITOR_TILE.WATER_DEEP]: '#1e3a8a',
        [EDITOR_TILE.BRIDGE]: '#854d0e',
        [EDITOR_TILE.SNOW]: '#94a3b8',
        [EDITOR_TILE.ICE]: '#38bdf8',
        [EDITOR_TILE.CANYON_DIRT]: '#57534e',
        [EDITOR_TILE.RAIL]: '#52525b',
        [EDITOR_TILE.GRATE]: '#27272a',
      };
      ctx.fillStyle = colorMap[tileType] || '#14532d';
      ctx.fillRect(x, y, size, size);
    }
  }
}

export const editorAssets = new EditorAssetManager();
