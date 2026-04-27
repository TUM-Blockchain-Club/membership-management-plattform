import os
import json
import logging
import requests
from io import BytesIO
from typing import Dict, Any, Tuple
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from supabase import create_client, Client
from dotenv import load_dotenv

# Initialize environment and logging
load_dotenv()
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# ==========================================
# CONFIGURATION BLOCK
# ==========================================

# Database & Storage
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
STORAGE_BUCKET_NAME = os.getenv("STORAGE_BUCKET")

# File System Paths
ASSETS_DIR = Path("assets")
OUTPUT_IMG_DIR = Path("output/images")
OUTPUT_JSON_DIR = Path("output/json")
FONT_PATH = "fonts/Raleway-Regular.ttf"

# Visual Settings - Font Sizes
FONT_SIZE_BATCH = 60    # Large number for inside the hexagon
FONT_SIZE_LINE1 = 28    # Nickname
FONT_SIZE_LINE2 = 28    # Degree + Uni
FONT_SIZE_LINE3 = 28    # Programs/Winner

# Layout Coordinates (X, Y)
# Tweak these precisely to match your canvas dimensions
POS_AVATAR = (100, 150)       
SIZE_AVATAR = (600, 700)      

# X, Y coordinate for the absolute center of the overlay's hexagon.
# Text drawn here uses anchor="mm" to stay perfectly centered.
POS_HEXAGON_CENTER = (104, 559)

# Bottom Text Coordinates (X, Y)
#POS_TEXT_LINE1 = (172, 629)   # Nickname
#POS_TEXT_LINE2 = (172, 706)   # Mathematics TUM
#POS_TEXT_LINE3 = (172, 784)   # Hackatum 2023 Winner
#POS_ICON_LINE1 = (103, 629)
#POS_ICON_LINE2 = (103, 706)
#POS_ICON_LINE3 = (103, 784)

# Bottom Text Coordinates (X, Y)
POS_TEXT_LINE1 = (172, 629)   # Nickname
POS_TEXT_LINE2 = (172, 706)   # Mathematics TUM
POS_TEXT_LINE3 = (172, 784)   # Hackatum 2023 Winner
POS_ICON_LINE1 = (82, 629)  # Hexagon icon for Nickname
POS_ICON_LINE2 = (82, 706) # University icon for Degree + Uni
POS_ICON_LINE3 = (82, 784) # Cube icon for Programs/Winner

# Department Mapping
DEPT_MAP = {
    "Marketing": "overlay_marketing.png",
    "IT": "overlay_it&dev.png",
    "IT & Dev": "overlay_it&dev.png",
    "Legal": "overlay_legal&finance.png",
    "Education": "overlay_education.png",
    "Industry": "overlay_industry.png",
    "Board": "overlay_board.png",
    "Web3 Talents": "overlay_web3_talents.png",
    "External Relations": "overlay_external_relations.png"
}

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def fetch_avatar(member: Dict[str, Any]) -> Image.Image:
    """Fetches avatar from Supabase Storage or returns a transparent placeholder."""
    image_path = member.get('Picture')
    
    if not image_path or image_path == "NULL":
        return Image.new('RGBA', SIZE_AVATAR, (0, 0, 0, 0))

    clean_path = image_path.strip().lstrip('/')
    full_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET_NAME}/{clean_path}"

    try:
        response = requests.get(full_url, timeout=10)
        response.raise_for_status()
        return Image.open(BytesIO(response.content)).convert("RGBA")
    except Exception as e:
        logger.error(f"Failed to download image ({clean_path}): {e}")
        return Image.new('RGBA', SIZE_AVATAR, (0, 0, 0, 0))

