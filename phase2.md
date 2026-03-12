<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Continue with phase 2

Phase 2 is the **Python inference service** — the Flask app that runs on Cloud Run, receives an image, preprocesses it with OpenCV, runs TFLite inference, and returns predictions. This is what your Firebase Cloud Function calls instead of any external API.

***

## Phase 2 Overview

```
inference-service/
├── main.py              ← Flask app + routes
├── preprocess.py        ← OpenCV text detection + cropping
├── predict.py           ← TFLite model loader + inference
├── warmup.py            ← Preload model on startup
├── requirements.txt
├── Dockerfile
├── .dockerignore
└── models/
    ├── font_classifier.tflite   ← from Phase 1
    └── idx_to_slug.json         ← from Phase 1
```


***

## Step 1 — Project Setup

### Step 1.1 — Create the folder

```bash
# From project root
mkdir -p inference-service/models

# Copy model files from Phase 1
cp ml/models/font_classifier.tflite inference-service/models/
cp ml/models/idx_to_slug.json inference-service/models/

cd inference-service
```


### Step 1.2 — `requirements.txt`

Pin every version explicitly — this prevents Cloud Build surprises.[^1]

```
flask==3.0.3
gunicorn==22.0.0
numpy==1.26.4
opencv-python-headless==4.9.0.80
Pillow==10.3.0
tflite-runtime==2.14.0
firebase-admin==6.5.0
google-cloud-firestore==2.16.0
google-auth==2.29.0
requests==2.32.2
```

> Use `opencv-python-headless` not `opencv-python` — the headless version excludes GUI libs that don't exist in containers and reduces image size by ~100 MB.[^2][^1]

### Step 1.3 — Install locally for development

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```


***

## Step 2 — `predict.py`

This file loads the TFLite model **once at module import time** — not per request. This is critical for Cloud Run performance: the model stays loaded in memory between requests in the same container instance.[^3][^4]

```python
# inference-service/predict.py
import json
import numpy as np
import tflite_runtime.interpreter as tflite
from pathlib import Path

# ─── Load at module level — persists across all requests ─────────────────────
MODEL_PATH      = Path(__file__).parent / "models" / "font_classifier.tflite"
IDX_TO_SLUG_PATH = Path(__file__).parent / "models" / "idx_to_slug.json"
IMAGE_SIZE = 64

print(f"[predict] Loading TFLite model from {MODEL_PATH}...")

interpreter = tflite.Interpreter(
    model_path=str(MODEL_PATH),
    num_threads=4,      # Use 4 CPU threads for inference
)
interpreter.allocate_tensors()

input_details  = interpreter.get_input_details()
output_details = interpreter.get_output_details()

with open(IDX_TO_SLUG_PATH) as f:
    idx_to_slug: dict[str, str] = json.load(f)

NUM_CLASSES = len(idx_to_slug)
print(f"[predict] Model ready. {NUM_CLASSES} font classes.")

# ─── Inference ────────────────────────────────────────────────────────────────

def predict_single_patch(patch: np.ndarray) -> list[dict]:
    """
    Run inference on one 64×64 grayscale numpy patch.
    Returns top-5 predictions sorted by confidence descending.

    Args:
        patch: np.ndarray of shape (64, 64), dtype uint8, values 0-255

    Returns:
        list of {"slug": str, "confidence": float} sorted desc
    """
    if patch.shape != (IMAGE_SIZE, IMAGE_SIZE):
        raise ValueError(f"Expected patch shape ({IMAGE_SIZE},{IMAGE_SIZE}), got {patch.shape}")

    # Normalize to float32 [0.0, 1.0]
    inp = patch.astype(np.float32) / 255.0

    # Reshape to (1, 64, 64, 1) — batch=1, height, width, channels=1
    inp = np.expand_dims(inp, axis=0)   # (1, 64, 64)
    inp = np.expand_dims(inp, axis=-1)  # (1, 64, 64, 1)

    interpreter.set_tensor(input_details[^0]["index"], inp)
    interpreter.invoke()

    # Output shape: (1, NUM_CLASSES)
    probs = interpreter.get_tensor(output_details[^0]["index"])[^0]

    top5_indices = np.argsort(probs)[::-1][:5]
    return [
        {
            "slug": idx_to_slug[str(idx)],
            "confidence": float(round(probs[idx], 6)),
        }
        for idx in top5_indices
    ]


