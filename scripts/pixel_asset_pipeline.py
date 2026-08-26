#!/usr/bin/env python3
"""
Pixel Asset Pipeline for Emberdeep (inspired by Godogen asset-gen).
Processes high-res concept art / generated assets into game-ready 32x32 pixel art icons.

Pipeline Stages:
  1. Alpha Matting & Defringing (cleans solid background without color bleed)
  2. Smart Pixel-Art Downscaling (Area/Lanczos downsampling + Nearest-Neighbor grid snap)
  3. Dark Fantasy Palette Quantization & Posterization (eliminates blurry mixels)
  4. 1px Pixel-Art Edge Outlining
  5. In-Game Ornate Slot Mockup & Comparison Sheet Generation

Usage:
  python3 scripts/pixel_asset_pipeline.py --input path/to/art.png --output path/to/icon_32.png --preview path/to/comparison.png
"""

import argparse
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

# Emberdeep Dark Fantasy Palette (Rich jewel tones, glowing embers, deep obsidians)
EMBERDEEP_PALETTE = [
    (10, 7, 16),     # Void Black
    (24, 18, 38),    # Deep Slate
    (48, 36, 68),    # Shadow Purple
    (92, 54, 114),   # Mystic Violet
    (156, 85, 178),  # Arcane Magenta
    (224, 140, 240), # Bright Ether
    (138, 26, 26),   # Blood Red
    (218, 48, 48),   # Flame Crimson
    (245, 120, 24),  # Ember Orange
    (250, 192, 38),  # Solar Gold
    (255, 242, 168), # Pure Glow
    (22, 101, 52),   # Poison Moss
    (34, 197, 94),   # Toxic Emerald
    (14, 116, 144),  # Deep Frost
    (56, 189, 248),  # Frost Cyan
    (226, 232, 240), # Iron White
]


