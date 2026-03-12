# inference-service/preprocess.py
import cv2
import numpy as np
from PIL import Image
import io

IMAGE_SIZE = 128
MIN_PATCH_AREA = 400        # Ignore tiny regions (< 20×20 px)
MAX_PATCHES    = 5          # Process at most 5 patches per image
MSER_DELTA     = 5          # MSER sensitivity — lower = more regions
MSER_MIN_AREA  = 60
MSER_MAX_AREA  = 14400      # Ignores full-image regions
MSER_MAX_VAR   = 0.25

# ─── Image Loading ────────────────────────────────────────────────────────────

def bytes_to_bgr(image_bytes: bytes) -> np.ndarray | None:
    """Decode raw image bytes into an OpenCV BGR numpy array."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img  # Returns None if decode fails


def resize_if_too_large(img: np.ndarray, max_dim: int = 1024) -> np.ndarray:
    """
    Downscale image if either dimension exceeds max_dim.
    Large images slow down MSER significantly without improving accuracy.
    """
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

# ─── MSER Text Detection ──────────────────────────────────────────────────────

def detect_text_patches(img_bgr: np.ndarray) -> list[dict]:
    """
    Detect text regions in the image using MSER.
    Returns a list of patch dicts sorted by area (largest first).

    Each dict contains:
        "patch":  np.ndarray (64, 64) uint8 grayscale, normalised to white bg
        "bbox":   (x, y, w, h) in original image coordinates
        "area":   int, pixel area of bounding box
    """
    img_bgr = resize_if_too_large(img_bgr)
    gray    = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h_img, w_img = gray.shape

    # ── Step 1: MSER detection ────────────────────────────────────────────
    mser = cv2.MSER_create(
        delta=MSER_DELTA,
        min_area=MSER_MIN_AREA,
        max_area=MSER_MAX_AREA,
        max_variation=MSER_MAX_VAR,
    )
    regions, _ = mser.detectRegions(gray)

    print(f"DEBUG: img_bgr shape: {img_bgr.shape}, MSER found {len(regions) if regions else 0} regions")
    if not regions:
        return [_fallback_center_patch(gray)]

    # ── Step 2: Convert regions to bounding boxes ─────────────────────────
    raw_boxes = []
    for region in regions:
        pts = region.reshape(-1, 1, 2)
        x, y, w, h = cv2.boundingRect(pts)
        area = w * h

        if area < MIN_PATCH_AREA:
            continue

        # Filter out near-square blobs likely to be icons/logos not text
        aspect = w / max(h, 1)
        if not (0.15 < aspect < 12):
            continue

        raw_boxes.append((x, y, w, h))

    print(f"DEBUG: raw_boxes after filter: {len(raw_boxes)}")

    if not raw_boxes:
        return [_fallback_center_patch(gray)]

    # ── Step 3: Merge overlapping boxes ──────────────────────────────────
    merged = _merge_overlapping_boxes(raw_boxes, overlap_threshold=0.3)

    # ── Step 4: Sort by area descending, take top MAX_PATCHES ────────────
    merged.sort(key=lambda b: b[2] * b[3], reverse=True)
    top_boxes = merged[:MAX_PATCHES]

    # ── Step 5: Crop, normalise, resize each box to 64×64 ────────────────
    patches = []
    for (x, y, w, h) in top_boxes:
        pad = max(6, int(min(w, h) * 0.15))
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(w_img, x + w + pad)
        y2 = min(h_img, y + h + pad)

        crop = gray[y1:y2, x1:x2]
        if crop.size == 0:
            continue

        normalised = _normalise_patch(crop)
        resized    = cv2.resize(normalised, (IMAGE_SIZE, IMAGE_SIZE), interpolation=cv2.INTER_LANCZOS4)

        patches.append({
            "patch": resized,
            "bbox":  (x1, y1, x2 - x1, y2 - y1),
            "area":  (x2 - x1) * (y2 - y1),
        })

    return patches if patches else [_fallback_center_patch(gray)]


def _normalise_patch(crop: np.ndarray) -> np.ndarray:
    """
    Ensure the patch has a white background and dark text.
    Fonts can appear as dark-on-white OR white-on-dark.
    We always convert to dark-on-white for consistent model input.
    """
    mean = np.mean(crop)
    if mean < 128:
        # Dark background — invert so text is dark on white
        return cv2.bitwise_not(crop)
    return crop


def _fallback_center_patch(gray: np.ndarray) -> dict:
    """
    If MSER finds nothing, crop the centre third of the image.
    This handles clean text-only images where MSER finds no regions.
    """
    h, w = gray.shape
    y1, y2 = h // 3, 2 * h // 3
    x1, x2 = w // 3, 2 * w // 3
    crop = gray[y1:y2, x1:x2]
    if crop.size == 0:
        crop = gray
    normalised = _normalise_patch(crop)
    resized    = cv2.resize(normalised, (IMAGE_SIZE, IMAGE_SIZE), interpolation=cv2.INTER_LANCZOS4)
    return {"patch": resized, "bbox": (x1, y1, x2 - x1, y2 - y1), "area": 0}


def _merge_overlapping_boxes(
    boxes: list[tuple[int, int, int, int]],
    overlap_threshold: float = 0.3,
) -> list[tuple[int, int, int, int]]:
    """
    Merge boxes with significant overlap (e.g. MSER detecting the same letter twice).
    Uses IoU (intersection over union) — standard object detection technique.
    """
    if not boxes:
        return []

    boxes = list(set(boxes))  # Remove exact duplicates
    merged = []
    used = [False] * len(boxes)

    for i, b1 in enumerate(boxes):
        if used[i]:
            continue
        x1, y1, w1, h1 = b1
        group = [b1]

        for j, b2 in enumerate(boxes[i+1:], start=i+1):
            if used[j]:
                continue
            x2, y2, w2, h2 = b2

            # Compute IoU
            ix1 = max(x1, x2)
            iy1 = max(y1, y2)
            ix2 = min(x1 + w1, x2 + w2)
            iy2 = min(y1 + h1, y2 + h2)

            if ix2 <= ix1 or iy2 <= iy1:
                continue  # No overlap

            inter = (ix2 - ix1) * (iy2 - iy1)
            union = w1 * h1 + w2 * h2 - inter
            iou   = inter / union if union > 0 else 0

            if iou >= overlap_threshold:
                group.append(b2)
                used[j] = True

        # Merge group into one bounding box
        all_x = [b[0] for b in group]
        all_y = [b[1] for b in group]
        all_x2 = [b[0] + b[2] for b in group]
        all_y2 = [b[1] + b[3] for b in group]
        mx1, my1 = min(all_x), min(all_y)
        mx2, my2 = max(all_x2), max(all_y2)
        merged.append((mx1, my1, mx2 - mx1, my2 - my1))
        used[i] = True

    return merged
