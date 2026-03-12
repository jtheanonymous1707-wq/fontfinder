from pathlib import Path
from PIL import ImageFont
import os

FONTS_DIR = Path("../fonts")
bad = []

if not FONTS_DIR.exists():
    print(f"❌ Error: Fonts directory {FONTS_DIR} does not exist.")
    exit(1)

for ttf in FONTS_DIR.glob("*.ttf"):
    try:
        ImageFont.truetype(str(ttf), 32)
    except Exception as e:
        print(f"❌ Bad font: {ttf.name} — {e}")
        bad.append(ttf)

# Remove bad files
for f in bad:
    os.remove(f)

print(f"\n✅ Verified. Removed {len(bad)} bad files.")
print(f"   Valid fonts: {len(list(FONTS_DIR.glob('*.ttf')))}")
