import json
import os
import subprocess
from PIL import Image

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    temp_json = os.path.join(root_dir, '.lvl1_export.json')
    
    # 1. Export level data from game code
    cmd = f'npx tsx -e \'import {{ buildLevel1 }} from "./src/world/level1"; import fs from "fs"; fs.writeFileSync("{temp_json}", JSON.stringify(buildLevel1(1)));\''
    subprocess.run(cmd, shell=True, check=True, cwd=root_dir)
    
    with open(temp_json, 'r') as f:
        lvl = json.load(f)
    
    if os.path.exists(temp_json):
        os.remove(temp_json)
        
    tileset_path = os.path.join(root_dir, 'public/assets/tiles-biome.png')
    tiles = Image.open(tileset_path)
    
    cols = lvl['cols']
    rows = lvl['rows']
    tile_size = 32
    
    map_img = Image.new('RGBA', (cols * tile_size, rows * tile_size), (20, 20, 20, 255))
    
    # Render tiles
    for r in range(rows):
        for c in range(cols):
            tid = lvl['data'][r][c]
            t = tiles.crop((tid * tile_size, 0, (tid + 1) * tile_size, tile_size))
            map_img.paste(t, (c * tile_size, r * tile_size))
            
    # Load and render props
    props_cache = {}
    
    def get_asset_img(filename):
        if filename in props_cache:
            return props_cache[filename]
        path = os.path.join(root_dir, 'public/assets', filename)
        if os.path.exists(path):
            img = Image.open(path).convert('RGBA')
            props_cache[filename] = img
            return img
        return None

    def get_prop_img(key):
        filename = key.replace('tex-', '') + '.png'
        return get_asset_img(filename)

    # Render trees
    for tree in lvl.get('trees', []):
        fn = 'tree_pine.png' if tree.get('kind') == 'pine' else 'tree_oak.png'
        img = get_asset_img(fn)
        if img:
            x = int(tree['col'] * tile_size + tile_size / 2 - img.width / 2)
            y = int(tree['row'] * tile_size + tile_size - img.height)
            map_img.paste(img, (x, y), img)

    # Render decorations
    for dec in lvl.get('decorations', []):
        img = get_prop_img(dec['key'])
        if img:
            scale = dec.get('scale', 1.0)
            if scale != 1.0:
                img = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.NEAREST)
            x = int(dec['col'] * tile_size + tile_size / 2 - img.width / 2)
            y = int(dec['row'] * tile_size + tile_size - img.height)
            map_img.paste(img, (x, y), img)

    # Save output to Desktop
    desktop_file = os.path.expanduser('~/Desktop/emberdeep_level1_preview.png')
    map_img.save(desktop_file)
    print(f'✅ Карта уровня успешно сохранена на рабочий стол: {desktop_file}')

if __name__ == '__main__':
    main()
