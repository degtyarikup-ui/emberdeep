import os
import re
from PIL import Image, ImageDraw, ImageFont

DESKTOP_PATH = os.path.expanduser('~/Desktop/emberdeep_characters.png')

# Paths
BASE_DIR = '/Users/sergei/Documents/rogalik_nikita'
P0_DIR = os.path.join(BASE_DIR, 'vendor/0x72-dungeon-tileset-ii/source/0x72_DungeonTilesetII_v1.7/frames')
PC_DIR = os.path.join(BASE_DIR, 'vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Entities')
R32_DIR = os.path.join(BASE_DIR, 'vendor/32rogues/source/32rogues')

# Load fonts
FONT_PATH = '/System/Library/Fonts/Supplemental/Arial.ttf'
if not os.path.exists(FONT_PATH):
    FONT_PATH = '/System/Library/Fonts/Helvetica.ttc'

font_title_main = ImageFont.truetype(FONT_PATH, 42)
font_subtitle = ImageFont.truetype(FONT_PATH, 20)
font_section = ImageFont.truetype(FONT_PATH, 28)
font_card_name = ImageFont.truetype(FONT_PATH, 14)
font_card_sub = ImageFont.truetype(FONT_PATH, 11)
font_badge = ImageFont.truetype(FONT_PATH, 10)