def remove_background(img: Image.Image, bg_tolerance: int = 40, defringe: bool = True) -> Image.Image:
    """Extracts subject from solid or near-solid background with defringing."""
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()

    # Sample corners to detect background color
    corners = [pixels[0, 0], pixels[w - 1, 0], pixels[0, h - 1], pixels[w - 1, h - 1]]
    bg_r = sum(c[0] for c in corners) // 4
    bg_g = sum(c[1] for c in corners) // 4
    bg_b = sum(c[2] for c in corners) // 4

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_pixels = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Color distance in RGB
            dist = math.sqrt((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2)
            
            if dist < bg_tolerance:
                alpha = 0
            elif dist < bg_tolerance + 30:
                # Soft transition
                alpha = int(255 * (dist - bg_tolerance) / 30)
            else:
                alpha = 255

            if alpha > 0 and defringe and alpha < 255:
                # Defringe: remove background hue bias from border pixels
                factor = 255 / max(alpha, 1)
                r = min(255, max(0, int(r * factor - bg_r * (factor - 1))))
                g = min(255, max(0, int(g * factor - bg_g * (factor - 1))))
                b = min(255, max(0, int(b * factor - bg_b * (factor - 1))))

            out_pixels[x, y] = (r, g, b, alpha)

    return out


def find_closest_palette_color(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Finds nearest neighbor color in Emberdeep fantasy palette."""
    best_dist = float('inf')
    best_color = EMBERDEEP_PALETTE[0]
    for pr, pg, pb in EMBERDEEP_PALETTE:
        # Weighted RGB Euclidean distance (closer to human eye perception)
        d = 0.299 * (r - pr)**2 + 0.587 * (g - pg)**2 + 0.114 * (b - pb)**2
        if d < best_dist:
            best_dist = d
            best_color = (pr, pg, pb)
    return best_color


def downscale_to_pixel_art(img: Image.Image, target_size: int = 32, quantize_palette: bool = True) -> Image.Image:
    """Downsamples image to target pixel grid and applies crisp pixel-art quantization."""
    # Step 1: Crop bounding box of subject
    bbox = img.split()[3].getbbox()
    if bbox:
        img = img.crop(bbox)

    # Step 2: Fit into target_size x target_size with 2px padding for border
    inner_size = target_size - 4
    w, h = img.size
    scale = min(inner_size / w, inner_size / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    scaled = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Place on 32x32 transparent canvas centered
    canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    pos_x = (target_size - new_w) // 2
    pos_y = (target_size - new_h) // 2
    canvas.paste(scaled, (pos_x, pos_y), scaled)

    pix = canvas.load()
    out = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    out_pix = out.load()

    # Step 3: Hard alpha thresholding and palette quantization
    for y in range(target_size):
        for x in range(target_size):
            r, g, b, a = pix[x, y]
            if a > 70:
                if quantize_palette:
                    pr, pg, pb = find_closest_palette_color(r, g, b)
                    out_pix[x, y] = (pr, pg, pb, 255)
                else:
                    out_pix[x, y] = (r, g, b, 255)

    # Step 4: 1px Dark Outline
    outlined = out.copy()
    out_pixels_src = out.load()
    outlined_pix = outlined.load()

    for y in range(target_size):
        for x in range(target_size):
            if out_pixels_src[x, y][3] == 0:
                # Check 4 neighbors
                has_solid_neighbor = False
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < target_size and 0 <= ny < target_size:
                        if out_pixels_src[nx, ny][3] == 255:
                            has_solid_neighbor = True
                            break
                if has_solid_neighbor:
                    outlined_pix[x, y] = (10, 7, 16, 255) # Void outline

    return outlined


def create_in_game_slot_preview(icon_32: Image.Image, zoom: int = 4) -> Image.Image:
    """Renders the 32x32 icon inside Emberdeep's gothic UI slot with ornate frame."""
    slot_size = 48
    slot = Image.new("RGBA", (slot_size, slot_size), (15, 23, 42, 255))
    draw = ImageDraw.Draw(slot)

    # Slot background and bevels
    draw.rectangle([2, 2, 45, 45], fill=(30, 41, 59))
    draw.rectangle([4, 4, 43, 43], fill=(9, 13, 22))
    # Golden border
    draw.rectangle([0, 0, 47, 47], outline=(138, 90, 21), width=1)
    draw.rectangle([2, 2, 45, 45], outline=(160, 120, 32), width=1)
    # Corner ruby gems
    for cx, cy in [(0, 0), (44, 0), (0, 44), (44, 44)]:
        draw.rectangle([cx, cy, cx + 3, cy + 3], fill=(239, 68, 68))

    # Center 32x32 icon inside 48x48 slot
    slot.paste(icon_32, (8, 8), icon_32)

    # Upscale pixel-art with NEAREST filtering
    preview = slot.resize((slot_size * zoom, slot_size * zoom), Image.Resampling.NEAREST)
    return preview


def build_comparison_sheet(original: Image.Image, matted: Image.Image, icon_32: Image.Image, slot_preview: Image.Image) -> Image.Image:
    """Builds a polished side-by-side walkthrough comparison sheet."""
    sheet_w, sheet_h = 1000, 340
    sheet = Image.new("RGB", (sheet_w, sheet_h), (13, 11, 22))
    draw = ImageDraw.Draw(sheet)

    # Headers
    titles = [
        "1. Concept Art Source",
        "2. Background Matting",
        "3. Pixel Art 32x32 (x6)",
        "4. Emberdeep UI Slot",
    ]

    cols = [30, 270, 510, 750]

    for i, (col, title) in enumerate(zip(cols, titles)):
        draw.text((col, 20), title, fill=(250, 192, 38))

    # 1. Original
    orig_thumb = original.resize((200, 200), Image.Resampling.LANCZOS)
    sheet.paste(orig_thumb, (30, 50))

    # 2. Matted (draw checkerboard background first)
    cb = Image.new("RGBA", (200, 200), (30, 30, 40, 255))
    cb_draw = ImageDraw.Draw(cb)
    for y in range(0, 200, 20):
        for x in range(0, 200, 20):
            if (x // 20 + y // 20) % 2 == 0:
                cb_draw.rectangle([x, y, x + 19, y + 19], fill=(45, 45, 60))
    matted_thumb = matted.resize((200, 200), Image.Resampling.LANCZOS)
    cb.paste(matted_thumb, (0, 0), matted_thumb)
    sheet.paste(cb, (270, 50))

    # 3. 32x32 Icon (displayed at 6x zoom = 192x192)
    icon_zoom = icon_32.resize((192, 192), Image.Resampling.NEAREST)
    sheet.paste(icon_zoom, (510 + 4, 50 + 4), icon_zoom)

    # 4. In-Game Slot Preview
    slot_thumb = slot_preview.resize((192, 192), Image.Resampling.NEAREST)
    sheet.paste(slot_thumb, (750, 50))

    # Frame each column
    for col in cols:
        draw.rectangle([col - 2, 48, col + 202, 252], outline=(60, 50, 80), width=1)

    return sheet


def create_demo_artifact_source(output_path: Path) -> Image.Image:
    """Generates a high-contrast dark fantasy concept-art artifact for testing."""
    size = 512
    img = Image.new("RGB", (size, size), (25, 20, 35)) # Neutral dark slate BG
    draw = ImageDraw.Draw(img)

    # Draw a magical glowing "Ember Dragon Heart / Royal Chalice"
    cx, cy = size // 2, size // 2

    # Aura glow
    for r in range(180, 40, -15):
        alpha = int(80 * (1 - r / 180))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(245, 120, 24), width=8)

    # Golden Chalice / Relic Body
    draw.polygon([
        (cx - 100, cy - 80),
        (cx + 100, cy - 80),
        (cx + 70, cy + 40),
        (cx + 25, cy + 90),
        (cx + 20, cy + 140),
        (cx + 60, cy + 170),
        (cx - 60, cy + 170),
        (cx - 20, cy + 140),
        (cx - 25, cy + 90),
        (cx - 70, cy + 40),
    ], fill=(218, 165, 32), outline=(255, 215, 0))

    # Inner Pulsing Lava Gem / Heart
    draw.polygon([
        (cx, cy - 60),
        (cx + 60, cy - 20),
        (cx + 45, cy + 50),
        (cx, cy + 85),
        (cx - 45, cy + 50),
        (cx - 60, cy - 20),
    ], fill=(218, 48, 48), outline=(255, 100, 50))

    # Crystalline highlight facets
    draw.polygon([(cx, cy - 50), (cx + 35, cy - 20), (cx, cy + 10), (cx - 35, cy - 20)], fill=(255, 180, 50))
    draw.ellipse([cx - 15, cy - 35, cx + 15, cy - 5], fill=(255, 245, 180))

    # Obsidian spikes / dragon claws clutching chalice
    for offset in [-80, 80]:
        draw.polygon([
            (cx + offset, cy - 70),
            (cx + offset + (25 if offset > 0 else -25), cy - 110),
            (cx + offset + (10 if offset > 0 else -10), cy - 40),
        ], fill=(30, 25, 45), outline=(156, 85, 178))

    img.save(output_path)
    return img


def main():
    parser = argparse.ArgumentParser(description="Emberdeep Pixel Asset Pipeline")
    parser.add_argument("--input", type=str, help="Input source image path")
    parser.add_argument("--output", type=str, default="artifacts/artifact_icon_32.png", help="Output 32x32 PNG")
    parser.add_argument("--preview", type=str, default="artifacts/pipeline_comparison.png", help="Output comparison sheet PNG")
    args = parser.parse_args()

    out_path = Path(args.output)
    prev_path = Path(args.preview)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    prev_path.parent.mkdir(parents=True, exist_ok=True)

    if args.input and Path(args.input).exists():
        src_img = Image.open(args.input)
    else:
        print("[Pipeline] No input provided, generating test dark fantasy artifact source...")
        demo_src_path = out_path.parent / "raw_concept_artifact.png"
        src_img = create_demo_artifact_source(demo_src_path)

    print("[Pipeline] 1. Extracting background & defringing...")
    matted = remove_background(src_img, bg_tolerance=45, defringe=True)

    print("[Pipeline] 2. Downscaling to 32x32 and applying Emberdeep palette quantization...")
    icon_32 = downscale_to_pixel_art(matted, target_size=32, quantize_palette=True)
    icon_32.save(out_path)
    print(f"[Pipeline] Saved 32x32 icon: {out_path}")

    print("[Pipeline] 3. Rendering in-game UI slot preview & comparison sheet...")
    slot_preview = create_in_game_slot_preview(icon_32, zoom=4)
    comparison = build_comparison_sheet(src_img, matted, icon_32, slot_preview)
    comparison.save(prev_path)
    print(f"[Pipeline] Saved comparison preview: {prev_path}")


if __name__ == "__main__":
    main()
