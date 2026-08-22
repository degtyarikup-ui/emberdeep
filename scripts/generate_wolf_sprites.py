import os
from PIL import Image, ImageEnhance

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR_DIR = os.path.join(BASE_DIR, 'vendor/32rogues/source/32rogues')
ASSETS_DIR = os.path.join(BASE_DIR, 'public/assets')

def create_wolf_sprites():
    # 1. Load source sprites from 32rogues
    # monsters.png row 7 (idx 6), col 11 (idx 10): warg / dire wolf
    monsters_img = Image.open(os.path.join(VENDOR_DIR, 'monsters.png')).convert('RGBA')
    warg = monsters_img.crop((10 * 32, 6 * 32, 11 * 32, 7 * 32))
    
    # -------------------------------------------------------------
    # 1. IDLE SHEET: 4 frames, 32x32 (128x32)
    # Subtle breathing / breathing rise and fall / eye glint
    # -------------------------------------------------------------
    idle_sheet = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
    for f in range(4):
        frame = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
        dy = 0
        if f == 1:
            dy = -1
        elif f == 2:
            dy = -1
        elif f == 3:
            dy = 0
        
        # Paste with breathing offset
        frame.paste(warg, (0, dy), warg)
        idle_sheet.paste(frame, (f * 32, 0))
    
    idle_path = os.path.join(ASSETS_DIR, 'pc-wolf-idle.png')
    idle_sheet.save(idle_path)
    print(f'Saved {idle_path}')

    # -------------------------------------------------------------
    # 2. RUN SHEET: 6 frames, 64x64 (384x64)
    # Fast 4-legged gallop / bounding leap animation matching Pixel Crawler 64x64
    # -------------------------------------------------------------
    run_sheet = Image.new('RGBA', (64 * 6, 64), (0, 0, 0, 0))
    offsets = [
        # (x_offset, y_offset, stretch_x, stretch_y)
        (16, 26, 1.0, 0.95),  # 0: Gather
        (18, 22, 1.05, 1.0),  # 1: Push off
        (20, 18, 1.15, 0.92), # 2: Full airborne leap
        (18, 20, 1.08, 0.98), # 3: Descent
        (15, 25, 0.98, 1.02), # 4: Front land
        (16, 27, 0.95, 0.95), # 5: Compress
    ]
    
    for f, (ox, oy, sx, sy) in enumerate(offsets):
        frame = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        new_w = max(1, int(32 * sx))
        new_h = max(1, int(32 * sy))
        scaled_warg = warg.resize((new_w, new_h), Image.Resampling.NEAREST)
        
        px = ox - (new_w - 32) // 2
        py = oy - (new_h - 32)
        frame.paste(scaled_warg, (px, py), scaled_warg)
        run_sheet.paste(frame, (f * 64, 0))
        
    run_path = os.path.join(ASSETS_DIR, 'pc-wolf-run.png')
    run_sheet.save(run_path)
    print(f'Saved {run_path}')

    # -------------------------------------------------------------
    # 3. DEATH SHEET: 6 frames, 48x48 (288x48)
    # Hit stagger -> collapse -> fade out / fall flat
    # -------------------------------------------------------------
    death_sheet = Image.new('RGBA', (48 * 6, 48), (0, 0, 0, 0))
    for f in range(6):
        frame = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
        if f == 0:
            frame.paste(warg, (8, 12), warg)
        elif f == 1:
            rotated = warg.rotate(-20, expand=True, resample=Image.Resampling.NEAREST)
            frame.paste(rotated, (6, 14), rotated)
        elif f == 2:
            rotated = warg.rotate(-50, expand=True, resample=Image.Resampling.NEAREST)
            frame.paste(rotated, (4, 18), rotated)
        elif f == 3:
            flattened = warg.resize((34, 18), Image.Resampling.NEAREST)
            frame.paste(flattened, (6, 24), flattened)
        elif f == 4:
            flattened = warg.resize((34, 16), Image.Resampling.NEAREST)
            enhancer = ImageEnhance.Brightness(flattened)
            dimmed = enhancer.enhance(0.7)
            frame.paste(dimmed, (6, 26), dimmed)
        elif f == 5:
            flattened = warg.resize((34, 14), Image.Resampling.NEAREST)
            enhancer = ImageEnhance.Brightness(flattened)
            dimmed = enhancer.enhance(0.5)
            frame.paste(dimmed, (6, 28), dimmed)
            
        death_sheet.paste(frame, (f * 48, 0))
        
    death_path = os.path.join(ASSETS_DIR, 'pc-wolf-death.png')
    death_sheet.save(death_path)
    print(f'Saved {death_path}')

if __name__ == '__main__':
    create_wolf_sprites()