# Helper translations
RU_TRANSLATIONS = {
    'knight': 'Рыцарь', 'male fighter': 'Боец', 'female knight': 'Рыцарша',
    'female knight (helmetless)': 'Рыцарша без шлема', 'shield knight': 'Рыцарь со щитом',
    'monk': 'Монах', 'priest': 'Жрец', 'female war cleric': 'Клирик (Ж)', 'male war cleric': 'Боевой клирик',
    'templar': 'Тамплиер', 'schema monk': 'Схимник', 'elder schema monk': 'Старец-схимник',
    'male barbarian': 'Варвар', 'male winter barbarian': 'Северный варвар', 'female winter barbarian': 'Северянка',
    'swordsman': 'Мечник', 'fencer': 'Фехтовальщик', 'female barbarian': 'Варварша',
    'female wizard': 'Волшебница', 'male wizard': 'Волшебник', 'druid': 'Друид',
    'desert sage': 'Мудрец пустыни', 'dwarf mage': 'Дворф-маг', 'warlock': 'Чернокнижник',
    'farmer (wheat thresher)': 'Фермер (молотильщик)', 'farmer (scythe)': 'Фермер с косой',
    'farmer (pitchfork)': 'Фермер с вилами', 'baker': 'Пекарь', 'blacksmith': 'Кузнец',
    'scholar': 'Ученый', 'peasant / coalburner': 'Угольщик', 'peasant': 'Крестьянин',
    'shopkeep': 'Торговец', 'elderly woman': 'Старушка', 'elderly man': 'Старик',
    'dwarf': 'Дворф', 'elf': 'Эльф', 'ranger': 'Следопыт / Лучник', 'rogue': 'Разбойник', 'bandit': 'Бандит',
    
    # Monsters
    'orc': 'Орк', 'orc wizard': 'Орк-маг', 'goblin': 'Гоблин', 'orc blademaster': 'Мастер клинка орков',
    'orc warchief': 'Вождь орков', 'goblin archer': 'Гоблин-лучник', 'goblin mage': 'Гоблин-шаман',
    'goblin brute': 'Гоблин-громила', 'ettin': 'Эттин', 'two headed ettin': 'Двуглавый эттин', 'troll': 'Тролль',
    'small slime': 'Малый слизень', 'big slime': 'Большой слизень', 'slimebody': 'Слизевой гуманоид',
    'merged slimebodies': 'Слияние слизней', 'faceless monk': 'Безликий монах', 'unholy cardinal': 'Нечестивый кардинал',
    'skeleton': 'Скелет', 'skeleton archer': 'Скелет-лучник', 'lich': 'Лич (Некромант)', 'death knight': 'Рыцарь смерти',
    'zombie': 'Зомби', 'ghoul': 'Вурдалак', 'banshee': 'Банши', 'reaper': 'Жнец (Смерть)', 'wraith': 'Призрак',
    'cultist': 'Культист', 'hag/witch': 'Ведьма / Карга', 'giant centipede': 'Многоножка', 'lampreymander': 'Минога-саламандра',
    'giant earthworm': 'Земляной червь', 'manticore': 'Мантикора', 'giant ant': 'Гигантский муравей',
    'lycanthrope': 'Оборотень (Вервольф)', 'giant bata': 'Гигантская летучая мышь', 'lesser giant ant': 'Малый муравей',
    'giant spider': 'Гигантский паук', 'lesser giant spider': 'Малый паук', 'warg/dire wolf': 'Лютый волк (Варг)',
    'giant rat': 'Гигантская крыса', 'dryad': 'Дриада', 'wendigo': 'Вендиго', 'rock golem': 'Каменный голем',
    'centaur': 'Кентавр', 'naga': 'Нага', 'forest spirit': 'Лесной дух', 'satyr': 'Сатир', 'minotaur': 'Минотавр',
    'harpy': 'Гарпия', 'gorgon/medusa': 'Горгона (Медуза)', 'lizardfolk / kobold (reptile)': 'Ящеролюд',
    'drake / lesser dragon': 'Дрейк', 'dragon': 'Дракон', 'cockatrice': 'Кокатрикс', 'basilisk': 'Василиск',
    'small kobold (canine)': 'Малый кобольд', 'kobold (canine)': 'Кобольд', 'small myconid': 'Малый миконид (Гриб)',
    'large myconid': 'Большой миконид', 'angel / archangel': 'Архангел', 'imp / devil': 'Имп / Бес',
    'small writhing mass': 'Малая масса бездны', 'large writhing mass': 'Масса бездны', 'writhing humanoid': 'Гуманоид бездны',
    
    # Animals
    'grizzly bear': 'Гризли', 'black bear': 'Черный медведь', 'polar bear': 'Белый медведь', 'panda': 'Панда',
    'cat': 'Кот', 'cheetah': 'Гепард', 'lynx': 'Рысь', 'male lion': 'Лев', 'female lion': 'Львица',
    'dog': 'Пес', 'puppy': 'Щенок', 'wolf': 'Волк', 'fox': 'Лисица', 'hyena': 'Гиена',
    'capybara': 'Капибара', 'beaver': 'Бобр', 'rat': 'Крыса', 'crow / raven': 'Ворон', 'bat': 'Летучая мышь',
    'wild boar': 'Кабан', 'stag / deer': 'Олень', 'doe': 'Олениха', 'snake': 'Змея', 'toad': 'Жаба',
}

class CharacterEntry:
    def __init__(self, image, name_ru, name_en, pack_name, in_game=False, role=''):
        self.image = image
        self.name_ru = name_ru
        self.name_en = name_en
        self.pack_name = pack_name
        self.in_game = in_game
        self.role = role

