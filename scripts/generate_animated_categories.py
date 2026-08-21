import os
from PIL import Image, ImageDraw, ImageFont

DESKTOP = os.path.expanduser('~/Desktop')
BASE_DIR = '/Users/sergei/Documents/rogalik_nikita'
P0_DIR = os.path.join(BASE_DIR, 'vendor/0x72-dungeon-tileset-ii/source/0x72_DungeonTilesetII_v1.7/frames')
PC_DIR = os.path.join(BASE_DIR, 'vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Entities')

FONT_PATH = '/System/Library/Fonts/Supplemental/Arial.ttf'
if not os.path.exists(FONT_PATH):
    FONT_PATH = '/System/Library/Fonts/Helvetica.ttc'

font_title = ImageFont.truetype(FONT_PATH, 36)
font_subtitle = ImageFont.truetype(FONT_PATH, 18)
font_card_title = ImageFont.truetype(FONT_PATH, 18)
font_card_en = ImageFont.truetype(FONT_PATH, 13)
font_strip_label = ImageFont.truetype(FONT_PATH, 11)
font_badge = ImageFont.truetype(FONT_PATH, 11)

class AnimatedCharacter:
    def __init__(self, name_ru, name_en, role, pack_name, idle_frames, run_frames=None, death_frames=None, in_game=False):
        self.name_ru = name_ru
        self.name_en = name_en
        self.role = role
        self.pack_name = pack_name
        self.idle_frames = idle_frames       # List of PIL Images
        self.run_frames = run_frames or []   # List of PIL Images
        self.death_frames = death_frames or [] # List of PIL Images
        self.in_game = in_game

def load_0x72_char(prefix, name_ru, name_en, role=''):
    idle_frames = []
    run_frames = []
    for i in range(4):
        p_idle = os.path.join(P0_DIR, f'{prefix}_idle_anim_f{i}.png')
        if os.path.exists(p_idle):
            idle_frames.append(Image.open(p_idle).convert('RGBA'))
        p_run = os.path.join(P0_DIR, f'{prefix}_run_anim_f{i}.png')
        if os.path.exists(p_run):
            run_frames.append(Image.open(p_run).convert('RGBA'))
    return AnimatedCharacter(name_ru, name_en, role, '0x72 Dungeon II', idle_frames, run_frames)

def load_pc_sheet_frames(rel_path, frame_w, max_frames=None):
    full_path = os.path.join(PC_DIR, rel_path)
    if not os.path.exists(full_path):
        return []
    sheet = Image.open(full_path).convert('RGBA')
    frames = []
    num_frames = sheet.width // frame_w
    if max_frames:
        num_frames = min(num_frames, max_frames)
    for i in range(num_frames):
        frames.append(sheet.crop((i * frame_w, 0, (i + 1) * frame_w, sheet.height)))
    return frames