def aggregate_patch_predictions(
    all_patch_predictions: list[list[dict]],
) -> list[dict]:
    """
    Combine predictions from multiple patches using weighted voting.

    Each patch votes for its top-5 fonts, weighted by confidence.
    Final score for each font = sum of confidence scores across all patches.
    Result is normalized to sum to 1.0.

    This makes the system robust to noisy patches — if 3 out of 4 patches
    agree on a font, that font wins even if one patch is wrong.
    """
    if not all_patch_predictions:
        return []

    score_map: dict[str, float] = {}

    for patch_preds in all_patch_predictions:
        for pred in patch_preds:
            slug = pred["slug"]
            score_map[slug] = score_map.get(slug, 0.0) + pred["confidence"]

    # Normalize so all confidence values sum to 1.0
    total = sum(score_map.values())
    if total == 0:
        return []

    sorted_preds = sorted(score_map.items(), key=lambda x: x[^1], reverse=True)

    return [
        {
            "slug": slug,
            "confidence": round(score / total, 6),
        }
        for slug, score in sorted_preds[:5]
    ]
```


***

## Step 3 — `preprocess.py`

This handles everything before inference: decode the image, detect text regions using MSER, crop each region, resize to 64×64.[^5][^6][^7]

```python
# inference-service/preprocess.py
import cv2
import numpy as np
from PIL import Image
import io

IMAGE_SIZE = 64
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
        _delta=MSER_DELTA,
        _min_area=MSER_MIN_AREA,
        _max_area=MSER_MAX_AREA,
        _max_variation=MSER_MAX_VAR,
    )
    regions, _ = mser.detectRegions(gray)

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

    if not raw_boxes:
        return [_fallback_center_patch(gray)]

    # ── Step 3: Merge overlapping boxes ──────────────────────────────────
    merged = _merge_overlapping_boxes(raw_boxes, overlap_threshold=0.3)

    # ── Step 4: Sort by area descending, take top MAX_PATCHES ────────────
    merged.sort(key=lambda b: b[^2] * b[^3], reverse=True)
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
        all_x = [b[^0] for b in group]
        all_y = [b[^1] for b in group]
        all_x2 = [b[^0] + b[^2] for b in group]
        all_y2 = [b[^1] + b[^3] for b in group]
        mx1, my1 = min(all_x), min(all_y)
        mx2, my2 = max(all_x2), max(all_y2)
        merged.append((mx1, my1, mx2 - mx1, my2 - my1))
        used[i] = True

    return merged
```


***

## Step 4 — `main.py`

The Flask app with three endpoints, proper error handling, request validation, and Firestore hydration.[^8][^1]

```python
# inference-service/main.py
import os
import json
import time
import traceback
import logging

from flask import Flask, request, jsonify
from predict import predict_single_patch, aggregate_patch_predictions
from preprocess import bytes_to_bgr, detect_text_patches

# ─── Logging setup ────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Firebase Admin (Firestore for font hydration) ────────────────────────────
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    # On Cloud Run, uses the service account attached to the Cloud Run service
    firebase_admin.initialize_app()

db = firestore.client()

# ─── Cache for Firestore font docs (avoid repeated reads) ─────────────────────
# Simple in-memory cache — lives for the duration of the container instance
_font_cache: dict[str, dict] = {}

def get_font_by_slug(slug: str) -> dict | None:
    """Fetch font metadata from Firestore with simple in-memory cache."""
    if slug in _font_cache:
        return _font_cache[slug]

    query = (
        db.collection("cfFonts")
          .where("slug", "==", slug)
          .limit(1)
          .get()
    )

    if not query:
        return None

    font_data = query[^0].to_dict()
    _font_cache[slug] = font_data   # Cache for next request
    return font_data