def extract_32rogues(sheet_name, txt_name, pack_label):
    entries = []
    sheet = Image.open(os.path.join(R32_DIR, sheet_name)).convert('RGBA')
    txt_path = os.path.join(R32_DIR, txt_name)
    
    with open(txt_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            m = re.match(r'^(\d+)\.([a-z])\.\s*(.+)$', line)
            if m:
                row_idx = int(m.group(1)) - 1
                col_idx = ord(m.group(2)) - ord('a')
                name_en = m.group(3).strip()
                
                # Crop 32x32
                x = col_idx * 32
                y = row_idx * 32
                if x + 32 <= sheet.width and y + 32 <= sheet.height:
                    sprite = sheet.crop((x, y, x + 32, y + 32))
                    name_ru = RU_TRANSLATIONS.get(name_en.lower(), name_en.title())
                    entries.append(CharacterEntry(sprite, name_ru, name_en, pack_label))
    return entries

def main():
    sections = []
    
    # --- Section 1: Текущий активный ростер ---
    s1_items = []
    # 1. Knight
    pc_knight = Image.open(os.path.join(BASE_DIR, 'public/assets/pc-knight-idle.png')).convert('RGBA').crop((0, 0, 32, 32))
    s1_items.append(CharacterEntry(pc_knight, 'Рыцарь', 'Knight', 'Pixel Crawler', in_game=True, role='Игровой класс (Ближний бой)'))
    
    # 2. Ranger
    r_elf = Image.open(os.path.join(BASE_DIR, 'public/assets/ranger-idle.png')).convert('RGBA').crop((0, 0, 32, 32))
    s1_items.append(CharacterEntry(r_elf, 'Следопыт / Лучница', 'Ranger', '0x72 Dungeon II', in_game=True, role='Игровой класс (Лук и стрелы)'))
    
    # 3. Wizard
    wiz = Image.open(os.path.join(P0_DIR, 'wizzard_m_idle_anim_f0.png')).convert('RGBA')
    s1_items.append(CharacterEntry(wiz, 'Волшебник', 'Wizard', '0x72 Dungeon II', in_game=True, role='Игровой класс (Магический посох)'))
    
    # 4. Orc / Imp
    pc_orc = Image.open(os.path.join(BASE_DIR, 'public/assets/pc-orc-idle.png')).convert('RGBA').crop((0, 0, 32, 32))
    s1_items.append(CharacterEntry(pc_orc, 'Орк / Бес', 'Imp / Orc', 'Pixel Crawler', in_game=True, role='Враг (Ближний бой)'))
    
    # 5. Skeleton
    pc_skel = Image.open(os.path.join(BASE_DIR, 'public/assets/pc-skeleton-idle.png')).convert('RGBA').crop((0, 0, 32, 32))
    s1_items.append(CharacterEntry(pc_skel, 'Скелет', 'Skeleton', 'Pixel Crawler', in_game=True, role='Враг (Ближний бой)'))
    
    # 6. Big Demon
    demon = Image.open(os.path.join(BASE_DIR, 'public/assets/big_demon.png')).convert('RGBA').crop((0, 0, 32, 36))
    s1_items.append(CharacterEntry(demon, 'Архидемон Бездны', 'Big Demon (Boss)', '0x72 Dungeon II', in_game=True, role='Главный босс подземелья'))
    
    sections.append(('🔥 АКТИВНЫЙ РОСТЕР (УЖЕ В ИГРЕ)', s1_items, 6))

    # --- Section 2: 0x72 Dungeon II Герои и NPC ---
    s2_items = []
    p0_heroes = [
        ('knight_m_idle_anim_f0.png', 'Рыцарь (Мужчина)', 'Knight (M)'),
        ('knight_f_idle_anim_f0.png', 'Рыцарь (Женщина)', 'Knight (F)'),
        ('elf_m_idle_anim_f0.png', 'Эльф-следопыт (Мужчина)', 'Elf Ranger (M)'),
        ('elf_f_idle_anim_f0.png', 'Эльф-следопыт (Женщина)', 'Elf Ranger (F)'),
        ('wizzard_m_idle_anim_f0.png', 'Волшебник', 'Wizard (M)'),
        ('wizzard_f_idle_anim_f0.png', 'Волшебница', 'Wizard (F)'),
        ('dwarf_m_idle_anim_f0.png', 'Дворф с секирой (М)', 'Dwarf (M)'),
        ('dwarf_f_idle_anim_f0.png', 'Дворф (Женщина)', 'Dwarf (F)'),
        ('lizard_m_idle_anim_f0.png', 'Ящеролюд-воин (М)', 'Lizard (M)'),
        ('lizard_f_idle_anim_f0.png', 'Ящеролюд (Ж)', 'Lizard (F)'),
        ('doc_idle_anim_f0.png', 'Чумной Доктор (Торговец)', 'Plague Doctor (NPC)'),
        ('angel_idle_anim_f0.png', 'Крылатый Ангел / Паладин', 'Angel / Paladin'),
        ('pumpkin_dude_idle_anim_f0.png', 'Тыквоголовый воин', 'Pumpkin Dude'),
    ]
    for fn, n_ru, n_en in p0_heroes:
        fp = os.path.join(P0_DIR, fn)
        if os.path.exists(fp):
            im = Image.open(fp).convert('RGBA')
            s2_items.append(CharacterEntry(im, n_ru, n_en, '0x72 Dungeon II'))
    sections.append(('🛡️ ГЕРОИ И NPC (0x72 Dungeon Tileset II)', s2_items, 6))

    # --- Section 3: 0x72 Dungeon II Монстры и Боссы ---
    s3_items = []
    p0_mobs = [
        ('big_zombie_idle_anim_f0.png', 'Большой Зомби (Мини-босс)', 'Big Zombie'),
        ('ogre_idle_anim_f0.png', 'Огр с дубиной', 'Ogre'),
        ('orc_warrior_idle_anim_f0.png', 'Орк-воин', 'Orc Warrior'),
        ('orc_shaman_idle_anim_f0.png', 'Орк-шаман', 'Orc Shaman'),
        ('masked_orc_idle_anim_f0.png', 'Орк в маске палача', 'Masked Orc'),
        ('chort_idle_anim_f0.png', 'Чёрт с рогами', 'Chort'),
        ('goblin_idle_anim_f0.png', 'Гоблин', 'Goblin'),
        ('tiny_zombie_idle_anim_f0.png', 'Маленький зомби', 'Tiny Zombie'),
        ('skelet_idle_anim_f0.png', 'Скелет-страж', 'Skeleton'),
        ('wogol_idle_anim_f0.png', 'Вогол (Монстр глубин)', 'Wogol'),
        ('imp_idle_anim_f0.png', 'Летающий Бес', 'Imp'),
        ('chest_mimic_open_anim_f1.png', 'Сундук-Мимик', 'Chest Mimic'),
    ]
    for fn, n_ru, n_en in p0_mobs:
        fp = os.path.join(P0_DIR, fn)
        if os.path.exists(fp):
            im = Image.open(fp).convert('RGBA')
            s3_items.append(CharacterEntry(im, n_ru, n_en, '0x72 Dungeon II'))
    sections.append(('👹 МОНСТРЫ И МИНИ-БОССЫ (0x72 Dungeon Tileset II)', s3_items, 6))

    # --- Section 4: Pixel Crawler Фракции ---
    s4_items = []
    pc_mobs = [
        ('Characters/Body_A/Animations/Idle_Base/Idle_Down-Sheet.png', 64, 'Человек (Базовый герой)', 'Human Hero (Body A)'),
        ('Mobs/Orc Crew/Orc/Idle/Idle-Sheet.png', 32, 'Орк (Базовый)', 'Orc Base'),
        ('Mobs/Orc Crew/Orc - Warrior/Idle/Idle-Sheet.png', 32, 'Орк-воин со щитом', 'Orc Warrior'),
        ('Mobs/Orc Crew/Orc - Rogue/Idle/Idle-Sheet.png', 32, 'Орк-разбойник', 'Orc Rogue'),
        ('Mobs/Orc Crew/Orc - Shaman/Idle/Idle-Sheet.png', 32, 'Орк-шаман с посохом', 'Orc Shaman'),
        ('Mobs/Skeleton Crew/Skeleton - Base/Idle/Idle-Sheet.png', 32, 'Скелет (Базовый)', 'Skeleton Base'),
        ('Mobs/Skeleton Crew/Skeleton - Warrior/Idle/Idle-Sheet.png', 32, 'Скелет-воин в броне', 'Skeleton Warrior'),
        ('Mobs/Skeleton Crew/Skeleton - Rogue/Idle/Idle-Sheet.png', 32, 'Скелет-ассасин', 'Skeleton Rogue'),
        ('Mobs/Skeleton Crew/Skeleton - Mage/Idle/Idle-Sheet.png', 32, 'Скелет-маг (Лич)', 'Skeleton Mage'),
    ]
    for rel_p, fw, n_ru, n_en in pc_mobs:
        fp = os.path.join(PC_DIR, rel_p)
        if os.path.exists(fp):
            sheet = Image.open(fp).convert('RGBA')
            im = sheet.crop((0, 0, fw, fw))
            s4_items.append(CharacterEntry(im, n_ru, n_en, 'Pixel Crawler'))
    sections.append(('⚔️ АНИМИРОВАННЫЕ ФРАКЦИИ (Pixel Crawler)', s4_items, 6))

    # --- Section 5: 32rogues Классы ---
    s5_items = extract_32rogues('rogues.png', 'rogues.txt', '32rogues')
    sections.append(('🧙‍♂️ КЛАССЫ, ВОИНЫ И ЖИТЕЛИ (32rogues)', s5_items, 7))

    # --- Section 6: 32rogues Бестиарий ---
    s6_items = extract_32rogues('monsters.png', 'monsters.txt', '32rogues')
    sections.append(('🐉 БЕСТИАРИЙ И МИФИЧЕСКИЕ ЧУДОВИЩА (32rogues)', s6_items, 7))

    # --- Section 7: 32rogues Животные и Питомцы ---
    s7_items = extract_32rogues('animals.png', 'animals.txt', '32rogues')
    sections.append(('🐺 ЖИВОТНЫЕ И ПИТОМЦЫ (32rogues)', s7_items, 7))

    # --- Layout Calculation ---
    canvas_w = 2700
    card_w = 340
    card_h = 160
    card_margin_x = 24
    card_margin_y = 20
    section_padding_y = 70
    
    total_h = 240 # Header height
    
    for title, items, cols in sections:
        rows = (len(items) + cols - 1) // cols
        sec_h = 60 + rows * (card_h + card_margin_y) + section_padding_y
        total_h += sec_h
        
    print(f'Creating canvas {canvas_w}x{total_h}...')
    canvas = Image.new('RGBA', (canvas_w, total_h), '#0c101d')
    draw = ImageDraw.Draw(canvas)
    
    # Background Grid Pattern
    for gx in range(0, canvas_w, 40):
        draw.line([(gx, 0), (gx, total_h)], fill='#101626', width=1)
    for gy in range(0, total_h, 40):
        draw.line([(0, gy), (canvas_w, gy)], fill='#101626', width=1)

    # Main Header
    draw.rectangle([(0, 0), (canvas_w, 180)], fill='#070a14')
    draw.line([(0, 180), (canvas_w, 180)], fill='#f59e0b', width=4)
    
    draw.text((canvas_w // 2, 45), 'EMBERDEEP — КАТАЛОГ ВСЕХ ПЕРСОНАЖЕЙ И МОНСТРОВ', fill='#fbbf24', font=font_title_main, anchor='mm')
    draw.text((canvas_w // 2, 105), 'Полная библиотека доступных ассетов (Pixel Crawler, 0x72 Dungeon Tileset II, 32rogues)', fill='#94a3b8', font=font_subtitle, anchor='mm')
    draw.text((canvas_w // 2, 140), f'Всего в каталоге: {sum(len(items) for _, items, _ in sections)} уникальных существ и персонажей', fill='#38bdf8', font=font_subtitle, anchor='mm')

    cur_y = 220
    
    for title, items, cols in sections:
        # Section Header Banner
        sec_bar_w = canvas_w - 120
        draw.rectangle([(60, cur_y), (60 + sec_bar_w, cur_y + 44)], fill='#161f33', outline='#3b82f6', width=2)
        draw.text((80, cur_y + 22), title, fill='#fde047', font=font_section, anchor='lm')
        draw.text((60 + sec_bar_w - 20, cur_y + 22), f'{len(items)} шт.', fill='#93c5fd', font=font_section, anchor='rm')
        
        cur_y += 64
        
        # Grid items
        grid_total_w = cols * card_w + (cols - 1) * card_margin_x
        start_x = (canvas_w - grid_total_w) // 2
        
        for idx, entry in enumerate(items):
            col = idx % cols
            row = idx // cols
            cx = start_x + col * (card_w + card_margin_x)
            cy = cur_y + row * (card_h + card_margin_y)
            
            # Card Background
            border_col = '#f59e0b' if entry.in_game else '#2a3b5c'
            bg_col = '#182238' if entry.in_game else '#0f172a'
            draw.rectangle([(cx, cy), (cx + card_w, cy + card_h)], fill=bg_col, outline=border_col, width=2 if entry.in_game else 1)
            
            # Sprite Box (110x110)
            box_x = cx + 12
            box_y = cy + 12
            box_size = card_h - 24
            draw.rectangle([(box_x, box_y), (box_x + box_size, box_y + box_size)], fill='#060912', outline='#1e293b', width=1)
            
            # Scale Sprite (3x Nearest Neighbor)
            spr = entry.image
            # Center crop if too large or non-square
            sw, sh = spr.size
            scale_factor = 3
            if max(sw, sh) > 40:
                scale_factor = 2
            elif max(sw, sh) <= 16:
                scale_factor = 4
                
            scaled_w = sw * scale_factor
            scaled_h = sh * scale_factor
            
            # Fit inside box
            if scaled_w > box_size - 8 or scaled_h > box_size - 8:
                fit_scale = min((box_size - 8) / sw, (box_size - 8) / sh)
                scaled_w = int(sw * fit_scale)
                scaled_h = int(sh * fit_scale)
                
            scaled_spr = spr.resize((scaled_w, scaled_h), Image.Resampling.NEAREST)
            
            # Paste centered in sprite box
            paste_x = box_x + (box_size - scaled_w) // 2
            paste_y = box_y + (box_size - scaled_h) // 2
            canvas.alpha_composite(scaled_spr, (paste_x, paste_y))
            
            # Text Details on Right
            tx = box_x + box_size + 14
            ty = cy + 18
            
            # In-Game Badge
            if entry.in_game:
                badge_w = 70
                badge_h = 16
                draw.rectangle([(tx, ty), (tx + badge_w, ty + badge_h)], fill='#78350f', outline='#f59e0b', width=1)
                draw.text((tx + badge_w // 2, ty + badge_h // 2), 'В ИГРЕ', fill='#fef08a', font=font_badge, anchor='mm')
                ty += 24
                
            # Russian Name (Bold)
            draw.text((tx, ty), entry.name_ru, fill='#ffffff', font=font_card_name, anchor='lt')
            ty += 22
            
            # English Name
            draw.text((tx, ty), entry.name_en, fill='#94a3b8', font=font_card_sub, anchor='lt')
            ty += 20
            
            # Role (if active)
            if entry.role:
                draw.text((tx, ty), entry.role, fill='#4ade80', font=font_card_sub, anchor='lt')
                ty += 18
                
            # Source Pack
            draw.text((tx, cy + card_h - 22), f'Пак: {entry.pack_name}', fill='#38bdf8', font=font_card_sub, anchor='lt')

        rows = (len(items) + cols - 1) // cols
        cur_y += rows * (card_h + card_margin_y) + section_padding_y

    print(f'Saving composite image to {DESKTOP_PATH}...')
    canvas.convert('RGB').save(DESKTOP_PATH, 'PNG', quality=95)
    print('SUCCESS!')

if __name__ == '__main__':
    main()
