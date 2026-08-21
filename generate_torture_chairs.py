import os
import math
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Set up output directories
DESKTOP_DIR = "/Users/sergei/Desktop/Torture_Chairs_Pixel_Art"
os.makedirs(DESKTOP_DIR, exist_ok=True)
os.makedirs(os.path.join(DESKTOP_DIR, "PNG_1x_Native"), exist_ok=True)
os.makedirs(os.path.join(DESKTOP_DIR, "PNG_4x_HD"), exist_ok=True)
os.makedirs(os.path.join(DESKTOP_DIR, "PNG_8x_UltraHD"), exist_ok=True)
os.makedirs(os.path.join(DESKTOP_DIR, "SpriteSheets"), exist_ok=True)
os.makedirs(os.path.join(DESKTOP_DIR, "Showcase"), exist_ok=True)

# Also prepare game asset copy
GAME_ASSETS_DIR = "/Users/sergei/Documents/rogalik_nikita/public/assets"

print("Directories initialized successfully.")
