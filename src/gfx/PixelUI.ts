import Phaser from 'phaser';

export const PIXEL_UI_TEXTURE = {
  PANEL_STONE: 'tex-pixel-panel-stone',
  PANEL_HEADER: 'tex-pixel-panel-header',
  SLOT_INSET: 'tex-pixel-slot-inset',
  SLOT_GLOW_COMMON: 'tex-pixel-slot-common',
  SLOT_GLOW_UNCOMMON: 'tex-pixel-slot-uncommon',
  SLOT_GLOW_RARE: 'tex-pixel-slot-rare',
  SLOT_GLOW_LEGENDARY: 'tex-pixel-slot-legendary',
  BAR_FRAME: 'tex-pixel-bar-frame',
  BAR_FILL_HP: 'tex-pixel-bar-hp',
  BAR_FILL_GHOST: 'tex-pixel-bar-ghost',
  BUTTON_PIXEL: 'tex-pixel-button',
  ICONS_SHEET: 'tex-pixel-icons-sheet',
} as const;

export class PixelUI {
  public static buildTextures(scene: Phaser.Scene): void {
    PixelUI.buildPanelStone(scene);
    PixelUI.buildPanelHeader(scene);
    PixelUI.buildSlotTextures(scene);
    PixelUI.buildBarTextures(scene);
    PixelUI.buildButtonTexture(scene);
    PixelUI.buildIconsSheet(scene);
  }

  /**
   * 32x32 9-slice Dark Slate Stone Panel with 3D metallic bevels and corner bolts.
   */
  private static buildPanelStone(scene: Phaser.Scene): void {
    if (scene.textures.exists(PIXEL_UI_TEXTURE.PANEL_STONE)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // 1. Dark Shadow Base
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, 32, 32);

    // 2. Outer Iron Bevel
    // Top & Left Highlight
    ctx.fillStyle = '#475569';
    ctx.fillRect(1, 1, 30, 1);
    ctx.fillRect(1, 1, 1, 30);
    // Bottom & Right Shadow
    ctx.fillStyle = '#090d16';
    ctx.fillRect(1, 30, 30, 1);
    ctx.fillRect(30, 1, 1, 30);

    // 3. Second Brass / Gold Inset Rim
    ctx.fillStyle = '#7a4a15';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillStyle = '#9a7020';
    ctx.fillRect(2, 2, 28, 1);
    ctx.fillRect(2, 2, 1, 28);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 29, 28, 1);
    ctx.fillRect(29, 2, 1, 28);

    // 4. Main Deep Slate Interior
    ctx.fillStyle = '#080c18';
    ctx.fillRect(4, 4, 24, 24);

    // Inner subtle texture
    ctx.fillStyle = '#141c2a';
    ctx.fillRect(5, 5, 22, 22);
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(6, 6, 20, 20);