def render_category_poster(title_text, subtitle_text, characters, filename, cols=2):
    card_w = 1140 if cols == 2 else 760
    card_h = 240
    margin_x = 30
    margin_y = 24
    header_h = 160
    padding = 40
    
    rows = (len(characters) + cols - 1) // cols
    canvas_w = padding * 2 + cols * card_w + (cols - 1) * margin_x
    canvas_h = header_h + rows * (card_h + margin_y) + padding
    
    canvas = Image.new('RGBA', (canvas_w, canvas_h), '#0a0e1a')
    draw = ImageDraw.Draw(canvas)
    
    # Background Grid
    for gx in range(0, canvas_w, 32):
        draw.line([(gx, 0), (gx, canvas_h)], fill='#0f1526', width=1)
    for gy in range(0, canvas_h, 32):
        draw.line([(0, gy), (canvas_w, gy)], fill='#0f1526', width=1)
        
    # Header Banner
    draw.rectangle([(0, 0), (canvas_w, 130)], fill='#050811')
    draw.line([(0, 130), (canvas_w, 130)], fill='#f59e0b', width=4)
    draw.text((canvas_w // 2, 40), title_text, fill='#fbbf24', font=font_title, anchor='mm')
    draw.text((canvas_w // 2, 85), subtitle_text, fill='#94a3b8', font=font_subtitle, anchor='mm')
    
    start_y = header_h
    scale = 3
    
    for idx, char in enumerate(characters):
        c_idx = idx % cols
        r_idx = idx // cols
        
        cx = padding + c_idx * (card_w + margin_x)
        cy = start_y + r_idx * (card_h + margin_y)
        
        # Card Frame
        border_col = '#f59e0b' if char.in_game else '#2c3b5d'
        bg_col = '#131b2e' if char.in_game else '#0d1322'
        draw.rectangle([(cx, cy), (cx + card_w, cy + card_h)], fill=bg_col, outline=border_col, width=2 if char.in_game else 1)
        
        # Header strip on card
        draw.rectangle([(cx + 1, cy + 1), (cx + card_w - 1, cy + 42)], fill='#090d18')
        draw.line([(cx + 1, cy + 42), (cx + card_w - 1, cy + 42)], fill=border_col, width=1)
        
        # Card Titles
        draw.text((cx + 16, cy + 21), char.name_ru, fill='#f8fafc', font=font_card_title, anchor='lm')
        draw.text((cx + 16 + draw.textlength(char.name_ru, font=font_card_title) + 12, cy + 22), f'({char.name_en})', fill='#94a3b8', font=font_card_en, anchor='lm')
        
        if char.in_game:
            badge_text = 'В ИГРЕ'
            bw = draw.textlength(badge_text, font=font_badge) + 16
            draw.rectangle([(cx + card_w - bw - 14, cy + 10), (cx + card_w - 14, cy + 32)], fill='#78350f', outline='#f59e0b', width=1)
            draw.text((cx + card_w - bw // 2 - 14, cy + 21), badge_text, fill='#fef08a', font=font_badge, anchor='mm')
        else:
            draw.text((cx + card_w - 16, cy + 21), f'Пак: {char.pack_name}', fill='#38bdf8', font=font_card_en, anchor='rm')
            
        # Strips Area
        strip_y = cy + 54
        
        def render_strip(label, frames, y_pos, max_count=6):
            if not frames:
                return
            draw.text((cx + 16, y_pos + 16), label, fill='#fbbf24', font=font_strip_label, anchor='lm')
            frame_x = cx + 80
            
            for f in frames[:max_count]:
                fw, fh = f.size
                # Auto normalize size
                if max(fw, fh) > 48:
                    s = 2
                else:
                    s = scale
                sw = fw * s
                sh = fh * s
                if sw > 60 or sh > 60:
                    fit = min(56 / fw, 56 / fh)
                    sw = int(fw * fit)
                    sh = int(fh * fit)
                    
                scaled_frame = f.resize((sw, sh), Image.Resampling.NEAREST)
                
                # Inset frame box
                draw.rectangle([(frame_x, y_pos - 4), (frame_x + sw + 6, y_pos + sh + 6)], fill='#060912', outline='#1e293b', width=1)
                canvas.alpha_composite(scaled_frame, (frame_x + 3, y_pos + 1))
                frame_x += sw + 12
                
        # 1. Idle strip
        if char.idle_frames:
            render_strip('IDLE (Покой):', char.idle_frames, strip_y, max_count=6)
            
        # 2. Run strip
        if char.run_frames:
            render_strip('RUN (Бег):', char.run_frames, strip_y + 60, max_count=6)
            
        # 3. Death / Special strip
        if char.death_frames:
            render_strip('DEATH (Смерть):', char.death_frames, strip_y + 120, max_count=8)
        elif char.role:
            draw.text((cx + 16, cy + card_h - 16), f'Роль: {char.role}', fill='#4ade80', font=font_card_en, anchor='lm')

    out_path = os.path.join(DESKTOP, filename)
    print(f'Saving {out_path} ({canvas_w}x{canvas_h})...')
    canvas.convert('RGB').save(out_path, 'PNG', quality=95)
    print(f'Done: {filename}')

def main():
    # ==========================================
    # 1. АКТИВНЫЙ РОСТЕР
    # ==========================================
    c_knight = AnimatedCharacter(
        'Рыцарь', 'Knight', 'Игровой класс ближнего боя (Меч, Вихрь)', 'Pixel Crawler',
        load_pc_sheet_frames('Characters/Body_A/Animations/Idle_Base/Idle_Down-Sheet.png', 64, 4),
        load_pc_sheet_frames('Characters/Body_A/Animations/Run_Base/Run_Down-Sheet.png', 64, 6),
        load_pc_sheet_frames('Characters/Body_A/Animations/Death_Base/Death_Down-Sheet.png', 64, 9),
        in_game=True
    )
    c_ranger = AnimatedCharacter(
        'Следопыт / Лучница', 'Ranger', 'Игровой класс дальнего боя (Лук, Залп)', '0x72 Dungeon II',
        [Image.open(os.path.join(P0_DIR, f'elf_f_idle_anim_f{i}.png')).convert('RGBA') for i in range(4)],
        [Image.open(os.path.join(P0_DIR, f'elf_f_run_anim_f{i}.png')).convert('RGBA') for i in range(4)],
        in_game=True
    )
    c_wizard = AnimatedCharacter(
        'Волшебник', 'Wizard', 'Игровой класс магии (Посох, Сферы)', '0x72 Dungeon II',
        [Image.open(os.path.join(P0_DIR, f'wizzard_m_idle_anim_f{i}.png')).convert('RGBA') for i in range(4)],
        [Image.open(os.path.join(P0_DIR, f'wizzard_m_run_anim_f{i}.png')).convert('RGBA') for i in range(4)],
        in_game=True
    )
    c_orc_imp = AnimatedCharacter(
        'Орк / Бес', 'Orc / Imp', 'Базовый монстр ближнего боя', 'Pixel Crawler',
        load_pc_sheet_frames('Mobs/Orc Crew/Orc/Idle/Idle-Sheet.png', 32, 4),
        load_pc_sheet_frames('Mobs/Orc Crew/Orc/Run/Run-Sheet.png', 64, 6),
        load_pc_sheet_frames('Mobs/Orc Crew/Orc/Death/Death-Sheet.png', 64, 6),
        in_game=True
    )
    c_skeleton = AnimatedCharacter(
        'Скелет', 'Skeleton', 'Монстр катакомб (Быстрый выпад)', 'Pixel Crawler',
        load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Base/Idle/Idle-Sheet.png', 32, 4),
        load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Base/Run/Run-Sheet.png', 64, 6),
        load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Base/Death/Death-Sheet.png', 48, 8),
        in_game=True
    )
    c_boss = AnimatedCharacter(
        'Архидемон Бездны', 'Big Demon (Boss)', 'Главный босс (2 Фазы, Снаряды, Прыжки)', '0x72 Dungeon II',
        [Image.open(os.path.join(P0_DIR, f'big_demon_idle_anim_f{i}.png')).convert('RGBA') for i in range(4)],
        [Image.open(os.path.join(P0_DIR, f'big_demon_run_anim_f{i}.png')).convert('RGBA') for i in range(4)],
        in_game=True
    )
    
    render_category_poster(
        'EMBERDEEP — АКТИВНЫЙ ИГРОВОЙ РОСТЕР (ТЕКУЩИЕ АНИМАЦИИ)',
        'Персонажи, которые уже полностью запрограммированы и анимированы в игре',
        [c_knight, c_ranger, c_wizard, c_orc_imp, c_skeleton, c_boss],
        '1_active_roster_animated.png',
        cols=2
    )

    # ==========================================
    # 2. ГЕРОИ И NPC (0x72 Dungeon II)
    # ==========================================
    heroes_0x72 = [
        load_0x72_char('knight_m', 'Рыцарь (Мужчина)', 'Knight (M)', 'Тяжелый латный воин'),
        load_0x72_char('knight_f', 'Рыцарша (Женщина)', 'Knight (F)', 'Латная воительница'),
        load_0x72_char('elf_m', 'Эльф-следопыт (Мужчина)', 'Elf Ranger (M)', 'Меткий лучник леса'),
        load_0x72_char('elf_f', 'Эльфийка-следопыт (Женщина)', 'Elf Ranger (F)', 'Ловкая лучница'),
        load_0x72_char('wizzard_m', 'Волшебник (Мужчина)', 'Wizard (M)', 'Маг энергии и стихий'),
        load_0x72_char('wizzard_f', 'Волшебница (Женщина)', 'Wizard (F)', 'Чародейка бездны'),
        load_0x72_char('dwarf_m', 'Дворф-воин (Мужчина)', 'Dwarf (M)', 'Бородатый воин с топором'),
        load_0x72_char('dwarf_f', 'Дворф (Женщина)', 'Dwarf (F)', 'Дворфийская воительница'),
        load_0x72_char('lizard_m', 'Ящеролюд-гладиатор (М)', 'Lizard (M)', 'Чешуйчатый боец ближнего боя'),
        load_0x72_char('lizard_f', 'Ящеролюд (Женщина)', 'Lizard (F)', 'Ловкий ящер-разведчик'),
        load_0x72_char('doc', 'Чумной Доктор', 'Plague Doctor', 'NPC Торговец зельями / Алхимик у костра'),
        load_0x72_char('angel', 'Крылатый Ангел / Паладин', 'Angel / Paladin', 'Святой защитник / Класс Паладина'),
        load_0x72_char('pumpkin_dude', 'Тыквенный Воин', 'Pumpkin Dude', 'Секретный/Хэллоуинский персонаж'),
    ]
    render_category_poster(
        'EMBERDEEP — ГЕРОИ И NPC С АНИМАЦИЯМИ (0x72 DUNGEON TILESET II)',
        'Все персонажи имеют покадровые анимации Idle (Покой - 4 кадра) и Run (Бег - 4 кадра)',
        heroes_0x72,
        '2_heroes_npcs_animated.png',
        cols=2
    )

    # ==========================================
    # 3. МОНСТРЫ И БОССЫ (0x72 Dungeon II)
    # ==========================================
    mimic_frames = [Image.open(os.path.join(P0_DIR, f'chest_mimic_open_anim_f{i}.png')).convert('RGBA') for i in range(3)]
    monsters_0x72 = [
        load_0x72_char('big_zombie', 'Большой Зомби (Мини-босс)', 'Big Zombie', 'Мини-босс Катакомб, сокрушительный удар'),
        load_0x72_char('ogre', 'Огр с дубиной', 'Ogre', 'Тяжелый мини-босс/элитный враг Руин'),
        load_0x72_char('orc_warrior', 'Орк-воин', 'Orc Warrior', 'Бронированный пехотинец орков'),
        load_0x72_char('orc_shaman', 'Орк-шаман', 'Orc Shaman', 'Колдун, кастующий огненные шары'),
        load_0x72_char('masked_orc', 'Орк в железной маске', 'Masked Orc', 'Элитный берсерк'),
        load_0x72_char('chort', 'Чёрт с рогами', 'Chort', 'Быстрый демон-загонщик'),
        load_0x72_char('goblin', 'Зеленый Гоблин', 'Goblin', 'Шустрый карманник/разбойник'),
        load_0x72_char('tiny_zombie', 'Маленький зомби', 'Tiny Zombie', 'Быстрая стайная нежить'),
        load_0x72_char('skelet', 'Скелет-страж', 'Skeleton', 'Классический скелет с мечом'),
        load_0x72_char('wogol', 'Вогол', 'Wogol', 'Теневой монстр Глубин Бездны'),
        load_0x72_char('imp', 'Летающий Бес', 'Imp', 'Летающий мелкий демон'),
        AnimatedCharacter('Сундук-Мимик', 'Chest Mimic', 'Ловушка под видом сундука с сокровищами', '0x72 Dungeon II', mimic_frames, mimic_frames),
    ]
    render_category_poster(
        'EMBERDEEP — МОНСТРЫ И МИНИ-БОССЫ С АНИМАЦИЯМИ (0x72 DUNGEON TILESET II)',
        'Монстры с полноценными анимациями Idle (Покой - 4 кадра) и Run (Бег - 4 кадра)',
        monsters_0x72,
        '3_monsters_bosses_animated.png',
        cols=2
    )

    # ==========================================
    # 4. ФРАКЦИИ ВЫСОКОЙ ДЕТАЛИЗАЦИИ (Pixel Crawler)
    # ==========================================
    factions_pc = [
        AnimatedCharacter(
            'Человек-герой (Body A)', 'Human Hero (Body A)', 'Базовый персонаж со всеми видами ударов и анимаций', 'Pixel Crawler',
            load_pc_sheet_frames('Characters/Body_A/Animations/Idle_Base/Idle_Down-Sheet.png', 64, 4),
            load_pc_sheet_frames('Characters/Body_A/Animations/Run_Base/Run_Down-Sheet.png', 64, 6),
            load_pc_sheet_frames('Characters/Body_A/Animations/Death_Base/Death_Down-Sheet.png', 64, 9)
        ),
        AnimatedCharacter(
            'Орк (Базовый)', 'Orc Base', 'Обычный пехотинец орков', 'Pixel Crawler',
            load_pc_sheet_frames('Mobs/Orc Crew/Orc/Idle/Idle-Sheet.png', 32, 4),
            load_pc_sheet_frames('Mobs/Orc Crew/Orc/Run/Run-Sheet.png', 64, 6),
            load_pc_sheet_frames('Mobs/Orc Crew/Orc/Death/Death-Sheet.png', 64, 6)
        ),
        AnimatedCharacter(
            'Орк-воин со щитом', 'Orc Warrior', 'Тяжелый щитоносец с секирой', 'Pixel Crawler',
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Warrior/Idle/Idle-Sheet.png', 32, 4),
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Warrior/Run/Run-Sheet.png', 64, 6),
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Warrior/Death/Death-Sheet.png', 64, 6)
        ),
        AnimatedCharacter(
            'Орк-разбойник', 'Orc Rogue', 'Орк с парными кинжалами', 'Pixel Crawler',
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Rogue/Idle/Idle-Sheet.png', 32, 4),
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Rogue/Run/Run-Sheet.png', 64, 6),
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Rogue/Death/Death-Sheet.png', 64, 6)
        ),
        AnimatedCharacter(
            'Орк-шаман с посохом', 'Orc Shaman', 'Орк-некромант с черепом на посохе', 'Pixel Crawler',
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Shaman/Idle/Idle-Sheet.png', 32, 4),
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Shaman/Run/Run-Sheet.png', 64, 6),
            load_pc_sheet_frames('Mobs/Orc Crew/Orc - Shaman/Death/Death-Sheet.png', 64, 6)
        ),
        AnimatedCharacter(
            'Скелет (Базовый)', 'Skeleton Base', 'Базовый скелет с мечом', 'Pixel Crawler',
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Base/Idle/Idle-Sheet.png', 32, 4),
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Base/Run/Run-Sheet.png', 64, 6),
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Base/Death/Death-Sheet.png', 48, 8)
        ),
        AnimatedCharacter(
            'Скелет-воин в броне', 'Skeleton Warrior', 'Латный скелет-рыцарь со щитом', 'Pixel Crawler',
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Warrior/Idle/Idle-Sheet.png', 32, 4),
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Warrior/Run/Run-Sheet.png', 64, 6),
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Warrior/Death/Death-Sheet.png', 48, 8)
        ),
        AnimatedCharacter(
            'Скелет-ассасин', 'Skeleton Rogue', 'Теневой скелет с кинжалами', 'Pixel Crawler',
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Rogue/Idle/Idle-Sheet.png', 32, 4),
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Rogue/Run/Run-Sheet.png', 64, 6),
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Rogue/Death/Death-Sheet.png', 48, 8)
        ),
        AnimatedCharacter(
            'Скелет-маг (Лич)', 'Skeleton Mage', 'Скелет-колдун в темной мантии', 'Pixel Crawler',
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Mage/Idle/Idle-Sheet.png', 32, 4),
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Mage/Run/Run-Sheet.png', 64, 6),
            load_pc_sheet_frames('Mobs/Skeleton Crew/Skeleton - Mage/Death/Death-Sheet.png', 48, 8)
        ),
    ]
    render_category_poster(
        'EMBERDEEP — ФРАКЦИИ ВЫСОКОЙ ДЕТАЛИЗАЦИИ (PIXEL CRAWLER)',
        'Анимированные фракции с плавными анимациями Idle, Run и Death (до 9 кадров)',
        factions_pc,
        '4_factions_pixel_crawler_animated.png',
        cols=2
    )

if __name__ == '__main__':
    main()
