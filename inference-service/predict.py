import json
import numpy as np
import os
import time
from ai_edge_litert.interpreter import Interpreter as TFLiteInterpreter
from pathlib import Path
from PIL import Image

# ─── Config ──────────────────────────────────────────────────────────────────
MODEL_PATH      = Path(__file__).parent / "models" / "font_classifier.tflite"
IDX_TO_SLUG_PATH = Path(__file__).parent / "models" / "idx_to_slug.json"
IMAGE_SIZE = 128

print(f"[predict] Loading TFLite model from {MODEL_PATH}...")

interpreter = TFLiteInterpreter(
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
    Run inference on one 128×128 grayscale numpy patch.
    Returns top-5 predictions sorted by confidence descending.

    Args:
        patch: np.ndarray of shape (128, 128), dtype uint8, values 0-255

    Returns:
        list of {"slug": str, "confidence": float} sorted desc
    """
    # Debug: Save the first few patches to see what the model is getting
    if not os.path.exists("debug_patches"):
        os.makedirs("debug_patches")
    if len(os.listdir("debug_patches")) < 5:
        Image.fromarray(patch).save(f"debug_patches/patch_{int(time.time()*1000)}.png")

    if patch.shape != (IMAGE_SIZE, IMAGE_SIZE):
        img = Image.fromarray(patch).convert('L')
        img = img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
        processed_patch = np.array(img).astype(np.float32)
    else:
        processed_patch = patch.astype(np.float32)
    
    inp = processed_patch.reshape(1, IMAGE_SIZE, IMAGE_SIZE, 1)

    interpreter.set_tensor(input_details[0]["index"], inp)
    interpreter.invoke()

    # Output shape: (1, NUM_CLASSES)
    probs = interpreter.get_tensor(output_details[0]["index"])[0]
    
    # Debug: Print top 5 raw values
    sorted_idx = np.argsort(probs)[::-1]
    print(f"[predict] Top 5 raw values: {[(idx, probs[idx]) for idx in sorted_idx[:5]]}")

    top5_indices = sorted_idx[:5]
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

    sorted_preds = sorted(score_map.items(), key=lambda x: x[1], reverse=True)

    return [
        {
            "slug": slug,
            "confidence": round(score / total, 6),
        }
        for slug, score in sorted_preds[:5]
    ]