    // 5. Corner Metallic Rivets/Bolts
    const bolts = [
      [3, 3],
      [27, 3],
      [3, 27],
      [27, 27],
    ];
    bolts.forEach(([bx, by]) => {
      ctx.fillStyle = '#141c2a';
      ctx.fillRect(bx - 1, by - 1, 3, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx, by, 1, 1);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx - 1, by - 1, 1, 1);
    });

    scene.textures.addCanvas(PIXEL_UI_TEXTURE.PANEL_STONE, canvas);
  }

  /**
   * 32x16 9-slice Embossed Header Strip
   */
  private static buildPanelHeader(scene: Phaser.Scene): void {
    if (scene.textures.exists(PIXEL_UI_TEXTURE.PANEL_HEADER)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    // Dark base
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, 32, 16);

    // Top Gold Trim
    ctx.fillStyle = '#9a7020';
    ctx.fillRect(1, 1, 30, 2);
    ctx.fillStyle = '#a07820';
    ctx.fillRect(2, 1, 28, 1);

    // Body Gradient Slate
    ctx.fillStyle = '#141c2a';
    ctx.fillRect(1, 3, 30, 10);
    ctx.fillStyle = '#334155';
    ctx.fillRect(1, 3, 30, 2);

    // Bottom Dark Shadow
    ctx.fillStyle = '#090d16';
    ctx.fillRect(1, 13, 30, 2);

    scene.textures.addCanvas(PIXEL_UI_TEXTURE.PANEL_HEADER, canvas);
  }

  /**
   * 40x40 3D Recessed Slots with Rarity Glows
   */
  private static buildSlotTextures(scene: Phaser.Scene): void {
    const buildSlot = (key: string, borderColor: string, highlightColor: string, shadowColor: string) => {
      if (scene.textures.exists(key)) return;
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext('2d')!;

      // 1. Outer Dark Drop Shadow
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, 40, 40);

      // 2. Beveled Border Frame
      ctx.fillStyle = borderColor;
      ctx.fillRect(1, 1, 38, 38);

      // Highlight Top & Left
      ctx.fillStyle = highlightColor;
      ctx.fillRect(1, 1, 38, 2);
      ctx.fillRect(1, 1, 2, 38);

      // Shadow Bottom & Right
      ctx.fillStyle = shadowColor;
      ctx.fillRect(1, 37, 38, 2);
      ctx.fillRect(37, 1, 2, 38);

      // 3. Deep Inset Cavity
      ctx.fillStyle = '#050811';
      ctx.fillRect(3, 3, 34, 34);

      // Inner Top Shadow
      ctx.fillStyle = '#020306';
      ctx.fillRect(4, 4, 32, 4);
      ctx.fillRect(4, 4, 4, 32);

      // Center Inset Gradient
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(6, 6, 28, 28);

      // Corner Studs
      ctx.fillStyle = highlightColor;
      ctx.fillRect(2, 2, 2, 2);
      ctx.fillRect(36, 2, 2, 2);
      ctx.fillRect(2, 36, 2, 2);
      ctx.fillRect(36, 36, 2, 2);

      scene.textures.addCanvas(key, canvas);
    };

    buildSlot(PIXEL_UI_TEXTURE.SLOT_INSET, '#334155', '#64748b', '#0f172a');
    buildSlot(PIXEL_UI_TEXTURE.SLOT_GLOW_COMMON, '#475569', '#94a3b8', '#1e293b');
    buildSlot(PIXEL_UI_TEXTURE.SLOT_GLOW_UNCOMMON, '#0284c7', '#38bdf8', '#075985');
    buildSlot(PIXEL_UI_TEXTURE.SLOT_GLOW_RARE, '#7e22ce', '#c084fc', '#581c87');
    buildSlot(PIXEL_UI_TEXTURE.SLOT_GLOW_LEGENDARY, '#d97706', '#fbbf24', '#78350f');
  }

  /**
   * 3D Heavy Health Bar Frame & Fills
   */
  private static buildBarTextures(scene: Phaser.Scene): void {
    // 1. Bar Frame (160x18)
    if (!scene.textures.exists(PIXEL_UI_TEXTURE.BAR_FRAME)) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 18;
      const ctx = canvas.getContext('2d')!;

      // Outer Black
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, 160, 18);

      // Outer Gold/Steel Bevel
      ctx.fillStyle = '#7a4a15';
      ctx.fillRect(1, 1, 158, 16);
      ctx.fillStyle = '#b89840';
      ctx.fillRect(1, 1, 158, 1);
      ctx.fillRect(1, 1, 1, 16);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(1, 16, 158, 1);
      ctx.fillRect(158, 1, 1, 16);

      // Inner Cavity
      ctx.fillStyle = '#070b14';
      ctx.fillRect(2, 2, 156, 14);

      scene.textures.addCanvas(PIXEL_UI_TEXTURE.BAR_FRAME, canvas);
    }

    // 2. Glossy Ruby HP Bar Fill
    if (!scene.textures.exists(PIXEL_UI_TEXTURE.BAR_FILL_HP)) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 14;
      const ctx = canvas.getContext('2d')!;

      // Ruby Red Base
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 160, 14);

      // Top Specular Highlight Line
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(0, 1, 160, 2);

      // Bottom Rich Deep Red Shadow
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(0, 10, 160, 4);

      scene.textures.addCanvas(PIXEL_UI_TEXTURE.BAR_FILL_HP, canvas);
    }

    // 3. Ghost Damage Amber Bar Fill
    if (!scene.textures.exists(PIXEL_UI_TEXTURE.BAR_FILL_GHOST)) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 14;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, 160, 14);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(0, 1, 160, 2);

      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 10, 160, 4);

      scene.textures.addCanvas(PIXEL_UI_TEXTURE.BAR_FILL_GHOST, canvas);
    }
  }

  /**
   * 3D Tactile Pixel Button (Normal & Pressed)
   */
  private static buildButtonTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(PIXEL_UI_TEXTURE.BUTTON_PIXEL)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    // Black frame
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, 32, 16);

    // Beveled button face
    ctx.fillStyle = '#334155';
    ctx.fillRect(1, 1, 30, 14);

    // Top/left highlight
    ctx.fillStyle = '#64748b';
    ctx.fillRect(1, 1, 30, 2);
    ctx.fillRect(1, 1, 2, 14);

    // Bottom/right shadow
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(1, 13, 30, 2);
    ctx.fillRect(29, 1, 2, 14);

    scene.textures.addCanvas(PIXEL_UI_TEXTURE.BUTTON_PIXEL, canvas);
  }

  /**
   * 16x16 Pixel Art Icons Sheet for Stats & UI Badges
   */
  private static buildIconsSheet(scene: Phaser.Scene): void {
    if (scene.textures.exists(PIXEL_UI_TEXTURE.ICONS_SHEET)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 16 * 12;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    const drawIcon = (idx: number, drawFn: (c: CanvasRenderingContext2D, ox: number) => void) => {
      const ox = idx * 16;
      drawFn(ctx, ox);
    };

    // 0: Heart (Health)
    drawIcon(0, (c, ox) => {
      c.fillStyle = '#dc2626';
      c.fillRect(ox + 2, 4, 5, 5);
      c.fillRect(ox + 9, 4, 5, 5);
      c.fillRect(ox + 1, 6, 14, 4);
      c.fillRect(ox + 3, 10, 10, 3);
      c.fillRect(ox + 5, 13, 6, 2);
      c.fillRect(ox + 7, 15, 2, 1);
      // Highlight
      c.fillStyle = '#fca5a5';
      c.fillRect(ox + 3, 5, 2, 2);
    });

    // 1: Crossed Swords (Attack Damage)
    drawIcon(1, (c, ox) => {
      c.fillStyle = '#cbd5e1';
      c.fillRect(ox + 2, 2, 3, 3);
      c.fillRect(ox + 5, 5, 6, 6);
      c.fillRect(ox + 11, 11, 3, 3);
      c.fillStyle = '#f59e0b'; // hilt
      c.fillRect(ox + 12, 10, 3, 2);
      c.fillRect(ox + 10, 12, 2, 3);
      c.fillRect(ox + 13, 13, 2, 2);
    });

    // 2: Target / Bullseye (Critical Strike)
    drawIcon(2, (c, ox) => {
      c.fillStyle = '#ef4444';
      c.beginPath();
      c.arc(ox + 8, 8, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#0f172a';
      c.beginPath();
      c.arc(ox + 8, 8, 4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fbbf24';
      c.beginPath();
      c.arc(ox + 8, 8, 2, 0, Math.PI * 2);
      c.fill();
    });

    // 3: Winged Boot / Spark (Movement Speed)
    drawIcon(3, (c, ox) => {
      c.fillStyle = '#38bdf8';
      c.fillRect(ox + 2, 7, 6, 3);
      c.fillRect(ox + 5, 4, 4, 3);
      c.fillStyle = '#fde047';
      c.fillRect(ox + 4, 10, 10, 4);
      c.fillRect(ox + 11, 12, 4, 3);
    });

    // 4: Blood Droplet / Fang (Vampirism)
    drawIcon(4, (c, ox) => {
      c.fillStyle = '#991b1b';
      c.fillRect(ox + 7, 2, 2, 3);
      c.fillRect(ox + 5, 5, 6, 5);
      c.fillRect(ox + 4, 7, 8, 6);
      c.fillRect(ox + 6, 13, 4, 2);
      c.fillStyle = '#ef4444';
      c.fillRect(ox + 6, 7, 2, 4);
    });

    // 5: Shield / Crown (Defense / Immortal)
    drawIcon(5, (c, ox) => {
      c.fillStyle = '#f59e0b';
      c.fillRect(ox + 3, 3, 10, 6);
      c.fillRect(ox + 4, 9, 8, 4);
      c.fillRect(ox + 6, 13, 4, 2);
      c.fillStyle = '#fef08a';
      c.fillRect(ox + 5, 5, 6, 4);
    });

    // 6: Gold Coin
    drawIcon(6, (c, ox) => {
      c.fillStyle = '#f59e0b';
      c.beginPath();
      c.arc(ox + 8, 8, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fde047';
      c.beginPath();
      c.arc(ox + 7, 7, 4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#78350f';
      c.fillRect(ox + 7, 5, 2, 6);
    });

    // 7: Burning Ember
    drawIcon(7, (c, ox) => {
      c.fillStyle = '#ea580c';
      c.beginPath();
      c.moveTo(ox + 8, 1);
      c.quadraticCurveTo(ox + 15, 7, ox + 13, 12);
      c.quadraticCurveTo(ox + 10, 15, ox + 8, 15);
      c.quadraticCurveTo(ox + 6, 15, ox + 3, 12);
      c.quadraticCurveTo(ox + 1, 7, ox + 8, 1);
      c.fill();
      c.fillStyle = '#fde047';
      c.beginPath();
      c.arc(ox + 8, 10, 3, 0, Math.PI * 2);
      c.fill();
    });

    // 8: Close [X]
    drawIcon(8, (c, ox) => {
      c.fillStyle = '#ef4444';
      c.fillRect(ox + 2, 2, 12, 12);
      c.fillStyle = '#ffffff';
      c.fillRect(ox + 4, 4, 2, 2);
      c.fillRect(ox + 10, 4, 2, 2);
      c.fillRect(ox + 6, 6, 4, 4);
      c.fillRect(ox + 4, 10, 2, 2);
      c.fillRect(ox + 10, 10, 2, 2);
    });

    // 9: Flame Rune (Fire)
    drawIcon(9, (c, ox) => {
      c.fillStyle = '#ea580c';
      c.fillRect(ox + 4, 2, 8, 12);
      c.fillStyle = '#fde047';
      c.fillRect(ox + 6, 5, 4, 7);
    });

    // 10: Frost Rune (Ice)
    drawIcon(10, (c, ox) => {
      c.fillStyle = '#0284c7';
      c.fillRect(ox + 3, 3, 10, 10);
      c.fillStyle = '#e0f2fe';
      c.fillRect(ox + 7, 1, 2, 14);
      c.fillRect(ox + 1, 7, 14, 2);
    });

    // 11: Lightning Rune (Shock)
    drawIcon(11, (c, ox) => {
      c.fillStyle = '#facc15';
      c.beginPath();
      c.moveTo(ox + 9, 1);
      c.lineTo(ox + 4, 8);
      c.lineTo(ox + 8, 8);
      c.lineTo(ox + 6, 15);
      c.lineTo(ox + 12, 7);
      c.lineTo(ox + 8, 7);
      c.closePath();
      c.fill();
    });

    const texture = scene.textures.addCanvas(PIXEL_UI_TEXTURE.ICONS_SHEET, canvas)!;
    for (let i = 0; i < 12; i++) {
      texture.add(i, 0, i * 16, 0, 16, 16);
    }
  }

  /**
   * Helper to create a 9-slice stone panel.
   */
  public static createPanel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.NineSlice {
    // 32x32 texture with 8px corners
    const panel = scene.add.nineslice(x, y, PIXEL_UI_TEXTURE.PANEL_STONE, undefined, width, height, 8, 8, 8, 8);
    return panel;
  }

  /**
   * Helper to create a 9-slice header strip.
   */
  public static createHeader(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height = 24
  ): Phaser.GameObjects.NineSlice {
    const header = scene.add.nineslice(x, y, PIXEL_UI_TEXTURE.PANEL_HEADER, undefined, width, height, 6, 6, 4, 4);
    return header;
  }

  /**
   * Helper to create a 3D beveled slot.
   */
  public static createSlot(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size = 40,
    tier: 'inset' | 'common' | 'uncommon' | 'rare' | 'legendary' = 'inset'
  ): Phaser.GameObjects.NineSlice {
    const map: Record<string, string> = {
      inset: PIXEL_UI_TEXTURE.SLOT_INSET,
      common: PIXEL_UI_TEXTURE.SLOT_GLOW_COMMON,
      uncommon: PIXEL_UI_TEXTURE.SLOT_GLOW_UNCOMMON,
      rare: PIXEL_UI_TEXTURE.SLOT_GLOW_RARE,
      legendary: PIXEL_UI_TEXTURE.SLOT_GLOW_LEGENDARY,
    };
    const tex = map[tier] ?? PIXEL_UI_TEXTURE.SLOT_INSET;
    return scene.add.nineslice(x, y, tex, undefined, size, size, 6, 6, 6, 6);
  }
}
