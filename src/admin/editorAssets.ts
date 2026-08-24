import { asset } from '../gfx/pack';
import { TEXTURE } from '../gfx/registry';
import { EDITOR_TILE } from './mapEditorHelper';

export interface SpriteDefinition {
  url: string;
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  widthTiles?: number;
  heightTiles?: number;
  scale?: number;
}

export const SPRITE_DEFS: Record<string, SpriteDefinition> = {
  // POIs
  spawn: { url: asset('pc-knight-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, widthTiles: 1.0, heightTiles: 1.0 },
  altar: { url: asset('prop_void_obelisk.png'), widthTiles: 1.2, heightTiles: 2.0 },
  exit: { url: asset('stairs.png'), widthTiles: 1.0, heightTiles: 1.0 },
  portal_angel: { url: asset('extra/angel_idle_anim_f0.png'), widthTiles: 1.1, heightTiles: 1.3 },
  portal_ladder: { url: asset('extra/floor_ladder.png'), widthTiles: 1.0, heightTiles: 1.0 },
  portal_hole: { url: asset('extra/hole.png'), widthTiles: 1.0, heightTiles: 1.0 },

  // NPCs & Allies
  npc_knight_m: { url: asset('extra/knight_m_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  npc_knight_f: { url: asset('extra/knight_f_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  npc_wizard_m: { url: asset('extra/wizzard_m_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.1 },
  npc_wizard_f: { url: asset('extra/wizzard_f_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.1 },
  npc_elf_m: { url: asset('extra/elf_m_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  npc_elf_f: { url: asset('extra/elf_f_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  npc_dwarf_m: { url: asset('extra/dwarf_m_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 0.9 },
  npc_dwarf_f: { url: asset('extra/dwarf_f_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 0.9 },
  npc_lizard_m: { url: asset('extra/lizard_m_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  npc_lizard_f: { url: asset('extra/lizard_f_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  npc_doctor: { url: asset('extra/doc_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },

  // Enemies & Bosses
  wolf: { url: asset('pc-wolf-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, widthTiles: 1.0, heightTiles: 1.0 },
  direwolf: { url: asset('direwolf-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, widthTiles: 1.1, heightTiles: 1.1 },
  skeleton: { url: asset('pc-skeleton-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, widthTiles: 1.0, heightTiles: 1.0 },
  imp: { url: asset('pc-orc-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, widthTiles: 1.0, heightTiles: 1.0 },
  orc_grunt: { url: asset('orc-grunt-idle.png'), sx: 0, sy: 0, sw: 24, sh: 26, widthTiles: 1.0, heightTiles: 1.0 },
  orc_shield: { url: asset('orc_warrior_idle_anim_f0.png'), sx: 0, sy: 0, sw: 24, sh: 26, widthTiles: 1.0, heightTiles: 1.0 },
  orc_archer: { url: asset('masked_orc_idle_anim_f0.png'), sx: 0, sy: 0, sw: 24, sh: 26, widthTiles: 1.0, heightTiles: 1.0 },
  orc_shaman: { url: asset('extra/orc_shaman_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.1 },
  bandit_assassin: { url: asset('ranger-idle.png'), sx: 0, sy: 0, sw: 32, sh: 32, widthTiles: 1.0, heightTiles: 1.0 },
  boss_demon: { url: asset('extra/big_demon_idle_anim_f0.png'), widthTiles: 1.6, heightTiles: 1.8 },
  boss_ogre: { url: asset('extra/ogre_idle_anim_f0.png'), widthTiles: 1.6, heightTiles: 1.8 },
  necromancer: { url: asset('extra/necromancer_anim_f0.png'), widthTiles: 1.1, heightTiles: 1.2 },
  big_zombie: { url: asset('extra/big_zombie_idle_anim_f0.png'), widthTiles: 1.4, heightTiles: 1.5 },
  tiny_zombie: { url: asset('extra/tiny_zombie_idle_anim_f0.png'), widthTiles: 0.8, heightTiles: 0.8 },
  ice_zombie: { url: asset('extra/ice_zombie_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  chort: { url: asset('extra/chort_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  goblin: { url: asset('extra/goblin_idle_anim_f0.png'), widthTiles: 0.9, heightTiles: 0.9 },
  pumpkin_dude: { url: asset('extra/pumpkin_dude_idle_anim_f0.png'), widthTiles: 1.1, heightTiles: 1.1 },
  wogol: { url: asset('extra/wogol_idle_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  muddy: { url: asset('extra/muddy_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  swampy: { url: asset('extra/swampy_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  slug: { url: asset('extra/slug_anim_f0.png'), widthTiles: 1.0, heightTiles: 0.8 },
  tiny_slug: { url: asset('extra/tiny_slug_anim_f0.png'), widthTiles: 0.7, heightTiles: 0.6 },

  // Pickups & Interactive
  chest: { url: asset('chest_full_open_anim_f0.png'), widthTiles: 0.9, heightTiles: 0.9 },
  chest_empty: { url: asset('extra/chest_empty_open_anim_f0.png'), widthTiles: 0.9, heightTiles: 0.9 },
  chest_mimic: { url: asset('extra/chest_mimic_open_anim_f0.png'), widthTiles: 0.9, heightTiles: 0.9 },
  shrine_blood: { url: asset('wall_fountain_mid_red_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.6 },
  shrine_chance: { url: asset('wall_fountain_mid_blue_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.6 },
  fountain_basin_blue: { url: asset('extra/wall_fountain_basin_blue_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  fountain_basin_red: { url: asset('extra/wall_fountain_basin_red_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  flask_red: { url: asset('prop_flask_red.png'), widthTiles: 0.7, heightTiles: 0.7 },
  flask_yellow: { url: asset('dungeon-pack.png'), sx: 336, sy: 336, sw: 16, sh: 16, widthTiles: 0.7, heightTiles: 0.7 },
  flask_blue: { url: asset('prop_flask_blue.png'), widthTiles: 0.7, heightTiles: 0.7 },
  flask_green: { url: asset('extra/flask_green.png'), widthTiles: 0.7, heightTiles: 0.7 },
  flask_big_red: { url: asset('extra/flask_big_red.png'), widthTiles: 0.9, heightTiles: 0.9 },
  flask_big_blue: { url: asset('extra/flask_big_blue.png'), widthTiles: 0.9, heightTiles: 0.9 },
  flask_big_green: { url: asset('extra/flask_big_green.png'), widthTiles: 0.9, heightTiles: 0.9 },
  flask_big_yellow: { url: asset('extra/flask_big_yellow.png'), widthTiles: 0.9, heightTiles: 0.9 },
  coin_gold: { url: asset('extra/coin_anim_f0.png'), widthTiles: 0.6, heightTiles: 0.6 },
  bomb: { url: asset('extra/bomb_f0.png'), widthTiles: 0.8, heightTiles: 0.8 },

  // Props & Dungeon Obstacles
  torch: { url: asset('torch-sheet.png'), sx: 0, sy: 0, sw: 16, sh: 16, widthTiles: 0.7, heightTiles: 0.7 },
  bonfire: { url: asset('bonfire-sheet.png'), sx: 0, sy: 0, sw: 32, sh: 32, widthTiles: 1.2, heightTiles: 1.2 },
  spikes: { url: asset('floor_spikes_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  barrel: { url: asset('prop_barrel.png'), widthTiles: 0.8, heightTiles: 1.0 },
  crate: { url: asset('prop_crate.png'), widthTiles: 0.8, heightTiles: 1.0 },
  fence: { url: asset('prop_fence.png'), widthTiles: 1.0, heightTiles: 1.0 },
  rock: { url: asset('prop_rock.png'), widthTiles: 1.0, heightTiles: 0.9 },
  rock_large: { url: asset('prop_rock_large.png'), widthTiles: 1.5, heightTiles: 1.3 },
  bush: { url: asset('prop_bush.png'), widthTiles: 1.0, heightTiles: 0.9 },
  reeds: { url: asset('prop_reeds.png'), widthTiles: 0.9, heightTiles: 1.0 },
  cabin: { url: asset('prop_cabin.png'), widthTiles: 3.0, heightTiles: 2.5 },
  statue: { url: asset('prop_statue.png'), widthTiles: 1.2, heightTiles: 2.0 },
  workbench: { url: asset('prop_workbench.png'), widthTiles: 1.2, heightTiles: 1.1 },
  tombstone: { url: asset('prop_tombstone.png'), widthTiles: 0.8, heightTiles: 1.0 },
  obelisk: { url: asset('prop_void_obelisk.png'), widthTiles: 1.2, heightTiles: 2.0 },
  minecart: { url: asset('prop_minecart.png'), widthTiles: 1.0, heightTiles: 0.9 },
  mushroom: { url: asset('prop_mushroom_giant.png'), widthTiles: 1.0, heightTiles: 1.0 },
  column: { url: asset('extra/column.png'), widthTiles: 1.0, heightTiles: 1.5 },
  column_wall: { url: asset('extra/column_wall.png'), widthTiles: 1.0, heightTiles: 1.5 },
  door_closed: { url: asset('extra/doors_leaf_closed.png'), widthTiles: 1.0, heightTiles: 1.2 },
  door_open: { url: asset('extra/doors_leaf_open.png'), widthTiles: 1.0, heightTiles: 1.2 },
  button_blue: { url: asset('extra/button_blue_up.png'), widthTiles: 0.8, heightTiles: 0.8 },
  button_red: { url: asset('extra/button_red_up.png'), widthTiles: 0.8, heightTiles: 0.8 },
  lever_left: { url: asset('extra/lever_left.png'), widthTiles: 0.7, heightTiles: 0.8 },
  lever_right: { url: asset('extra/lever_right.png'), widthTiles: 0.7, heightTiles: 0.8 },
  banner_blue: { url: asset('extra/wall_banner_blue.png'), widthTiles: 0.8, heightTiles: 1.2 },
  banner_red: { url: asset('extra/wall_banner_red.png'), widthTiles: 0.8, heightTiles: 1.2 },
  banner_green: { url: asset('extra/wall_banner_green.png'), widthTiles: 0.8, heightTiles: 1.2 },
  banner_yellow: { url: asset('extra/wall_banner_yellow.png'), widthTiles: 0.8, heightTiles: 1.2 },
  wall_goo: { url: asset('extra/wall_goo.png'), widthTiles: 1.0, heightTiles: 1.0 },
  wall_hole: { url: asset('extra/wall_hole_1.png'), widthTiles: 1.0, heightTiles: 1.0 },
  skull_prop: { url: asset('extra/skull.png'), widthTiles: 0.7, heightTiles: 0.7 },
  prison_bars: { url: asset('prop_prison_bars.png'), widthTiles: 1.0, heightTiles: 1.0 },
  chains: { url: asset('prop_chains.png'), widthTiles: 0.8, heightTiles: 1.2 },
  blood_spill: { url: asset('prop_blood_spill.png'), widthTiles: 1.0, heightTiles: 0.8 },
  mine_shaft: { url: asset('prop_mine_shaft.png'), widthTiles: 1.5, heightTiles: 1.5 },
  lupine: { url: asset('prop_lupine.png'), widthTiles: 0.8, heightTiles: 0.9 },
  ice_crystal: { url: asset('prop_ice_crystal.png'), widthTiles: 1.0, heightTiles: 1.2 },

  // Trees (Origin bottom-center)
  tree_pine: { url: asset('tree_pine.png'), widthTiles: 2.0, heightTiles: 3.0 },
  tree_oak: { url: asset('tree_oak.png'), widthTiles: 2.0, heightTiles: 2.5 },

  // TEXTURE Key Aliases
  [TEXTURE.TREE_PINE]: { url: asset('tree_pine.png'), widthTiles: 2.0, heightTiles: 3.0 },
  [TEXTURE.TREE_OAK]: { url: asset('tree_oak.png'), widthTiles: 2.0, heightTiles: 2.5 },
  [TEXTURE.PROP_ROCK]: { url: asset('prop_rock.png'), widthTiles: 1.0, heightTiles: 0.9 },
  [TEXTURE.PROP_ROCK_LARGE]: { url: asset('prop_rock_large.png'), widthTiles: 1.5, heightTiles: 1.3 },
  [TEXTURE.PROP_BUSH]: { url: asset('prop_bush.png'), widthTiles: 1.0, heightTiles: 0.9 },
  [TEXTURE.PROP_CRATE]: { url: asset('prop_crate.png'), widthTiles: 0.8, heightTiles: 1.0 },
  [TEXTURE.PROP_BARREL]: { url: asset('prop_barrel.png'), widthTiles: 0.8, heightTiles: 1.0 },
  [TEXTURE.PROP_REEDS]: { url: asset('prop_reeds.png'), widthTiles: 0.9, heightTiles: 1.0 },
  [TEXTURE.PROP_STATUE]: { url: asset('prop_statue.png'), widthTiles: 1.2, heightTiles: 2.0 },
  [TEXTURE.PROP_CABIN]: { url: asset('prop_cabin.png'), widthTiles: 3.0, heightTiles: 2.5 },
  [TEXTURE.PROP_FENCE]: { url: asset('prop_fence.png'), widthTiles: 1.0, heightTiles: 1.0 },
  [TEXTURE.PROP_WORKBENCH]: { url: asset('prop_workbench.png'), widthTiles: 1.2, heightTiles: 1.1 },
  [TEXTURE.PROP_PRISON_BARS]: { url: asset('prop_prison_bars.png'), widthTiles: 1.0, heightTiles: 1.0 },
  [TEXTURE.PROP_CHAINS]: { url: asset('prop_chains.png'), widthTiles: 0.8, heightTiles: 1.2 },
  [TEXTURE.PROP_BLOOD_SPILL]: { url: asset('prop_blood_spill.png'), widthTiles: 1.0, heightTiles: 0.8 },
  [TEXTURE.PROP_MINE_SHAFT]: { url: asset('prop_mine_shaft.png'), widthTiles: 1.5, heightTiles: 1.5 },
  [TEXTURE.PROP_MINECART]: { url: asset('prop_minecart.png'), widthTiles: 1.0, heightTiles: 0.9 },
  [TEXTURE.PROP_LUPINE]: { url: asset('prop_lupine.png'), widthTiles: 0.8, heightTiles: 0.9 },
  [TEXTURE.PROP_MUSHROOM_GIANT]: { url: asset('prop_mushroom_giant.png'), widthTiles: 1.0, heightTiles: 1.0 },
  [TEXTURE.PROP_ICE_CRYSTAL]: { url: asset('prop_ice_crystal.png'), widthTiles: 1.0, heightTiles: 1.2 },
  [TEXTURE.PROP_VOID_OBELISK]: { url: asset('prop_void_obelisk.png'), widthTiles: 1.2, heightTiles: 2.0 },
  [TEXTURE.PROP_SPIKES]: { url: asset('floor_spikes_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.0 },
  [TEXTURE.TORCH]: { url: asset('torch-sheet.png'), sx: 0, sy: 0, sw: 16, sh: 16, widthTiles: 0.7, heightTiles: 0.7 },
  [TEXTURE.BONFIRE]: { url: asset('bonfire-sheet.png'), sx: 0, sy: 0, sw: 32, sh: 32, widthTiles: 1.2, heightTiles: 1.2 },
  [TEXTURE.FOUNTAIN_BLUE]: { url: asset('wall_fountain_mid_blue_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.6 },
  [TEXTURE.FOUNTAIN_RED]: { url: asset('wall_fountain_mid_red_anim_f0.png'), widthTiles: 1.0, heightTiles: 1.6 },
};

class EditorAssetManager {
  private images: Map<string, HTMLImageElement> = new Map();
  private loaded = false;
  private previewCache: Map<string, string> = new Map();

  public preloadAll(onComplete?: () => void): void {
    const urls = new Set<string>();
    Object.values(SPRITE_DEFS).forEach((def) => urls.add(def.url));
    urls.add(asset('tiles-biome.png'));

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

  public isReady(): boolean {
    return this.loaded;
  }

  public getPreviewUrl(id: string): string | undefined {
    return this.previewCache.get(id);
  }

  public getTilePreviewUrl(tileType: number, biomeId = 'forest'): string | undefined {
    const key = `tile_${tileType}_${biomeId}`;
    if (this.previewCache.has(key)) return this.previewCache.get(key);

    const tilesBiomeImg = this.images.get(asset('tiles-biome.png'));
    if (!tilesBiomeImg || !tilesBiomeImg.complete) return undefined;

    let tileIndex = tileType;
    if (tileType <= 12) {
      if (tileType === EDITOR_TILE.FLOOR) {
        tileIndex = biomeId === 'catacombs' || biomeId === 'depths' ? 6 : biomeId === 'ruins' ? 5 : 0;
      } else if (tileType === EDITOR_TILE.WALL) {
        tileIndex = biomeId === 'forest' ? 64 : biomeId === 'ruins' ? 13 : 12;
      } else if (tileType === EDITOR_TILE.PATH) {
        tileIndex = 3;
      } else if (tileType === EDITOR_TILE.RUIN_FLOOR) {
        tileIndex = 5;
      } else if (tileType === EDITOR_TILE.WATER_DEEP) {
        tileIndex = 19;
      } else if (tileType === EDITOR_TILE.BRIDGE) {
        tileIndex = 21;
      } else if (tileType === EDITOR_TILE.SNOW) {
        tileIndex = 14;
      } else if (tileType === EDITOR_TILE.ICE) {
        tileIndex = 19;
      } else if (tileType === EDITOR_TILE.CANYON_DIRT) {
        tileIndex = 10;
      } else if (tileType === EDITOR_TILE.RAIL) {
        tileIndex = 23;
      } else if (tileType === EDITOR_TILE.GRATE) {
        tileIndex = 22;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.imageSmoothingEnabled = false;
    const sx = tileIndex * 32;
    if (sx + 32 <= tilesBiomeImg.naturalWidth) {
      ctx.drawImage(tilesBiomeImg, sx, 0, 32, 32, 0, 0, 32, 32);
      const url = canvas.toDataURL();
      this.previewCache.set(key, url);
      return url;
    }
    return undefined;
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
    bottomY: number,
    tileSize: number
  ): boolean {
    const def = SPRITE_DEFS[spriteId];
    if (!def) return false;

    const img = this.images.get(def.url);
    if (!img || !img.complete || img.naturalWidth === 0) return false;

    const sx = def.sx ?? 0;
    const sy = def.sy ?? 0;
    const sw = def.sw ?? img.naturalWidth;
    const sh = def.sh ?? img.naturalHeight;

    const widthTiles = def.widthTiles ?? 1.0;
    const heightTiles = def.heightTiles ?? 1.0;

    const dw = widthTiles * tileSize;
    const dh = heightTiles * tileSize;

    const dx = centerX - dw / 2;
    const dy = bottomY - dh;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return true;
  }

  public drawTile(
    ctx: CanvasRenderingContext2D,
    tileVal: number,
    x: number,
    y: number,
    size: number,
    biomeId = 'forest'
  ): void {
    const tilesBiomeImg = this.images.get(asset('tiles-biome.png'));

    if (tilesBiomeImg && tilesBiomeImg.complete && tilesBiomeImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;

      let tileIndex = tileVal;

      // If tileVal is in semantic 0..12 space rather than finalized autotile index
      if (tileVal <= 12) {
        if (tileVal === EDITOR_TILE.FLOOR) {
          tileIndex = biomeId === 'catacombs' || biomeId === 'depths' ? 6 : biomeId === 'ruins' ? 5 : 0;
        } else if (tileVal === EDITOR_TILE.WALL) {
          tileIndex = biomeId === 'forest' ? 64 : biomeId === 'ruins' ? 13 : 12;
        } else if (tileVal === EDITOR_TILE.PATH) {
          tileIndex = 3;
        } else if (tileVal === EDITOR_TILE.RUIN_FLOOR) {
          tileIndex = 5;
        } else if (tileVal === EDITOR_TILE.WATER_DEEP) {
          tileIndex = 19;
        } else if (tileVal === EDITOR_TILE.BRIDGE) {
          tileIndex = 21;
        } else if (tileVal === EDITOR_TILE.SNOW) {
          tileIndex = 14;
        } else if (tileVal === EDITOR_TILE.ICE) {
          tileIndex = 19;
        } else if (tileVal === EDITOR_TILE.CANYON_DIRT) {
          tileIndex = 10;
        } else if (tileVal === EDITOR_TILE.RAIL) {
          tileIndex = 23;
        } else if (tileVal === EDITOR_TILE.GRATE) {
          tileIndex = 22;
        }
      }

      // Draw 32x32 tile from tiles-biome.png
      const sx = tileIndex * 32;
      if (sx + 32 <= tilesBiomeImg.naturalWidth) {
        ctx.drawImage(tilesBiomeImg, sx, 0, 32, 32, x, y, size, size);
        return;
      }
    }

    // Fallback tint
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
    ctx.fillStyle = colorMap[tileVal] || '#14532d';
    ctx.fillRect(x, y, size, size);
  }
}

export const editorAssets = new EditorAssetManager();
