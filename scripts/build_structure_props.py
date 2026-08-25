#!/usr/bin/env python3
"""
Generates 10 clean, beautifully aligned multi-tile structure sprites
for Emberdeep using official Pixel Crawler, 32rogues, and 0x72 assets.
All backgrounds are completely transparent.
"""

import os
from PIL import Image

OUT_DIR = "public/assets/structures"
os.makedirs(OUT_DIR, exist_ok=True)

# Sources
ROOFS = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Buildings/Roofs.png"
WALLS = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Buildings/Walls.png"
PROPS = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Buildings/Props.png"
FURNACE_BRICK = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Furnace/Bricks_01-Sheet.png"
ANVIL_STATIC = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Anvil/Anvil.png"
ALCHEMY_SHEET = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Alchemy/Alchemy_Table_02-Sheet.png"
BONFIRE_SHEET = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Bonfire/Bonfire_01-Sheet.png"
COOKING_STATION = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Cooking Station/Cooking Station.png"
BUTCHERY_02 = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Cooking Station/Butchery/Butchery_02.png"
FURNITURE = "vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Props/Static/Furniture.png"
TILES_32 = "vendor/32rogues/source/32rogues/tiles.png"
DUNGEON_WALLS = "vendor/0x72-dungeon-tileset-ii/source/0x72_DungeonTilesetII_v1.7/atlas_walls_high-16x32.png"

img_roofs = Image.open(ROOFS).convert("RGBA")
img_walls = Image.open(WALLS).convert("RGBA")
img_props = Image.open(PROPS).convert("RGBA")
img_furnace = Image.open(FURNACE_BRICK).convert("RGBA")
img_anvil = Image.open(ANVIL_STATIC).convert("RGBA")
img_alchemy = Image.open(ALCHEMY_SHEET).convert("RGBA")
img_bonfire = Image.open(BONFIRE_SHEET).convert("RGBA")
img_cooking = Image.open(COOKING_STATION).convert("RGBA")
img_butchery = Image.open(BUTCHERY_02).convert("RGBA")
img_furniture = Image.open(FURNITURE).convert("RGBA")
img_tiles_32 = Image.open(TILES_32).convert("RGBA")
img_dungeon_walls = Image.open(DUNGEON_WALLS).convert("RGBA")


# 1. prop_wood_cabin.png (96x96 px = 3x3 tiles)
def build_wood_cabin():
    canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))

    # Stone chimney on roof right
    chimney = img_props.crop((8, 73, 27, 126)).resize((18, 42), Image.NEAREST)
    canvas.paste(chimney, (68, 2), chimney)

    # Log Wall facade: (0, 8, 96, 56)
    wall = img_walls.crop((0, 8, 96, 56)).resize((88, 54), Image.NEAREST)
    canvas.paste(wall, (4, 40), wall)

    # Wooden Roof: (0, 6, 128, 94)
    roof = img_roofs.crop((0, 6, 128, 94)).resize((94, 52), Image.NEAREST)
    canvas.paste(roof, (1, 4), roof)

    # Centered Arched Door
    door = img_props.crop((1, 23, 31, 64)).resize((26, 36), Image.NEAREST)
    canvas.paste(door, (48, 58), door)

    # Window with glowing glass
    window = img_props.crop((37, 96, 59, 124)).resize((20, 22), Image.NEAREST)
    canvas.paste(window, (16, 56), window)

    # Planter box under window
    planter = img_props.crop((17, 158, 45, 172)).resize((22, 10), Image.NEAREST)
    canvas.paste(planter, (15, 78), planter)

    return canvas


# 2. prop_stone_ruins_arch.png (96x96 px = 3x3 tiles)
def build_stone_ruins_arch():
    canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))

    # Solid stone wall facade on top: (64, 0, 112, 32)
    top_wall = img_dungeon_walls.crop((64, 0, 112, 32)).resize((88, 30), Image.NEAREST)
    canvas.paste(top_wall, (4, 6), top_wall)

    # Arched stone doorway seamlessly below wall: (328, 72, 372, 128)
    arch = img_dungeon_walls.crop((328, 72, 372, 128)).resize((64, 64), Image.NEAREST)
    canvas.paste(arch, (16, 32), arch)

    # Stone pillars on left & right: (240, 64, 256, 96)
    pillar_l = img_dungeon_walls.crop((240, 64, 256, 96)).resize((18, 64), Image.NEAREST)
    pillar_r = pillar_l.transpose(Image.FLIP_LEFT_RIGHT)
    canvas.paste(pillar_l, (4, 32), pillar_l)
    canvas.paste(pillar_r, (74, 32), pillar_r)

    # Hanging ivy on left pillar
    ivy = img_dungeon_walls.crop((304, 0, 320, 32)).resize((16, 28), Image.NEAREST)
    canvas.paste(ivy, (6, 34), ivy)

    return canvas


