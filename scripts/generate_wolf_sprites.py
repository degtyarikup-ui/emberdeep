import os
from PIL import Image, ImageOps, ImageEnhance

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR_DIR = os.path.join(BASE_DIR, 'vendor/32rogues/source/32rogues')
ASSETS_DIR = os.path.join(BASE_DIR, 'public/assets')

def build_refined_wolf_sprites():
    monsters_img = Image.open(os.path.join(VENDOR_DIR, 'monsters.png')).convert('RGBA')
    # Warg sprite (32x32) at col 10, row 6 (in source, warg faces LEFT)
    warg_raw = monsters_img.crop((10 * 32, 6 * 32, 11 * 32, 7 * 32))
    
    # Mirror horizontally so the wolf faces RIGHT by default (matching Hero, Orc, Skeleton)
    warg_base = ImageOps.mirror(warg_raw)
    
    # Palette colors extracted from warg:
    DARK_FUR = (44, 38, 48, 255)
    MID_FUR = (78, 68, 84, 255)
    LIGHT_FUR = (120, 108, 128, 255)
    HIGHLIGHT_FUR = (168, 154, 178, 255)
    EYE_GLINT = (245, 180, 50, 255)
    EYE_PUPIL = (255, 220, 100, 255)

    # -------------------------------------------------------------
    # 1. IDLE SHEET: 4 frames, 32x32 (128x32)
    # Natural breathing quadruped stance facing RIGHT
    # -------------------------------------------------------------
    idle_sheet = Image.new('RGBA', (32 * 4, 32), (0, 0, 0, 0))
    for f in range(4):
        frame = warg_base.copy()
        
        # Frame 0: Base stance
        # Frame 1: Inhale / chest lifts 1px
        # Frame 2: Apex breath + predatory glowing eye glint
        # Frame 3: Exhale
        if f == 1:
            head_chest = frame.crop((14, 7, 32, 23))
            for y in range(7, 23):
                for x in range(14, 32):
                    frame.putpixel((x, y), (0, 0, 0, 0))
            frame.paste(head_chest, (14, 6), head_chest)
            for y in range(16, 23):
                for x in range(12, 16):
                    if warg_base.getpixel((x, y))[3] > 50:
                        frame.putpixel((x, y), warg_base.getpixel((x, y)))
                        
        elif f == 2:
            head_chest = frame.crop((14, 7, 32, 23))
            for y in range(7, 23):
                for x in range(14, 32):
                    frame.putpixel((x, y), (0, 0, 0, 0))
            frame.paste(head_chest, (14, 6), head_chest)
            for y in range(16, 23):
                for x in range(12, 16):
                    if warg_base.getpixel((x, y))[3] > 50:
                        frame.putpixel((x, y), warg_base.getpixel((x, y)))
            # Amber glowing eye glint at (25, 12) and (26, 12)
            frame.putpixel((25, 12), EYE_GLINT)
            frame.putpixel((26, 12), EYE_PUPIL)
            # Ear twitch
            frame.putpixel((21, 6), HIGHLIGHT_FUR)
            frame.putpixel((22, 6), LIGHT_FUR)
            
        elif f == 3:
            frame.putpixel((1, 14), DARK_FUR)
            frame.putpixel((2, 13), MID_FUR)

        idle_sheet.paste(frame, (f * 32, 0))
    
    idle_path = os.path.join(ASSETS_DIR, 'pc-wolf-idle.png')
    idle_sheet.save(idle_path)
    print(f'Saved {idle_path} ({idle_sheet.size})')

    # -------------------------------------------------------------
    # 2. RUN SHEET: 6 frames, 64x64 (384x64)
    # High-quality 4-legged canine gallop facing RIGHT
    # Ground plane is at y = 56, centered horizontally
    # -------------------------------------------------------------
    run_sheet = Image.new('RGBA', (64 * 6, 64), (0, 0, 0, 0))

    # Anatomical sub-components from warg_base (facing RIGHT):
    comp_head = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(7, 23):
        for x in range(18, 32):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                comp_head.putpixel((x, y), p)

    comp_torso = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(8, 25):
        for x in range(6, 23):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                comp_torso.putpixel((x, y), p)

    comp_tail = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(9, 21):
        for x in range(0, 9):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                comp_tail.putpixel((x, y), p)

    comp_forelegs = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(19, 32):
        for x in range(15, 31):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                comp_forelegs.putpixel((x, y), p)

    comp_hindlegs = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for y in range(18, 32):
        for x in range(0, 17):
            p = warg_base.getpixel((x, y))
            if p[3] > 50:
                comp_hindlegs.putpixel((x, y), p)

    run_configs = [
        # Frame 0: Full Reach Stride (Front reach forward-right, Hind reach backward-left)
        {
            'torso_dy': 0, 'torso_rot': 0,
            'head_dx': 2, 'head_dy': 0,
            'fleg_dx': 5, 'fleg_dy': -1, 'fleg_rot': -18,
            'rleg_dx': -4, 'rleg_dy': -1, 'rleg_rot': 22,
            'tail_dy': -1, 'tail_rot': 10
        },
        # Frame 1: Airborne Suspension (High forward leap, paws outstretched in mid-air)
        {
            'torso_dy': -4, 'torso_rot': -3,
            'head_dx': 4, 'head_dy': -4,
            'fleg_dx': 7, 'fleg_dy': -5, 'fleg_rot': -28,
            'rleg_dx': -6, 'rleg_dy': -4, 'rleg_rot': 32,
            'tail_dy': -4, 'tail_rot': 15
        },
        # Frame 2: Forepaw Touchdown (Front paws hit ground and flex, hind legs swing forward under flank)
        {
            'torso_dy': 0, 'torso_rot': 4,
            'head_dx': 1, 'head_dy': 1,
            'fleg_dx': 2, 'fleg_dy': 0, 'fleg_rot': 10,
            'rleg_dx': 2, 'rleg_dy': -2, 'rleg_rot': -12,
            'tail_dy': 1, 'tail_rot': -10
        },
        # Frame 3: Coiled Compression / Gather (Spine flexed, hind paws tucked under body planted to push)
        {
            'torso_dy': 2, 'torso_rot': 2,
            'head_dx': -1, 'head_dy': 1,
            'fleg_dx': -2, 'fleg_dy': 0, 'fleg_rot': 20,
            'rleg_dx': 4, 'rleg_dy': 0, 'rleg_rot': -24,
            'tail_dy': 2, 'tail_rot': -15
        },
        # Frame 4: Hind Launch / Power Drive (Hind legs explode backward against ground, front elevates)
        {
            'torso_dy': -1, 'torso_rot': -4,
            'head_dx': 2, 'head_dy': -2,
            'fleg_dx': 3, 'fleg_dy': -3, 'fleg_rot': -12,
            'rleg_dx': -2, 'rleg_dy': 0, 'rleg_rot': 16,
            'tail_dy': -1, 'tail_rot': 5
        },
        # Frame 5: Ascension / Follow-Through (Body surges up-forward transitioning into full stride)
        {
            'torso_dy': -3, 'torso_rot': -2,
            'head_dx': 3, 'head_dy': -3,
            'fleg_dx': 4, 'fleg_dy': -3, 'fleg_rot': -20,
            'rleg_dx': -4, 'rleg_dy': -2, 'rleg_rot': 24,
            'tail_dy': -2, 'tail_rot': 10
        },
    ]

    for f, cfg in enumerate(run_configs):
        frame = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        bx = 16
        by = 26 + cfg['torso_dy']

        # Layer 1: Hindleg (Back Layer)
        r_rot = comp_hindlegs.rotate(cfg['rleg_rot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(r_rot, (bx + cfg['rleg_dx'], by + cfg['rleg_dy']), r_rot)

        # Layer 2: Tail
        t_rot = comp_tail.rotate(cfg['tail_rot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(t_rot, (bx - 1, by + cfg['tail_dy']), t_rot)

        # Layer 3: Torso & Spine (solid core)
        t_rot = comp_torso.rotate(cfg['torso_rot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(t_rot, (bx, by), t_rot)

        # Layer 4: Head & Jaws
        h_rot = comp_head.rotate(cfg['torso_rot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(h_rot, (bx + cfg['head_dx'], by + cfg['head_dy']), h_rot)

        # Layer 5: Foreleg (Front Layer)
        f_rot = comp_forelegs.rotate(cfg['fleg_rot'], expand=True, resample=Image.Resampling.NEAREST)
        frame.paste(f_rot, (bx + cfg['fleg_dx'], by + cfg['fleg_dy']), f_rot)

        # Anatomical Seam-Healer: Ensure no transparent disconnects between torso and legs
        for y in range(by + 14, min(63, by + 26)):
            for x in range(bx + 6, min(63, bx + 26)):
                p = frame.getpixel((x, y))
                if p[3] < 30:
                    above = frame.getpixel((x, y - 1)) if y > 0 else (0,0,0,0)
                    below = frame.getpixel((x, y + 1)) if y < 63 else (0,0,0,0)
                    left = frame.getpixel((x - 1, y)) if x > 0 else (0,0,0,0)
                    right = frame.getpixel((x + 1, y)) if x < 63 else (0,0,0,0)
                    surrounding = sum(1 for n in (above, below, left, right) if n[3] > 100)
                    if surrounding >= 2:
                        frame.putpixel((x, y), MID_FUR)

        run_sheet.paste(frame, (f * 64, 0))

    run_path = os.path.join(ASSETS_DIR, 'pc-wolf-run.png')
    run_sheet.save(run_path)
    print(f'Saved {run_path} ({run_sheet.size})')

    # -------------------------------------------------------------
    # 3. DEATH SHEET: 6 frames, 48x48 (288x48)
    # Stagger -> Forelegs collapse -> Side roll -> Settle to ground
    # Facing RIGHT by default, ground at y = 40
    # -------------------------------------------------------------
    death_sheet = Image.new('RGBA', (48 * 6, 48), (0, 0, 0, 0))
    for f in range(6):
        frame = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
        bx = 8
        by = 10
        
        if f == 0:
            recoil = warg_base.copy()
            enhancer = ImageEnhance.Brightness(recoil)
            bright = enhancer.enhance(1.4)
            frame.paste(bright, (bx - 3, by - 2), bright)
            
        elif f == 1:
            rot = warg_base.rotate(-15, expand=True, resample=Image.Resampling.NEAREST)
            frame.paste(rot, (bx - 4, by + 1), rot)
            
        elif f == 2:
            rot = warg_base.rotate(-35, expand=True, resample=Image.Resampling.NEAREST)
            frame.paste(rot, (bx - 3, by + 5), rot)
            
        elif f == 3:
            flat = warg_base.resize((34, 18), Image.Resampling.NEAREST)
            frame.paste(flat, (bx + 1, by + 12), flat)
            
        elif f == 4:
            flat = warg_base.resize((34, 15), Image.Resampling.NEAREST)
            enhancer = ImageEnhance.Brightness(flat)
            dimmed = enhancer.enhance(0.75)
            frame.paste(dimmed, (bx + 2, by + 15), dimmed)
            
        elif f == 5:
            flat = warg_base.resize((34, 13), Image.Resampling.NEAREST)
            enhancer = ImageEnhance.Brightness(flat)
            dimmed = enhancer.enhance(0.5)
            frame.paste(dimmed, (bx + 2, by + 17), dimmed)

        death_sheet.paste(frame, (f * 48, 0))

    death_path = os.path.join(ASSETS_DIR, 'pc-wolf-death.png')
    death_sheet.save(death_path)
    print(f'Saved {death_path} ({death_sheet.size})')

if __name__ == '__main__':
    build_refined_wolf_sprites()

