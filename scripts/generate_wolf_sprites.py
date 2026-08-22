import os
from PIL import Image, ImageDraw, ImageEnhance

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR_DIR = os.path.join(BASE_DIR, 'vendor/32rogues/source/32rogues')
ASSETS_DIR = os.path.join(BASE_DIR, 'public/assets')

def build_refined_wolf_sprites():
    monsters_img = Image.open(os.path.join(VENDOR_DIR, 'monsters.png')).convert('RGBA')
    # Warg sprite (32x32) at col 10, row 6
    warg_base = monsters_img.crop((10 * 32, 6 * 32, 11 * 32, 7 * 32))
    
    # Palette colors extracted from warg:
    DARK_FUR = (44, 38, 48, 255)
    MID_FUR = (78, 68, 84, 255)
    LIGHT_FUR = (120, 108, 128, 255)
    HIGHLIGHT_FUR = (168, 154, 178, 255)
    EYE_GLINT = (245, 180, 50, 255)
    NOSE = (25, 20, 30, 255)
    SHADOW = (22, 18, 26, 255)

    # Separate components from warg_base:
    # Head & Neck: x=18..31, y=7..21
    head_img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(7, 22):
        for x in range(18, 32):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                head_img.putpixel((x, y), p)

    # Torso / Spine: x=8..22, y=8..22
    torso_img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(8, 23):
        for x in range(8, 23):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                torso_img.putpixel((x, y), p)

    # Tail: x=0..9, y=10..22
    tail_img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(10, 23):
        for x in range(0, 10):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                tail_img.putpixel((x, y), p)

    # Front Legs: x=22..30, y=21..31
    front_legs = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(21, 32):
        for x in range(22, 31):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                front_legs.putpixel((x, y), p)

    # Rear Legs: x=3..16, y=21..31
    rear_legs = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(21, 32):
        for x in range(3, 17):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                rear_legs.putpixel((x, y), p)

    # -------------------------------------------------------------
    # 1. IDLE SHEET: 4 frames, 32x32 (128x32)
    # Living breathing wolf with ear twitch and tail motion
    # -------------------------------------------------------------
    idle_sheet = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
    for f in range(4):
        frame = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
        
        # Head breath offset
        h_dy = -1 if f in (1, 2) else 0
        t_dy = -1 if f == 2 else 0
        tail_dy = 1 if f == 1 else (-1 if f == 3 else 0)

        # Base body & legs
        frame.paste(rear_legs, (0, 0), rear_legs)
        frame.paste(front_legs, (0, 0), front_legs)
        frame.paste(torso_img, (0, t_dy), torso_img)
        frame.paste(tail_img, (0, tail_dy), tail_img)
        frame.paste(head_img, (0, h_dy), head_img)
        
        # Add glowing amber eye on frame 2
        if f == 2:
            frame.putpixel((25, 11 + h_dy), EYE_GLINT)
            
        idle_sheet.paste(frame, (f * 32, 0))
    
    idle_path = os.path.join(ASSETS_DIR, 'pc-wolf-idle.png')
    idle_sheet.save(idle_path)
    print(f'Saved {idle_path}')

    # -------------------------------------------------------------
    # 2. RUN SHEET: 6 frames, 64x64 (384x64)
    # Clear 4-legged gallop with articulated paw reach & push
    # -------------------------------------------------------------
    run_sheet = Image.new('RGBA', (64 * 6, 64), (0, 0, 0, 0))

    # We will position the wolf centered horizontally in 64x64 (center ~ x=16..48, ground y=54)
    # Frame configurations: (body_y, body_rot, fleg_dx, fleg_dy, fleg_rot, rleg_dx, rleg_dy, rleg_rot, tail_rot)
    run_configs = [
        # Frame 0: Extended Stride (Front reach forward, rear reach back)
        {'by': 0, 'brot': 2, 'fdx': 4, 'fdy': -1, 'frot': -15, 'rdx': -4, 'rdy': 0, 'rrot': 20, 'tdy': 0},
        # Frame 1: Airborne Leap (High leap, maximum stretch, legs outstretched)
        {'by': -4, 'brot': -2, 'fdx': 6, 'fdy': -3, 'frot': -25, 'rdx': -6, 'rdy': -2, 'rrot': 35, 'tdy': -1},
        # Frame 2: Front Paws Touchdown (Descending, front absorbing ground, rear tucking in)
        {'by': 1, 'brot': 4, 'fdx': 1, 'fdy': 1, 'frot': 10, 'rdx': 2, 'rdy': -2, 'rrot': -15, 'tdy': 1},
        # Frame 3: Gather / Compression (Front bending, rear paws fully tucked under abdomen)
        {'by': 2, 'brot': 0, 'fdx': -2, 'fdy': 0, 'frot': 20, 'rdx': 4, 'rdy': 0, 'rrot': -30, 'tdy': 2},
        # Frame 4: Rear Thrust / Spring (Rear paws pushing down-back, front rising up)
        {'by': -1, 'brot': -5, 'fdx': 2, 'fdy': -2, 'frot': -10, 'rdx': -2, 'rdy': 1, 'rrot': 15, 'tdy': -1},
        # Frame 5: Forward Follow-through (Transition back to stride)
        {'by': -2, 'brot': -1, 'fdx': 3, 'fdy': -2, 'frot': -18, 'rdx': -3, 'rdy': 0, 'rrot': 25, 'tdy': 0},
    ]

    for f, cfg in enumerate(run_configs):
        frame = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        # Base offset to center 32x32 sprite in 64x64 (top-left: x=16, y=26 so bottom is at y=58)
        bx = 16
        by = 26 + cfg['by']

        # 1. Rear leg (back layer)
        r_rot = rear_legs.rotate(cfg['rrot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(r_rot, (bx + cfg['rdx'], by + cfg['rdy']), r_rot)

        # 2. Tail
        t_rot = tail_img.rotate(cfg['tdy'] * 10, expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(t_rot, (bx - 2, by + cfg['tdy']), t_rot)

        # 3. Torso
        t_rot = torso_img.rotate(cfg['brot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(t_rot, (bx, by), t_rot)

        # 4. Head
        h_rot = head_img.rotate(cfg['brot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(h_rot, (bx + 1, by), h_rot)

        # 5. Front leg (front layer)
        f_rot = front_legs.rotate(cfg['frot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(f_rot, (bx + cfg['fdx'], by + cfg['fdy']), f_rot)

        run_sheet.paste(frame, (f * 64, 0))

    run_path = os.path.join(ASSETS_DIR, 'pc-wolf-run.png')
    run_sheet.save(run_path)
    print(f'Saved {run_path}')

    # -------------------------------------------------------------
    # 3. DEATH SHEET: 6 frames, 48x48 (288x48)
    # Stagger -> drop to ground -> collapse
    # -------------------------------------------------------------
    death_sheet = Image.new('RGBA', (48 * 6, 48), (0, 0, 0, 0))
    for f in range(6):
        frame = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
        bx = 8
        by = 12
        if f == 0:
            # Stagger backward
            frame.paste(warg_base, (bx - 2, by - 2), warg_base)
        elif f == 1:
            # Reeling back
            rot = warg_base.rotate(-18, expand=True, resample=Image.Resampling.NEAREST)
            frame.paste(rot, (bx - 3, by + 1), rot)
        elif f == 2:
            # Collapsing onto knees
            rot = warg_base.rotate(-45, expand=True, resample=Image.Resampling.NEAREST)
            frame.paste(rot, (bx - 4, by + 4), rot)
        elif f == 3:
            # Hitting the ground flat
            flat = warg_base.resize((34, 18), Image.Resampling.NEAREST)
            frame.paste(flat, (bx, by + 14), flat)
        elif f == 4:
            # Settling into dirt
            flat = warg_base.resize((34, 16), Image.Resampling.NEAREST)
            enhancer = ImageEnhance.Brightness(flat)
            dimmed = enhancer.enhance(0.7)
            frame.paste(dimmed, (bx, by + 16), dimmed)
        elif f == 5:
            # Defeated corpse
            flat = warg_base.resize((34, 14), Image.Resampling.NEAREST)
            enhancer = ImageEnhance.Brightness(flat)
            dimmed = enhancer.enhance(0.45)
            frame.paste(dimmed, (bx, by + 18), dimmed)
            
        death_sheet.paste(frame, (f * 48, 0))

    death_path = os.path.join(ASSETS_DIR, 'pc-wolf-death.png')
    death_sheet.save(death_path)
    print(f'Saved {death_path}')

if __name__ == '__main__':
    build_refined_wolf_sprites()
