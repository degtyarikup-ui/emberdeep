#!/usr/bin/env python3
"""
Extracts 100% authentic, un-collaged sprites directly from source asset packs
with transparency, and saves them to public/assets/structures/.
"""

import os
from PIL import Image

OUT_DIR = "public/assets/structures"
os.makedirs(OUT_DIR, exist_ok=True)

def make_transparent_black(crop_img):
    datas = crop_img.getdata()
    new_data = []
    for item in datas:
        if item[0] == 0 and item[1] == 0 and item[2] == 0:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
    crop_img.putdata(new_data)
    return crop_img

# 1. Anvil Station (64x48 px = 2x1.5 tiles)
im_anv = Image.open("vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Anvil/Anvil.png").convert("RGBA")
anvil = im_anv.crop((0, 32, 64, 80))
anvil.save(os.path.join(OUT_DIR, "prop_station_anvil.png"))
print("Saved prop_station_anvil.png")

# 2. Brick Furnace (32x48 px = 1x1.5 tiles)
im_fur = Image.open("vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Furnace/Bricks_01-Sheet.png").convert("RGBA")
furnace = im_fur.crop((0, 0, 32, 48))
furnace.save(os.path.join(OUT_DIR, "prop_station_furnace.png"))
print("Saved prop_station_furnace.png")

# 3. Alchemy Table (48x64 px = 1.5x2 tiles)
im_alch = Image.open("vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Alchemy/Alchemy_Table_02-Sheet.png").convert("RGBA")
alchemy = im_alch.crop((0, 0, 48, 64))
alchemy.save(os.path.join(OUT_DIR, "prop_station_alchemy.png"))
print("Saved prop_station_alchemy.png")

# 4. Spit Roast Campfire (48x48 px = 1.5x1.5 tiles)
im_cook = Image.open("vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Cooking Station/Cooking Station.png").convert("RGBA")
spit = im_cook.crop((68, 8, 124, 64))
# Fit into clean 48x48 canvas
spit_canvas = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
spit_canvas.paste(spit.resize((46, 46), Image.NEAREST), (1, 1))
spit_canvas.save(os.path.join(OUT_DIR, "prop_station_spit_fire.png"))
print("Saved prop_station_spit_fire.png")

# 5. Butcher Table (48x48 px = 1.5x1.5 tiles)
im_butcher = Image.open("vendor/pixel-crawler/source/Pixel Crawler - Free Pack/Environment/Structures/Stations/Cooking Station/Butchery/Butchery_02.png").convert("RGBA")
butcher = im_butcher.crop((12, 16, 52, 56))
butcher_canvas = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
butcher_canvas.paste(butcher.resize((44, 44), Image.NEAREST), (2, 2))
butcher_canvas.save(os.path.join(OUT_DIR, "prop_station_butcher.png"))
print("Saved prop_station_butcher.png")

# 6. Stone Arch Gateway (48x48 px = 1.5x1.5 tiles)
im_dungeon = Image.open("vendor/0x72-dungeon-tileset-ii/source/0x72_DungeonTilesetII_v1.7/atlas_walls_high-16x32.png").convert("RGBA")
gate = im_dungeon.crop((264, 72, 308, 128))
gate_canvas = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
gate_canvas.paste(gate.resize((44, 48), Image.NEAREST), (2, 0))
gate_canvas.save(os.path.join(OUT_DIR, "prop_station_stone_arch.png"))
print("Saved prop_station_stone_arch.png")

# 7. Sarcophagus (32x48 px = 1x1.5 tiles)
im_32 = Image.open("vendor/32rogues/source/32rogues/tiles.png").convert("RGBA")
sarc = im_32.crop((96, 736, 128, 776))
sarc = make_transparent_black(sarc)
sarc_canvas = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
sarc_canvas.paste(sarc, (0, 4), sarc)
sarc_canvas.save(os.path.join(OUT_DIR, "prop_station_sarcophagus.png"))
print("Saved prop_station_sarcophagus.png")

# 8. Wooden Coffin (32x48 px = 1x1.5 tiles)
coffin = im_32.crop((0, 736, 32, 776))
coffin = make_transparent_black(coffin)
coffin_canvas = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
coffin_canvas.paste(coffin, (0, 4), coffin)
coffin_canvas.save(os.path.join(OUT_DIR, "prop_station_coffin.png"))
print("Saved prop_station_coffin.png")

# 9. Log Pile (32x32 px = 1x1 tile)
log_pile = im_32.crop((192, 544, 224, 576))
log_pile = make_transparent_black(log_pile)
log_pile.save(os.path.join(OUT_DIR, "prop_station_log_pile.png"))
print("Saved prop_station_log_pile.png")

# Replace old crooked prop_cabin.png with anvil station so any legacy map reference looks great
anvil.save("public/assets/prop_cabin.png")
print("Updated public/assets/prop_cabin.png with clean station.")

print("All authentic structure sprites extracted successfully!")
