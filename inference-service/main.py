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

import firebase_admin
from firebase_admin import credentials, firestore

try:
    if not firebase_admin._apps:
        # On Cloud Run, uses the service account attached to the Cloud Run service
        firebase_admin.initialize_app()
    db = firestore.client()
except Exception as e:
    logger.warning(f"Firebase Admin could not be initialized (Firestore hydration disabled): {e}")
    db = None

# ─── Cache for Firestore font docs (avoid repeated reads) ─────────────────────
# Simple in-memory cache — lives for the duration of the container instance
_font_cache: dict[str, dict] = {}

def get_font_by_slug(slug: str) -> dict | None:
    """Fetch font metadata from Firestore with simple in-memory cache."""
    if not db:
        return None

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

    font_data = query[0].to_dict()
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
        logger.info(f"[recognize] Done in {elapsed_ms}ms. Top: {hydrated[0]['name'] if hydrated else 'none'}")

        return jsonify({
            "predictions":    hydrated,
            "topPrediction":  hydrated[0] if hydrated else None,
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