# ─── App ──────────────────────────────────────────────────────────────────────
app = Flask(__name__)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Health check — Cloud Run uses this to verify the container is alive."""
    return jsonify({"status": "ok", "model": "loaded"}), 200


@app.route("/warmup", methods=["GET"])
def warmup():
    """
    Cloud Run warmup endpoint.
    Called automatically when a new instance starts.
    Ensures the model is loaded before the first real request arrives.
    """
    return jsonify({"status": "warm"}), 200


@app.route("/recognize", methods=["POST"])
def recognize():
    """
    Main recognition endpoint.

    Accepts:    multipart/form-data with field "image"
    Returns:    JSON with predictions, patch count, and hydrated CF metadata
    """
    start_time = time.time()

    # ── Validate request ──────────────────────────────────────────────────
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use field name 'image'."}), 400

    file = request.files["image"]

    if file.content_type not in ALLOWED_MIME_TYPES:
        return jsonify({
            "error": f"Unsupported image type: {file.content_type}. Use JPEG, PNG, or WEBP."
        }), 415

    image_bytes = file.read()

    if len(image_bytes) == 0:
        return jsonify({"error": "Uploaded file is empty."}), 400

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        return jsonify({
            "error": f"Image too large ({len(image_bytes) // 1024}KB). Maximum is 5MB."
        }), 413

    try:
        # ── Step 1: Decode image ──────────────────────────────────────────
        img_bgr = bytes_to_bgr(image_bytes)
        if img_bgr is None:
            return jsonify({"error": "Could not decode image. File may be corrupt."}), 422

        img_h, img_w = img_bgr.shape[:2]
        logger.info(f"[recognize] Image decoded: {img_w}×{img_h}")

        # ── Step 2: Detect text patches ───────────────────────────────────
        patches = detect_text_patches(img_bgr)
        logger.info(f"[recognize] Text patches found: {len(patches)}")

        # ── Step 3: Run TFLite inference on each patch ────────────────────
        all_predictions = []
        for p in patches:
            try:
                preds = predict_single_patch(p["patch"])
                all_predictions.append(preds)
            except Exception as e:
                logger.warning(f"[recognize] Patch inference failed: {e}")
                continue

        if not all_predictions:
            return jsonify({
                "error": "No readable text regions found in image.",
                "tip": "Try a clearer image with visible text, or a closer crop."
            }), 422

        # ── Step 4: Aggregate votes across patches ────────────────────────
        final_predictions = aggregate_patch_predictions(all_predictions)

        # ── Step 5: Hydrate with Firestore font metadata ──────────────────
        hydrated = []
        for pred in final_predictions:
            font_data = get_font_by_slug(pred["slug"])
            if font_data:
                hydrated.append({
                    "slug":          pred["slug"],
                    "confidence":    pred["confidence"],
                    "name":          font_data.get("name", pred["slug"]),
                    "category":      font_data.get("category", "unknown"),
                    "cfUrl":         font_data.get("cfUrl", ""),
                    "previewImgUrl": font_data.get("previewImgUrl", ""),
                    "moodTags":      font_data.get("moodTags", []),
                    "weight":        font_data.get("weight", "regular"),
                    "isFree":        font_data.get("isFree", False),
                })
            else:
                # Font not in CF library — return raw prediction anyway
                hydrated.append({
                    "slug":       pred["slug"],
                    "confidence": pred["confidence"],
                    "name":       pred["slug"].replace("-", " ").title(),
                    "inCFLibrary": False,
                })

        elapsed_ms = round((time.time() - start_time) * 1000)
        logger.info(f"[recognize] Done in {elapsed_ms}ms. Top: {hydrated[^0]['name'] if hydrated else 'none'}")

        return jsonify({
            "predictions":    hydrated,
            "topPrediction":  hydrated[^0] if hydrated else None,
            "patchesAnalyzed": len(patches),
            "imageDimensions": {"width": img_w, "height": img_h},
            "processingMs":   elapsed_ms,
        }), 200

    except Exception as e:
        logger.error(f"[recognize] Unhandled error: {traceback.format_exc()}")
        return jsonify({"error": "Internal server error.", "detail": str(e)}), 500


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    # Use threaded=True for local dev only — Gunicorn handles concurrency in prod
    app.run(host="0.0.0.0", port=port, threaded=True, debug=False)
```


***

## Step 5 — Dockerfile

```dockerfile
# inference-service/Dockerfile

# Use slim Python 3.11 base — smaller than full image
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# ── System dependencies for OpenCV headless ──────────────────────────────────
# libgl1 and libglib2.0 are required even for headless OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ───────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
COPY main.py preprocess.py predict.py ./

# ── Model files ───────────────────────────────────────────────────────────────
COPY models/ ./models/

# ── Gunicorn config ───────────────────────────────────────────────────────────
# workers=1 because TFLite interpreter is not thread-safe across workers
# threads=8 handles concurrent requests within one worker
# timeout=120 for slow cold starts on first request
ENV PORT=8080
CMD exec gunicorn \
    --workers=1 \
    --threads=8 \
    --timeout=120 \
    --bind=0.0.0.0:$PORT \
    --access-logfile=- \
    --error-logfile=- \
    main:app
```


### `.dockerignore`

```
venv/
__pycache__/
*.pyc
*.pyo
.env
.git
*.md
tests/
```


***

## Step 6 — Test Locally With Docker

### Step 6.1 — Build the image

```bash
# From inference-service/
docker build -t font-recognition-service .

# Expected: image builds in 3–5 min first time
# Expected image size: ~800 MB – 1.2 GB
```


### Step 6.2 — Run the container locally

```bash
docker run \
  -p 8080:8080 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/sa.json \
  -v $(pwd)/service-account.json:/app/sa.json:ro \
  font-recognition-service

# Service starts at http://localhost:8080
```


### Step 6.3 — Test with curl

```bash
# Health check
curl http://localhost:8080/health
# → {"model":"loaded","status":"ok"}

# Font recognition test
curl -X POST http://localhost:8080/recognize \
  -F "image=@/path/to/test-font-image.png" \
  | python3 -m json.tool

# Expected output:
# {
#   "predictions": [
#     {
#       "slug": "roboto",
#       "confidence": 0.7423,
#       "name": "Roboto",
#       "category": "sans-serif",
#       "cfUrl": "https://www.creativefabrica.com/...",
#       "moodTags": ["modern", "clean"],
#       "isFree": false
#     },
#     ...
#   ],
#   "topPrediction": { ... },
#   "patchesAnalyzed": 3,
#   "processingMs": 284
# }
```


### Step 6.4 — Write a proper test script

```python
# inference-service/test_local.py
import requests
from pathlib import Path

BASE_URL = "http://localhost:8080"
TEST_IMAGES_DIR = Path("../ml/test_images")   # Put 10-20 test images here

def test_health():
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    print("✅ Health check passed")

def test_recognition(image_path: Path):
    with open(image_path, "rb") as f:
        r = requests.post(
            f"{BASE_URL}/recognize",
            files={"image": (image_path.name, f, "image/png")},
            timeout=30,
        )

    if r.status_code != 200:
        print(f"❌ {image_path.name}: HTTP {r.status_code} — {r.json()}")
        return

    data = r.json()
    top = data.get("topPrediction", {})
    patches = data.get("patchesAnalyzed", 0)
    ms = data.get("processingMs", 0)

    print(f"\n📄 {image_path.name}")
    print(f"   Patches analysed: {patches}")
    print(f"   Processing time:  {ms}ms")
    print(f"   Top prediction:   {top.get('name')} ({top.get('confidence', 0)*100:.1f}%)")
    print(f"   Top 5:")
    for i, pred in enumerate(data.get("predictions", [])[:5]):
        bar = "█" * int(pred["confidence"] * 20)
        print(f"     #{i+1} {bar:<20} {pred['confidence']*100:5.1f}%  {pred.get('name', pred['slug'])}")

def test_error_cases():
    # Empty file
    r = requests.post(f"{BASE_URL}/recognize", files={"image": ("empty.png", b"", "image/png")})
    assert r.status_code == 400
    print("✅ Empty file rejected correctly")

    # Wrong field name
    r = requests.post(f"{BASE_URL}/recognize", files={"file": ("test.png", b"fake", "image/png")})
    assert r.status_code == 400
    print("✅ Wrong field name rejected correctly")

    # Too large file (6MB of zeros)
    r = requests.post(f"{BASE_URL}/recognize", files={"image": ("big.png", b"\x00" * 6_000_000, "image/png")})
    assert r.status_code == 413
    print("✅ Oversized file rejected correctly")

if __name__ == "__main__":
    test_health()
    test_error_cases()

    images = list(TEST_IMAGES_DIR.glob("*.png")) + list(TEST_IMAGES_DIR.glob("*.jpg"))
    if not images:
        print(f"\n⚠️  No test images found in {TEST_IMAGES_DIR}")
    else:
        for img in images:
            test_recognition(img)
```

```bash
python test_local.py
```


***

## Step 7 — Deploy to Cloud Run

### Step 7.1 — Prerequisites

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create a service account for the Cloud Run service
gcloud iam service-accounts create font-recognition-sa \
  --display-name="Font Recognition Service Account"

# Grant it Firestore access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:font-recognition-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```


### Step 7.2 — Deploy

```bash
# Deploy directly from source — Cloud Build handles the Docker build
# Run from inside inference-service/
gcloud run deploy font-recognition-service \
  --source . \
  --region asia-southeast1 \
  --service-account font-recognition-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 4 \
  --timeout 120 \
  --no-allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID

# Takes 3–5 min on first deploy
# Note the deployed URL: https://font-recognition-service-XXXX.run.app
```

> `--no-allow-unauthenticated` is important — only your Firebase Cloud Function should be able to call this service, not random internet traffic.[^4][^1]

### Step 7.3 — Grant Firebase Function Access

```bash
# Allow your Firebase Functions service account to invoke Cloud Run
gcloud run services add-iam-policy-binding font-recognition-service \
  --region asia-southeast1 \
  --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/run.invoker"
```


### Step 7.4 — Test the deployed service

```bash
# Get an identity token for the service
TOKEN=$(gcloud auth print-identity-token)

# Test health
curl -H "Authorization: Bearer $TOKEN" \
  https://font-recognition-service-XXXX.run.app/health

# Test recognition
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test-image.png" \
  https://font-recognition-service-XXXX.run.app/recognize \
  | python3 -m json.tool
```


***

## Step 8 — Connect to Firebase Function

Update `processImage.ts` to call your Cloud Run service using an identity token for authentication.[^1][^4]

```typescript
// functions/src/processImage.ts — updated try block
import { GoogleAuth } from "google-auth-library";
import axios from "axios";
import FormData from "form-data";

const RECOGNITION_URL = process.env.RECOGNITION_SERVICE_URL!;
// Set via: firebase functions:config:set recognition.url="https://..."
// Or in functions/.env: RECOGNITION_SERVICE_URL=https://...

// Cache auth client — don't recreate per request
let _authClient: any = null;
async function getIdentityToken(targetUrl: string): Promise<string> {
  if (!_authClient) {
    const auth = new GoogleAuth();
    _authClient = await auth.getIdTokenClient(targetUrl);
  }
  const tokenRes = await _authClient.getRequestHeaders(targetUrl);
  return tokenRes["Authorization"].replace("Bearer ", "");
}

// Inside the try block of processFontImage:
try {
  // 1. Load image from Storage
  const bucket = storage.bucket();
  const file = bucket.file(job.imagePath);
  const [exists] = await file.exists();
  if (!exists) throw new Error("IMAGE_NOT_FOUND");
  const [imageBuffer] = await file.download();

  // 2. Get Cloud Run identity token
  const token = await getIdentityToken(RECOGNITION_URL);

  // 3. Build multipart form and call Cloud Run
  const formData = new FormData();
  formData.append("image", imageBuffer, {
    filename: "upload.jpg",
    contentType: job.imageMimeType,
  });

  const response = await axios.post(
    `${RECOGNITION_URL}/recognize`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
      timeout: 90_000,
    }
  );

  const { predictions, topPrediction, patchesAnalyzed, processingMs } = response.data;

  if (!topPrediction) throw new Error("NO_FONTS_DETECTED");

  // 4. Map into DetectedFont shape
  const detectedFonts = predictions.map((p: any, i: number) => ({
    role:             i === 0 ? "heading" : "unknown",
    identifiedName:   p.name ?? p.slug,
    confidence:       p.confidence,
    category:         p.category ?? "unknown",
    weight:           p.weight ?? "regular",
    style:            "normal",
    moodTags:         p.moodTags ?? [],
    notableFeatures:  `Detected by CNN — ${patchesAnalyzed} patch(es) in ${processingMs}ms`,
    sampleCharacters: "",
    pairingStyle:     `Complement this ${p.category ?? "display"} font with a contrasting style`,
    cfUrl:            p.cfUrl ?? null,
    previewImgUrl:    p.previewImgUrl ?? null,
    isFree:           p.isFree ?? false,
    inCFLibrary:      !!p.cfUrl,
  }));

  // 5. Get signed URL for image preview
  const [downloadUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  // 6. Update Firestore — Phase 2 (CF matching + pairings) picks up here
  await jobRef.update({
    status:           "completed",
    detectedFonts,
    primaryFont:      detectedFonts[^0],
    primaryFontIndex: 0,
    imageDownloadUrl: downloadUrl,
    processingMs:     Date.now() - startTime,
    updatedAt:        admin.firestore.Timestamp.now(),
  });

  res.status(200).json({ jobId, status: "completed" });

} catch (err: any) {
  // ... error handling unchanged
}
```


***

## Step 9 — Cold Start Optimisation

Cloud Run spins down to zero instances when there's no traffic. The first request after idle will take 8–15 seconds to start the container and load the TFLite model.  Apply these three fixes:[^9][^3]

**Fix 1 — Minimum instances (paid, warmest)**

```bash
gcloud run services update font-recognition-service \
  --min-instances 1 \
  --region asia-southeast1
# Keeps one container always warm. Costs ~$5–10/month.
```

**Fix 2 — Cloud Scheduler warmup ping (free)**

```bash
# Ping /warmup every 5 minutes to keep the container alive
gcloud scheduler jobs create http font-recognition-warmup \
  --schedule "*/5 * * * *" \
  --uri "https://font-recognition-service-XXXX.run.app/warmup" \
  --oidc-service-account-email=YOUR_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --location asia-southeast1
```

**Fix 3 — Cloud Run warmup handler (already in `main.py`)**
Cloud Run calls `/_ah/warmup` automatically when spinning up a new instance.  The `/warmup` route in `main.py` handles this — the mere act of importing `predict.py` already loads the model into memory.[^4]

***

## Phase 2 Completion Checklist

| \# | Task | Verified When |
| :-- | :-- | :-- |
| 1 | Docker image builds without errors | `docker build` exits 0 |
| 2 | Local `/health` returns 200 | `curl localhost:8080/health` |
| 3 | Local `/recognize` returns predictions for 10 test images | `python test_local.py` all pass |
| 4 | Error cases return correct HTTP status codes | `test_error_cases()` all pass |
| 5 | Cloud Run deploy succeeds | URL visible in GCP console |
| 6 | Deployed service returns predictions via curl with auth token | Manual curl test |
| 7 | Firebase Function can call Cloud Run and job completes in Firestore | End-to-end test from browser |
| 8 | Warmup scheduler created | GCP Cloud Scheduler console |

<span style="display:none">[^10][^11][^12][^13][^14][^15]</span>

<div align="center">⁂</div>

[^1]: https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-service

[^2]: https://www.geeksforgeeks.org/devops/setting-up-flask-applications-in-google-cloud-run/

[^3]: https://docs.fal.ai/serverless/deployment-operations/optimize-cold-starts

[^4]: https://docs.cloud.google.com/run/docs/tips/general

[^5]: https://gist.github.com/Ashish0091/c7f61980cc8b1a8a4ab22b5ad25fc0ab

[^6]: https://stackoverflow.com/questions/54417410/mser-text-detection-issue/54420090

[^7]: https://webnautes.tistory.com/1986

[^8]: https://dev.to/j_alex_cloud_engineer_devops/automating-python-flask-deployment-with-google-cloud-run-a-step-by-step-guide-338h

[^9]: https://cyfuture.cloud/kb/performance-and-optimization/how-do-you-minimize-cold-start-time-for-serverless-inference

[^10]: https://www.youtube.com/watch?v=5aOF-RIZS5c\&vl=en

[^11]: https://cloud.google.com/run

[^12]: https://www.youtube.com/watch?v=8Y22xjngXpY

[^13]: https://www.youtube.com/watch?v=v-9R1LaSQiw

[^14]: https://discuss.google.dev/t/gunicorn-flask-app-deployed-on-cloud-run-what-are-the-optimization-techniques/162737

[^15]: https://learnopencv.com/deep-learning-based-text-detection-using-opencv-c-python/