# 3. prop_blacksmith_forge.png (96x64 px = 3x2 tiles)
def build_blacksmith_forge():
    canvas = Image.new("RGBA", (96, 64), (0, 0, 0, 0))

    # Brick Furnace (32x48) on left
    furnace = img_furnace.crop((0, 0, 32, 48)).resize((38, 56), Image.NEAREST)
    canvas.paste(furnace, (2, 4), furnace)

    # Anvil Station with tools & water bucket (from Anvil.png: (0, 32, 64, 80))
    anvil_group = img_anvil.crop((0, 32, 64, 80)).resize((54, 42), Image.NEAREST)
    canvas.paste(anvil_group, (40, 20), anvil_group)

    # Firewood log pile next to furnace
    logs = img_tiles_32.crop((192, 512, 224, 544)).resize((18, 16), Image.NEAREST)
    canvas.paste(logs, (38, 6), logs)

    return canvas


# 4. prop_alchemy_lab.png (96x64 px = 3x2 tiles)
def build_alchemy_lab():
    canvas = Image.new("RGBA", (96, 64), (0, 0, 0, 0))

    # Alchemy Table Station (48x44 from frame 0)
    alch = img_alchemy.crop((0, 20, 48, 64)).resize((60, 52), Image.NEAREST)
    canvas.paste(alch, (4, 8), alch)

    # Potion jars and sacks from 32rogues
    pot1 = img_tiles_32.crop((64, 512, 96, 544)).resize((22, 22), Image.NEAREST)
    canvas.paste(pot1, (68, 38), pot1)

    pot2 = img_tiles_32.crop((96, 512, 128, 544)).resize((22, 22), Image.NEAREST)
    canvas.paste(pot2, (68, 14), pot2)

    return canvas


