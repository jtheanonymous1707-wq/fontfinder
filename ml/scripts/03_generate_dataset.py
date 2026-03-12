import os
import sys
import json
import random
import math
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
from tqdm import tqdm

# ─── Config ──────────────────────────────────────────────────────────────────
FONTS_DIR   = Path("../fonts")
OUTPUT_DIR  = Path("../dataset")
IMAGE_SIZE  = 64           # Final patch size fed to model
SAMPLES_PER_FONT = 500     # How many patches per font class
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# Word list — mix of lengths to exercise different letter combinations
WORD_LIST = [
    "Love", "Art", "Joy", "Flow", "Bold", "Soft",
    "Grace", "Wave", "Edge", "Form", "Echo",
    "Design", "Studio", "Create", "Beauty", "Modern",
    "Luxury", "Retro", "Serif", "Script", "Craft",
    "Elegant", "Minimal", "Digital", "Classic",
    "Typography", "Creative", "Designer", "Portfolio",
    "Handmade", "Boutique", "Signature",
    "LOVE", "ART", "BOLD", "STYLE", "DESIGN",
    "NewYork", "LaMode", "DeVille",
    "2025", "No1", "Vol3",
]

FONT_SIZES = [20, 24, 28, 32, 36, 42, 48, 56, 64, 72]

# ─── Augmentation Pipeline ────────────────────────────────────────────────────

def apply_gaussian_noise(img: np.ndarray, severity: float) -> np.ndarray:
    noise = np.random.normal(0, severity * 30, img.shape)
    return np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)

def apply_blur(img: Image.Image, severity: float) -> Image.Image:
    radius = severity * 2.0
    return img.filter(ImageFilter.GaussianBlur(radius=radius))

def apply_jpeg_compression(img: Image.Image, quality: int) -> Image.Image:
    import io
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    return Image.open(buf).copy()