def crop_center_and_resize(img: Image.Image, target_size: Tuple[int, int]) -> Image.Image:
    """Perfectly center-crops and resizes the avatar without stretching."""
    img_ratio = img.width / img.height
    target_ratio = target_size[0] / target_size[1]

    if img_ratio > target_ratio:
        new_width = int(target_ratio * img.height)
        offset = (img.width - new_width) // 2
        img = img.crop((offset, 0, offset + new_width, img.height))
    else:
        new_height = int(img.width / target_ratio)
        offset = (img.height - new_height) // 2
        img = img.crop((0, offset, img.width, offset + new_height))

    return img.resize(target_size, Image.Resampling.LANCZOS)

def load_font_safely(size: int) -> ImageFont.FreeTypeFont:
    """Tries custom font -> Standard System Fonts -> PIL Default 10px."""
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except OSError:
        fallbacks = ["arial.ttf", "Arial.ttf", "helvetica.ttf", "Helvetica.ttf"]
        for fallback in fallbacks:
            try:
                return ImageFont.truetype(fallback, size)
            except OSError:
                continue
        logger.warning(f"All fonts failed. Using microscopic PIL default for size {size}.")
        return ImageFont.load_default()

# ==========================================
# CORE LOGIC
# ==========================================

def create_nft(member: Dict[str, Any]):
    # Safely extract raw data
    val_nickname = member.get('nickname')
    val_batch = member.get('batch')
    val_degree = member.get('Degree Program')
    val_uni = member.get('Uni')
    val_programs = member.get('Programs')
    val_dept = member.get('Department') or 'Board'

    # Process and sanitize text (Handle NULLs)
    text_nickname = str(val_nickname).upper() if val_nickname else "NEW MEMBER"
    text_batch = str(val_batch).strip() if val_batch is not None else ""
    text_programs = str(val_programs).upper() if val_programs else ""
    
    # Combine Degree and Uni
    degree_str = str(val_degree).upper() if val_degree else ""
    uni_str = str(val_uni).upper() if val_uni else ""
    text_degree_uni = f"{degree_str} {uni_str}".strip()

    logger.info(f"Processing NFT for: {text_nickname}")

    # --- LAYER 1: BASE BACKGROUND ---
    try:
        base1_path = ASSETS_DIR / "base1.png"
        canvas = Image.open(base1_path).convert("RGBA")
    except FileNotFoundError:
        logger.critical("Layer 1 missing: assets/base1.png")
        return

    # --- LAYER 2: AVATAR ---
    raw_avatar = fetch_avatar(member)
    processed_avatar = crop_center_and_resize(raw_avatar, SIZE_AVATAR)
    # The 3rd argument acts as the mask, preserving avatar transparency
    canvas.paste(processed_avatar, POS_AVATAR, processed_avatar)

    # --- LAYER 3: BASE 2 (MASK / TEXT BACKGROUND) ---
    try:
        base2_path = ASSETS_DIR / "base2.png"
        base2 = Image.open(base2_path).convert("RGBA")
        
        # Calculate dynamic bottom coordinate
        base2_y_pos = canvas.height - base2.height
        canvas.paste(base2, (0, base2_y_pos), base2)
    except FileNotFoundError:
        logger.critical("Layer 3 missing: assets/base2.png")
        return

    # --- LAYER 4: DEPARTMENT OVERLAY ---
    overlay_filename = DEPT_MAP.get(val_dept)
    if overlay_filename:
        overlay_path = ASSETS_DIR / overlay_filename
        if overlay_path.exists():
            overlay = Image.open(overlay_path).convert("RGBA")
            # Paste at 0,0 spanning the whole canvas
            canvas.paste(overlay, (0, 0), overlay)
        else:
            logger.warning(f"Overlay missing: {overlay_filename}")