# 5. prop_hunter_camp.png (96x96 px = 3x3 tiles)
def build_hunter_camp():
    canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))

    # A-Frame Hunter Tent (Warm Canvas Cloth)
    tent_w, tent_h = 56, 52
    tent_half = img_roofs.crop((0, 6, 64, 94)).resize((tent_w // 2, tent_h), Image.NEAREST)
    canvas.paste(tent_half, (6, 10), tent_half)
    canvas.paste(tent_half.transpose(Image.FLIP_LEFT_RIGHT), (6 + tent_w // 2, 10), tent_half.transpose(Image.FLIP_LEFT_RIGHT))

    # Tent entrance flap
    door = img_props.crop((1, 23, 31, 64)).resize((18, 26), Image.NEAREST)
    canvas.paste(door, (25, 36), door)

    # Spit roast campfire (from Cooking Station)
    spit = img_cooking.crop((64, 0, 128, 64)).resize((44, 44), Image.NEAREST)
    canvas.paste(spit, (50, 48), spit)

    # Supply crate
    crate = img_tiles_32.crop((0, 512, 32, 544)).resize((18, 18), Image.NEAREST)
    canvas.paste(crate, (6, 68), crate)

    return canvas


# 6. prop_crypt_tomb.png (64x96 px = 2x3 tiles)
def build_crypt_tomb():
    canvas = Image.new("RGBA", (64, 96), (0, 0, 0, 0))

    # Stone Crypt Wall & Arch (from atlas_walls_high)
    crypt_wall = img_dungeon_walls.crop((64, 0, 112, 32)).resize((60, 32), Image.NEAREST)
    canvas.paste(crypt_wall, (2, 6), crypt_wall)

    # Dark arched doorway seamlessly below: (328, 72, 372, 128)
    doorway = img_dungeon_walls.crop((328, 72, 372, 128)).resize((52, 60), Image.NEAREST)
    canvas.paste(doorway, (6, 34), doorway)

    # Sarcophagus in the center (from 32rogues: (96, 608, 128, 640))
    sarcophagus = img_tiles_32.crop((96, 608, 128, 640)).resize((26, 32), Image.NEAREST)
    canvas.paste(sarcophagus, (19, 52), sarcophagus)

    return canvas


# 7. prop_druid_henge.png (96x96 px = 3x3 tiles)
def build_druid_henge():
    canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))

    # Standing Stone Columns (Left & Right) from atlas_walls_high (240, 64, 256, 96)
    col_l = img_dungeon_walls.crop((240, 64, 256, 96)).resize((24, 64), Image.NEAREST)
    col_r = col_l.transpose(Image.FLIP_LEFT_RIGHT)

    canvas.paste(col_l, (8, 26), col_l)
    canvas.paste(col_r, (64, 26), col_r)

    # Massive Horizontal Capstone on top (from atlas_walls_high (64, 0, 112, 32))
    capstone = img_dungeon_walls.crop((64, 0, 112, 32)).resize((88, 26), Image.NEAREST)
    canvas.paste(capstone, (4, 10), capstone)

    # Altar Basin / Fountain in center
    altar = img_dungeon_walls.crop((240, 0, 272, 32)).resize((34, 34), Image.NEAREST)
    canvas.paste(altar, (31, 52), altar)

    return canvas


# 8. prop_tavern_bar.png (96x64 px = 3x2 tiles)
def build_tavern_bar():
    canvas = Image.new("RGBA", (96, 64), (0, 0, 0, 0))

    # Wooden Shelf with bottles at back
    shelf = img_dungeon_walls.crop((64, 0, 112, 32)).resize((84, 22), Image.NEAREST)
    canvas.paste(shelf, (6, 4), shelf)

    # Bar Counter (sturdy wooden table from Furniture)
    counter = img_furniture.crop((0, 0, 80, 26)).resize((86, 32), Image.NEAREST)
    canvas.paste(counter, (5, 24), counter)

    # Beer barrel on counter
    barrel = img_tiles_32.crop((128, 512, 160, 544)).resize((20, 22), Image.NEAREST)
    canvas.paste(barrel, (66, 14), barrel)

    # Wine bottles on counter
    pot = img_tiles_32.crop((64, 512, 96, 544)).resize((16, 16), Image.NEAREST)
    canvas.paste(pot, (14, 16), pot)

    # Wooden barstools in front
    stool = img_props.crop((17, 158, 45, 172)).resize((22, 12), Image.NEAREST)
    canvas.paste(stool, (14, 48), stool)
    canvas.paste(stool, (44, 48), stool)

    return canvas


# 9. prop_feast_table.png (96x64 px = 3x2 tiles)
def build_feast_table():
    canvas = Image.new("RGBA", (96, 64), (0, 0, 0, 0))

    # Solid oak dining table from Furniture: (0, 0, 80, 26)
    table = img_furniture.crop((0, 0, 80, 26)).resize((84, 34), Image.NEAREST)
    canvas.paste(table, (6, 16), table)

    # Food / Steaks on table from Butchery: (12, 16, 52, 56)
    steak = img_butchery.crop((12, 16, 52, 56)).resize((32, 28), Image.NEAREST)
    canvas.paste(steak, (32, 8), steak)

    # Wooden benches in front
    bench = img_props.crop((17, 158, 45, 172)).resize((30, 12), Image.NEAREST)
    canvas.paste(bench, (10, 48), bench)
    canvas.paste(bench, (56, 48), bench)

    return canvas


# 10. prop_field_kitchen.png (96x64 px = 3x2 tiles)
def build_field_kitchen():
    canvas = Image.new("RGBA", (96, 64), (0, 0, 0, 0))

    # BBQ Grill with coals & sizzling meat (from Cooking Station)
    grill = img_cooking.crop((192, 0, 288, 64)).resize((52, 42), Image.NEAREST)
    canvas.paste(grill, (4, 18), grill)

    # Butcher table with cleaver & steaks
    butcher = img_butchery.crop((12, 16, 52, 56)).resize((36, 38), Image.NEAREST)
    canvas.paste(butcher, (56, 22), butcher)

    return canvas


# Build and save all structures
structures = {
    "prop_wood_cabin.png": build_wood_cabin(),
    "prop_stone_ruins_arch.png": build_stone_ruins_arch(),
    "prop_blacksmith_forge.png": build_blacksmith_forge(),
    "prop_alchemy_lab.png": build_alchemy_lab(),
    "prop_hunter_camp.png": build_hunter_camp(),
    "prop_crypt_tomb.png": build_crypt_tomb(),
    "prop_druid_henge.png": build_druid_henge(),
    "prop_tavern_bar.png": build_tavern_bar(),
    "prop_feast_table.png": build_feast_table(),
    "prop_field_kitchen.png": build_field_kitchen(),
}

for filename, img in structures.items():
    dest = os.path.join(OUT_DIR, filename)
    img.save(dest)
    print(f"Saved {dest} ({img.size[0]}x{img.size[1]})")

# Also replace old crooked prop_cabin.png in public/assets/
cabin_main = os.path.join("public/assets", "prop_cabin.png")
structures["prop_wood_cabin.png"].save(cabin_main)
print(f"Overwrote {cabin_main} with clean symmetrical cabin sprite.")

print("All 10 structure sprites generated successfully!")