def apply_perspective_warp(img: Image.Image, severity: float) -> Image.Image:
    w, h = img.size
    shift = int(severity * w * 0.1)

    src = [(0, 0), (w, 0), (w, h), (0, h)]
    dst = [
        (random.randint(0, shift), random.randint(0, shift)),
        (w - random.randint(0, shift), random.randint(0, shift)),
        (w - random.randint(0, shift), h - random.randint(0, shift)),
        (random.randint(0, shift), h - random.randint(0, shift)),
    ]

    def find_coeffs(pa, pb):
        matrix = []
        for p1, p2 in zip(pa, pb):
            matrix.append([p1[0], p1[1], 1, 0, 0, 0, -p2[0]*p1[0], -p2[0]*p1[1]])
            matrix.append([0, 0, 0, p1[0], p1[1], 1, -p2[1]*p1[0], -p2[1]*p1[1]])
        A = np.matrix(matrix, dtype=float)
        B = np.array(pb).reshape(8)
        res = np.dot(np.linalg.inv(A.T * A) * A.T, B)
        return np.array(res).reshape(8)

    try:
        coeffs = find_coeffs(dst, src)
        return img.transform(img.size, Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    except Exception:
        return img

def apply_brightness_contrast(img: np.ndarray, brightness: float, contrast: float) -> np.ndarray:
    arr = img.astype(np.float32)
    arr = (arr - 128) * contrast + 128 * brightness
    return np.clip(arr, 0, 255).astype(np.uint8)

def augment(img: Image.Image, augment_level: str) -> Image.Image:
    arr = np.array(img)
    brightness = random.uniform(0.85, 1.15)
    contrast = random.uniform(0.9, 1.1)
    arr = apply_brightness_contrast(arr, brightness, contrast)
    img = Image.fromarray(arr)

    if augment_level == "light":
        if random.random() < 0.2:
            arr = apply_gaussian_noise(np.array(img), 0.1)
            img = Image.fromarray(arr)
        return img

    if augment_level in ("medium", "heavy"):
        noise_severity = random.uniform(0.05, 0.25 if augment_level == "medium" else 0.5)
        if random.random() < 0.5:
            arr = apply_gaussian_noise(np.array(img), noise_severity)
            img = Image.fromarray(arr)
        if random.random() < 0.4:
            blur_severity = random.uniform(0.1, 0.4 if augment_level == "medium" else 0.8)
            img = apply_blur(img, blur_severity)
        if random.random() < 0.3:
            quality = random.randint(60 if augment_level == "heavy" else 75, 95)
            img = apply_jpeg_compression(img, quality)
        if augment_level == "heavy" and random.random() < 0.3:
            img = apply_perspective_warp(img, random.uniform(0.3, 0.8))
    return img

def render_font_patch(font_path: str, word: str, font_size: int, bg_color: int = 255, text_color: int = 0) -> Image.Image | None:
    try:
        font = ImageFont.truetype(font_path, font_size)
    except OSError:
        return None
    dummy = Image.new("L", (1, 1))
    draw = ImageDraw.Draw(dummy)
    bbox = draw.textbbox((0, 0), word, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    if text_w < 5 or text_h < 5:
        return None
    pad = max(8, int(font_size * 0.2))
    canvas_w = text_w + pad * 2
    canvas_h = text_h + pad * 2
    img = Image.new("L", (canvas_w, canvas_h), color=bg_color)
    draw = ImageDraw.Draw(img)
    draw.text((pad - bbox[0], pad - bbox[1]), word, fill=text_color, font=font)
    img = img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.LANCZOS)
    return img

def generate_for_font(font_path: Path, class_dir: Path, n_samples: int) -> int:
    generated = 0
    attempts = 0
    max_attempts = n_samples * 5
    def get_augment_level(i: int) -> str:
        r = i / n_samples
        if r < 0.20: return "light"
        if r < 0.70: return "medium"
        return "heavy"
    def get_bg(i: int) -> tuple[int, int]:
        if i % 7 == 0: return (0, 255)
        return (255, 0)
    while generated < n_samples and attempts < max_attempts:
        attempts += 1
        word = random.choice(WORD_LIST)
        font_size = random.choice(FONT_SIZES)
        bg_color, text_color = get_bg(generated)
        img = render_font_patch(str(font_path), word, font_size, bg_color, text_color)
        if img is None: continue
        if bg_color == 0: img = ImageOps.invert(img)
        level = get_augment_level(generated)
        img = augment(img, level)
        img.save(class_dir / f"{generated:04d}.png")
        generated += 1
    return generated

def main():
    if not FONTS_DIR.exists():
        print(f"❌ Error: Fonts directory {FONTS_DIR} does not exist.")
        sys.exit(1)
    font_files = sorted(FONTS_DIR.glob("*.ttf"))
    if not font_files:
        print(f"❌ No .ttf files found in {FONTS_DIR.resolve()}")
        sys.exit(1)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    label_map = {}
    total_generated = 0
    failed_fonts = []
    for class_idx, font_path in enumerate(tqdm(font_files, desc="Fonts")):
        slug = font_path.stem
        label_map[slug] = class_idx
        class_dir = OUTPUT_DIR / slug
        class_dir.mkdir(exist_ok=True)
        existing = list(class_dir.glob("*.png"))
        if len(existing) >= SAMPLES_PER_FONT:
            total_generated += len(existing)
            continue
        count = generate_for_font(font_path, class_dir, SAMPLES_PER_FONT)
        total_generated += count
        if count < SAMPLES_PER_FONT // 2:
            failed_fonts.append(slug)
    with open(OUTPUT_DIR / "label_map.json", "w") as f:
        json.dump(label_map, f, indent=2)
    print(f"\n✅ Dataset generation complete. Total: {total_generated:,}")
    if failed_fonts:
        print(f"⚠️ Failed fonts: {failed_fonts}")

if __name__ == "__main__":
    main()