# --- LAYER 5: TEXT DATA & ICONS ---
    draw = ImageDraw.Draw(canvas)
    
    font_batch = load_font_safely(FONT_SIZE_BATCH)
    font_line1 = load_font_safely(FONT_SIZE_LINE1)
    font_line2 = load_font_safely(FONT_SIZE_LINE2)
    font_line3 = load_font_safely(FONT_SIZE_LINE3)

    # Draw Batch Number
    if text_batch:
        draw.text(POS_HEXAGON_CENTER, text_batch, font=font_batch, fill="#5EA5F6", anchor="mm")

   # Helper function to crop empty space, resize, and paste icons
    def paste_icon(filename, position):
        icon_path = ASSETS_DIR / filename
        
        if not icon_path.exists():
            logger.error(f"❌ MISSING: {filename}")
            return
            
        icon = Image.open(icon_path).convert("RGBA")
        
        # 1. THE MAGIC FIX: Crop out all the empty transparent padding
        bbox = icon.getbbox()
        if bbox:
            icon = icon.crop(bbox)
            
        # 2. Set the actual visual size of the icon (Tweak these numbers if needed!)
        target_size = (45, 45) 
        
        # 3. Scale the cropped icon perfectly
        icon = icon.resize(target_size, Image.Resampling.LANCZOS)
        
        # 4. Calculate exact integer coordinates (centering it vertically)
        adjusted_pos = (int(position[0]), int(position[1] - (target_size[1] / 2)))
        
        # 5. Paste it
        canvas.paste(icon, adjusted_pos, icon)

    # Draw Line 1 (Nickname + Hexagon)
    if text_nickname and text_nickname != "NEW MEMBER":
        paste_icon("icon_hexagon.png", POS_ICON_LINE1)
        draw.text(POS_TEXT_LINE1, text_nickname, font=font_line1, fill="white", anchor="lm")

    # Draw Line 2 (Degree/Uni + Bank Building)
    if text_degree_uni:
        paste_icon("icon_uni.png", POS_ICON_LINE2)
        draw.text(POS_TEXT_LINE2, text_degree_uni, font=font_line2, fill="white", anchor="lm")

    # Draw Line 3 (Programs + 3D Cube)
    if text_programs:
        paste_icon("icon_cube.png", POS_ICON_LINE3)
        
        # Break the line before "WINNER" to match the reference design
        if " WINNER" in text_programs:
            text_programs = text_programs.replace(" WINNER", "\nWINNER")
            
        # multiline_text handles the \n line break beautifully
        draw.multiline_text(
            POS_TEXT_LINE3, 
            text_programs, 
            font=font_line3, 
            fill="white", 
            anchor="lm", 
            align="left", 
            spacing=8
        )
    # --- SAVE IMAGE ---
    safe_id = member.get('id') or text_nickname.replace(" ", "_")
    filename = f"member_{safe_id}"
    
    img_save_path = OUTPUT_IMG_DIR / f"{filename}.png"
    canvas.save(img_save_path)

    # --- GENERATE & SAVE METADATA JSON ---
    metadata = {
        "name": f"TUM Blockchain - {text_nickname}",
        "description": f"Official TUM Blockchain Club Membership NFT.",
        "image": f"ipfs://PLACEHOLDER/{filename}.png",
        "attributes": [
            {"trait_type": "Nickname", "value": text_nickname},
            {"trait_type": "Department", "value": val_dept},
            {"trait_type": "Batch", "value": text_batch if text_batch else "Unknown"},
            {"trait_type": "Degree Program", "value": degree_str},
            {"trait_type": "University", "value": uni_str},
            {"trait_type": "Programs", "value": text_programs}
        ]
    }

    json_save_path = OUTPUT_JSON_DIR / f"{filename}.json"
    with open(json_save_path, "w") as f:
        json.dump(metadata, f, indent=4)


# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    if not SUPABASE_KEY:
        logger.critical("Secrets missing. Please check your .env file.")
        exit(1)

    OUTPUT_IMG_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON_DIR.mkdir(parents=True, exist_ok=True)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    try:
        logger.info("Fetching members from Supabase...")
        response = supabase.table("Members").select("*").eq("nft_consent", True).execute()
        members = response.data
        
        logger.info(f"Found {len(members)} members with NFT consent.")
        
        for member in members:
            create_nft(member)
            
        logger.info("Batch generation complete.")

    except Exception as e:
        logger.error(f"Database or Runtime Error: {e}")