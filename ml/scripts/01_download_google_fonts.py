import os
import json
import requests
from pathlib import Path
from tqdm import tqdm

GOOGLE_FONTS_API_KEY = "AIzaSyDNyL-f1PcLdyYwhMvWNJ2nL8n9tsN-uZQ"  # Free from console.cloud.google.com
FONTS_DIR = Path("../fonts")
FONTS_DIR.mkdir(parents=True, exist_ok=True)

# Categories to target — cover the full design spectrum
TARGET_CATEGORIES = [
    "serif", "sans-serif", "display", "handwriting", "monospace"
]

def fetch_font_list() -> list[dict]:
    """Fetch all Google Fonts sorted by popularity."""
    url = f"https://www.googleapis.com/webfonts/v1/webfonts?key={GOOGLE_FONTS_API_KEY}&sort=popularity"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    return r.json()["items"]

def download_font_file(font: dict, target_dir: Path) -> bool:
    """Download the Regular variant of a font."""
    family = font["family"]
    files = font.get("files", {})

    # Try variants in priority order
    for variant in ["regular", "400", "500", "700"]:
        if variant in files:
            url = files[variant].replace("http://", "https://")
            # Build a clean slug from the family name
            slug = family.lower().replace(" ", "-").replace("'", "")
            dest = target_dir / f"{slug}.ttf"

            if dest.exists():
                return True  # Already downloaded

            try:
                r = requests.get(url, timeout=20)
                r.raise_for_status()
                with open(dest, "wb") as f:
                    f.write(r.content)
                return True
            except Exception as e:
                print(f"  ⚠️  Failed {family}: {e}")
                return False

    return False

def main():
    if GOOGLE_FONTS_API_KEY == "YOUR_GOOGLE_FONTS_API_KEY":
        print("❌ Error: Please set GOOGLE_FONTS_API_KEY in the script.")
        return

    print("📡 Fetching Google Fonts list...")
    all_fonts = fetch_font_list()
    print(f"   Found {len(all_fonts)} fonts total")

    # Filter to target categories and take top fonts per category
    LIMIT_PER_CATEGORY = 40  # 40 × 5 categories = 200 fonts max
    selected = []
    counts = {cat: 0 for cat in TARGET_CATEGORIES}

    for font in all_fonts:
        cat = font.get("category", "").lower()
        if cat in counts and counts[cat] < LIMIT_PER_CATEGORY:
            selected.append(font)
            counts[cat] += 1

    print(f"\n📋 Selected {len(selected)} fonts:")
    for cat, count in counts.items():
        print(f"   {cat}: {count}")

    print(f"\n⬇️  Downloading to {FONTS_DIR}/ ...")
    success = 0
    fail = 0
    for font in tqdm(selected, desc="Downloading"):
        if download_font_file(font, FONTS_DIR):
            success += 1
        else:
            fail += 1

    # Save a manifest for reference
    manifest = [
        {
            "family": f["family"],
            "slug": f["family"].lower().replace(" ", "-").replace("'", ""),
            "category": f["category"],
        }
        for f in selected
    ]
    with open(FONTS_DIR / "_manifest.json", "w") as mf:
        json.dump(manifest, mf, indent=2)

    print(f"\n✅ Done. Success: {success}, Failed: {fail}")
    print(f"   Fonts saved to: {FONTS_DIR.resolve()}")

if __name__ == "__main__":
    main()
