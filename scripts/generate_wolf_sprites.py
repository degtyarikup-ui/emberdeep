import os
from PIL import Image, ImageOps

BASE_DIR = '/home/nikita/Project/Emberdeep'
VENDOR_DIR = os.path.join(BASE_DIR, 'vendor/32rogues/source/32rogues')
ASSETS_DIR = os.path.join(BASE_DIR, 'public/assets')

def build_wolf_sprites():
    monsters_img = Image.open(os.path.join(VENDOR_DIR, 'monsters.png')).convert('RGBA')
    warg_raw = monsters_img.crop((10 * 32, 6 * 32, 11 * 32, 7 * 32))
    warg_base = ImageOps.mirror(warg_raw) # 32x32 facing right

    # Palette for Regular Wolf (Ash Gray & Amber Eyes)
    WOLF_OUTLINE = (18, 16, 22, 255)
    WOLF_DARK = (44, 40, 50, 255)
    WOLF_MID = (72, 66, 80, 255)
    WOLF_LIGHT = (112, 104, 122, 255)
    WOLF_HILIGHT = (156, 146, 168, 255)
    WOLF_EYE_BASE = (217, 119, 6, 255)
    WOLF_EYE_GLOW = (251, 191, 36, 255)

    # Palette for Direwolf (Obsidian Charcoal & Crimson Blood Eyes)
    DIRE_OUTLINE = (10, 8, 12, 255)
    DIRE_DARK = (24, 20, 30, 255)
    DIRE_MID = (46, 38, 56, 255)
    DIRE_LIGHT = (78, 62, 92, 255)
    DIRE_HILIGHT = (153, 27, 27, 255)
    DIRE_EYE_BASE = (185, 28, 28, 255)
    DIRE_EYE_GLOW = (248, 113, 113, 255)

    def recolor_warg(base_frame, is_dire=False):
        recolored = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
        out = DIRE_OUTLINE if is_dire else WOLF_OUTLINE
        dark = DIRE_DARK if is_dire else WOLF_DARK
        mid = DIRE_MID if is_dire else WOLF_MID
        light = DIRE_LIGHT if is_dire else WOLF_LIGHT
        hilight = DIRE_HILIGHT if is_dire else WOLF_HILIGHT
        eye_base = DIRE_EYE_BASE if is_dire else WOLF_EYE_BASE
        eye_glow = DIRE_EYE_GLOW if is_dire else WOLF_EYE_GLOW

        for y in range(32):
            for x in range(32):
                p = base_frame.getpixel((x, y))
                if p[3] < 30: continue
                r, g, b = p[0], p[1], p[2]
                brightness = (r + g + b) / 3.0
                
                # Eye pixel (near x=25..27, y=12..14)
                if 24 <= x <= 27 and 12 <= y <= 14 and (r > 150 or (r > 100 and g < 80)):
                    recolored.putpixel((x, y), eye_glow if brightness > 150 else eye_base)
                elif brightness < 35:
                    recolored.putpixel((x, y), out)
                elif brightness < 65:
                    recolored.putpixel((x, y), dark)
                elif brightness < 105:
                    recolored.putpixel((x, y), mid)
                elif brightness < 155:
                    recolored.putpixel((x, y), light)
                else:
                    recolored.putpixel((x, y), hilight)
        return recolored

    # 1. IDLE SHEET (4 frames, 32x32)
    def generate_idle(is_dire=False):
        sheet = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
        base = recolor_warg(warg_base, is_dire)
        
        for f in range(4):
            frame = base.copy()
            eye_glow = DIRE_EYE_GLOW if is_dire else WOLF_EYE_GLOW
            eye_base = DIRE_EYE_BASE if is_dire else WOLF_EYE_BASE
            hilight = DIRE_HILIGHT if is_dire else WOLF_HILIGHT
            
            if f == 0:
                frame.putpixel((26, 12), eye_base)
                frame.putpixel((27, 12), eye_glow)
            elif f == 1:
                head_chest = frame.crop((14, 7, 32, 23))
                for y in range(7, 23):
                    for x in range(14, 32): frame.putpixel((x, y), (0, 0, 0, 0))
                frame.paste(head_chest, (14, 6), head_chest)
                for y in range(15, 23):
                    for x in range(12, 16):
                        if base.getpixel((x, y))[3] > 50: frame.putpixel((x, y), base.getpixel((x, y)))
                frame.putpixel((1, 14), hilight)
                frame.putpixel((26, 11), eye_base)
                frame.putpixel((27, 11), eye_glow)
            elif f == 2:
                head_chest = frame.crop((14, 7, 32, 23))
                for y in range(7, 23):
                    for x in range(14, 32): frame.putpixel((x, y), (0, 0, 0, 0))
                frame.paste(head_chest, (14, 6), head_chest)
                for y in range(15, 23):
                    for x in range(12, 16):
                        if base.getpixel((x, y))[3] > 50: frame.putpixel((x, y), base.getpixel((x, y)))
                frame.putpixel((25, 11), eye_glow)
                frame.putpixel((26, 11), (255, 255, 255, 255))
                frame.putpixel((27, 11), eye_glow)
                frame.putpixel((23, 6), hilight)
                frame.putpixel((24, 6), hilight)
            elif f == 3:
                frame.putpixel((26, 12), eye_base)
                frame.putpixel((27, 12), eye_glow)
                frame.putpixel((0, 16), hilight)
                
            sheet.paste(frame, (f * 32, 0))
        return sheet

    # 2. RUN SHEET (4 frames, 32x32) — Stealth Trot Cycle (Стелющаяся рысь)
    # Steady spine, natural diagonal 4-leg gait, ground locked at y=30
    def generate_run(is_dire=False):
        sheet = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
        base = recolor_warg(warg_base, is_dire)
        
        dark = DIRE_DARK if is_dire else WOLF_DARK
        mid = DIRE_MID if is_dire else WOLF_MID
        light = DIRE_LIGHT if is_dire else WOLF_LIGHT
        hilight = DIRE_HILIGHT if is_dire else WOLF_HILIGHT
        out = DIRE_OUTLINE if is_dire else WOLF_OUTLINE
        eye = DIRE_EYE_GLOW if is_dire else WOLF_EYE_GLOW

        for f in range(4):
            frame = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
            # Torso, head, tail remain smoothly anchored on the 32x32 grid
            upper_body = base.crop((0, 7, 32, 23))
            
            if f == 0:
                # Frame 0: Stride Phase A (Left-Front forward, Right-Rear back)
                frame.paste(upper_body, (0, 8), upper_body)
                
                # Front legs: Left reaching forward (x: 24..28), Right pushing back (x: 18..22)
                for y in range(23, 30):
                    frame.putpixel((25, y), light)
                    frame.putpixel((26, y), mid)
                frame.putpixel((25, 30), out)
                frame.putpixel((26, 30), out)
                frame.putpixel((27, 30), out) # Forward paw plant
                
                for x, y in [(19, 28), (20, 27), (21, 26), (22, 25), (23, 24)]:
                    frame.putpixel((x, y), dark)
                    frame.putpixel((x, y-1), mid)
                    
                # Rear legs: Left under torso (x: 13..16), Right extended back (x: 6..10)
                for y in range(23, 30):
                    frame.putpixel((14, y), mid)
                    frame.putpixel((15, y), dark)
                frame.putpixel((14, 30), out)
                frame.putpixel((15, 30), out)
                
                for x, y in [(7, 28), (8, 27), (9, 26), (10, 25), (11, 24)]:
                    frame.putpixel((x, y), dark)
                    frame.putpixel((x, y-1), mid)
                frame.putpixel((7, 29), out)
                
                # Tail low trail
                for x, y in [(0, 18), (1, 18), (2, 17), (3, 17)]:
                    frame.putpixel((x, y), hilight)
                frame.putpixel((27, 13), eye)

            elif f == 1:
                # Frame 1: Passing Phase A (Paws glide past center, spine level)
                frame.paste(upper_body, (0, 8), upper_body)
                
                # Front legs passing (x: 21..25)
                for y in range(23, 29):
                    frame.putpixel((22, y), dark)
                    frame.putpixel((23, y), mid)
                    frame.putpixel((24, y), light)
                frame.putpixel((23, 30), out)
                frame.putpixel((24, 30), out)
                
                # Rear legs passing (x: 10..14)
                for y in range(23, 29):
                    frame.putpixel((11, y), dark)
                    frame.putpixel((12, y), mid)
                frame.putpixel((11, 30), out)
                frame.putpixel((12, 30), out)
                
                # Tail slight lift
                for x, y in [(0, 17), (1, 17), (2, 16), (3, 16)]:
                    frame.putpixel((x, y), hilight)
                frame.putpixel((27, 13), eye)

            elif f == 2:
                # Frame 2: Stride Phase B (Right-Front forward, Left-Rear back)
                frame.paste(upper_body, (0, 8), upper_body)
                
                # Front legs: Right reaching forward (x: 25..28), Left pushing back (x: 19..23)
                for y in range(23, 30):
                    frame.putpixel((26, y), light)
                    frame.putpixel((27, y), mid)
                frame.putpixel((26, 30), out)
                frame.putpixel((27, 30), out)
                frame.putpixel((28, 30), out) # Forward paw plant
                
                for x, y in [(20, 28), (21, 27), (22, 26), (23, 25), (24, 24)]:
                    frame.putpixel((x, y), dark)
                    frame.putpixel((x, y-1), mid)
                    
                # Rear legs: Right under torso (x: 14..17), Left extended back (x: 6..10)
                for y in range(23, 30):
                    frame.putpixel((15, y), mid)
                    frame.putpixel((16, y), dark)
                frame.putpixel((15, 30), out)
                frame.putpixel((16, 30), out)
                
                for x, y in [(6, 28), (7, 27), (8, 26), (9, 25), (10, 24)]:
                    frame.putpixel((x, y), dark)
                    frame.putpixel((x, y-1), mid)
                frame.putpixel((6, 29), out)
                
                # Tail low trail
                for x, y in [(0, 18), (1, 18), (2, 17), (3, 17)]:
                    frame.putpixel((x, y), hilight)
                frame.putpixel((27, 13), eye)

            elif f == 3:
                # Frame 3: Passing Phase B (Smooth glide back to Frame 0)
                frame.paste(upper_body, (0, 8), upper_body)
                
                # Front legs passing
                for y in range(23, 29):
                    frame.putpixel((23, y), dark)
                    frame.putpixel((24, y), mid)
                    frame.putpixel((25, y), light)
                frame.putpixel((24, 30), out)
                frame.putpixel((25, 30), out)
                
                # Rear legs passing
                for y in range(23, 29):
                    frame.putpixel((12, y), dark)
                    frame.putpixel((13, y), mid)
                frame.putpixel((12, 30), out)
                frame.putpixel((13, 30), out)
                
                # Tail subtle lift
                for x, y in [(0, 17), (1, 17), (2, 16), (3, 16)]:
                    frame.putpixel((x, y), hilight)
                frame.putpixel((27, 13), eye)

            sheet.paste(frame, (f * 32, 0))
        return sheet

    # 3. DEATH SHEET (6 frames, 32x32)
    def generate_death(is_dire=False):
        sheet = Image.new('RGBA', (32 * 6, 32), (0, 0, 0, 0))
        base = recolor_warg(warg_base, is_dire)

        for f in range(6):
            frame = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
            if f == 0:
                b = base.copy()
                frame.paste(b, (-2, -1), b)
            elif f == 1:
                b = base.copy()
                frame.paste(b, (-1, 2), b)
            elif f == 2:
                head_chest = base.crop((12, 7, 32, 23))
                frame.paste(head_chest, (12, 12), head_chest)
                rear = base.crop((0, 7, 14, 30))
                frame.paste(rear, (0, 6), rear)
            elif f == 3:
                flat = base.crop((0, 8, 32, 24))
                frame.paste(flat, (0, 15), flat)
            elif f == 4:
                flat = base.crop((0, 9, 32, 23))
                frame.paste(flat, (0, 17), flat)
            elif f == 5:
                flat = base.crop((0, 10, 32, 23))
                frame.paste(flat, (0, 18), flat)
                
            sheet.paste(frame, (f * 32, 0))
        return sheet

    # Generate Regular Wolf Sheets
    wolf_idle = generate_idle(is_dire=False)
    wolf_run = generate_run(is_dire=False)
    wolf_death = generate_death(is_dire=False)

    wolf_idle.save(os.path.join(ASSETS_DIR, 'pc-wolf-idle.png'))
    wolf_run.save(os.path.join(ASSETS_DIR, 'pc-wolf-run.png'))
    wolf_death.save(os.path.join(ASSETS_DIR, 'pc-wolf-death.png'))
    print(f'Generated Wolf: Idle {wolf_idle.size}, Run {wolf_run.size}, Death {wolf_death.size}')

    # Generate Direwolf Sheets
    dire_idle = generate_idle(is_dire=True)
    dire_run = generate_run(is_dire=True)
    dire_death = generate_death(is_dire=True)

    dire_idle.save(os.path.join(ASSETS_DIR, 'direwolf-idle.png'))
    dire_run.save(os.path.join(ASSETS_DIR, 'direwolf-run.png'))
    print(f'Generated Direwolf: Idle {dire_idle.size}, Run {dire_run.size}, Death {dire_death.size}')

if __name__ == '__main__':
    build_wolf_sprites()
