# diagnostic_keras_tflite.py
import tensorflow as tf
from tensorflow import keras
import numpy as np
from PIL import Image
import json, random, os

# ── Config ───────────────────────────────────────────────────────────────────
IMAGE_SIZE = 128
KERAS_MODEL_PATH = "/Users/jj/Downloads/fontfinder/best_model.keras"
TFLITE_MODEL_PATH = "/Users/jj/Downloads/fontfinder/inference-service/models/font_classifier.tflite"
DATASET_DIR = "/Users/jj/Downloads/fontfinder/dataset"
LABEL_MAP_PATH = "/Users/jj/Downloads/fontfinder/dataset/label_map.json"

# ── Load Mappings ─────────────────────────────────────────────────────────────
with open(LABEL_MAP_PATH, "r") as f:
    slug_to_idx = json.load(f)
idx_to_slug = {str(v): k for k, v in slug_to_idx.items()}

# ── Load both models ──────────────────────────────────────────────────────────
print(f"Loading Keras model from {KERAS_MODEL_PATH}...")
keras_model  = keras.models.load_model(KERAS_MODEL_PATH)

print(f"Loading TFLite model from {TFLITE_MODEL_PATH}...")
tflite_interp = tf.lite.Interpreter(model_path=TFLITE_MODEL_PATH)
tflite_interp.allocate_tensors()

inp_det = tflite_interp.get_input_details()[0]
out_det = tflite_interp.get_output_details()[0]

print(f"TFLite input  — shape: {inp_det['shape']}  dtype: {inp_det['dtype']}")
print(f"TFLite output — shape: {out_det['shape']}")
print()

# ── Pick a known training image ───────────────────────────────────────────────
# We verify the slug exists as a directory
valid_slugs = [s for s in slug_to_idx.keys() if os.path.isdir(os.path.join(DATASET_DIR, s))]
if not valid_slugs:
    print(f"Error: No valid font directories found in {DATASET_DIR}")
    exit(1)

TEST_SLUG = valid_slugs[0]
class_dir = os.path.join(DATASET_DIR, TEST_SLUG)
images = [f for f in os.listdir(class_dir) if f.endswith(('.png', '.jpg', '.jpeg'))]
if not images:
    print(f"Error: No images found in {class_dir}")
    exit(1)

img_path  = os.path.join(class_dir, images[0])
true_idx  = slug_to_idx[TEST_SLUG]

print(f"Test image:  {img_path}")
print(f"True class:  {TEST_SLUG} (index {true_idx})")
print()

# ── Load image exactly as training pipeline does ──────────────────────────────
raw = Image.open(img_path).convert("L").resize((IMAGE_SIZE, IMAGE_SIZE))
arr = np.array(raw).astype(np.float32)   # [0, 255], shape (128, 128)

print(f"Image shape: {arr.shape}")
print(f"Pixel range: [{arr.min():.0f}, {arr.max():.0f}]")
print(f"Mean pixel:  {arr.mean():.1f}  (expected 100–200 for text on white bg)")
print()

# ── Test 1: Keras model ───────────────────────────────────────────────────────
keras_inp   = arr.reshape(1, IMAGE_SIZE, IMAGE_SIZE, 1)
keras_probs = keras_model.predict(keras_inp, verbose=0)[0]
keras_top5  = np.argsort(keras_probs)[::-1][:5]

print("── Keras model predictions ──────────────────────────────────")
for rank, idx in enumerate(keras_top5):
    slug   = idx_to_slug.get(str(idx), "unknown")
    marker = "✅" if idx == true_idx else "  "
    print(f"  {marker} #{rank+1}  {slug:<35}  {keras_probs[idx]*100:.1f}%")
print()

# ── Test 2: TFLite model ──────────────────────────────────────────────────────
tflite_inp = arr.reshape(1, IMAGE_SIZE, IMAGE_SIZE, 1)
tflite_interp.set_tensor(inp_det["index"], tflite_inp)
tflite_interp.invoke()
tflite_probs = tflite_interp.get_tensor(out_det["index"])[0]
tflite_top5  = np.argsort(tflite_probs)[::-1][:5]

print("── TFLite model predictions ─────────────────────────────────")
for rank, idx in enumerate(tflite_top5):
    slug   = idx_to_slug.get(str(idx), "unknown")
    marker = "✅" if idx == true_idx else "  "
    print(f"  {marker} #{rank+1}  {slug:<35}  {tflite_probs[idx]*100:.1f}%")
print()

# ── Test 3: TFLite with /255 (wrong way) to prove the difference ──────────────
wrong_inp = (arr / 255.0).reshape(1, IMAGE_SIZE, IMAGE_SIZE, 1)
tflite_interp.set_tensor(inp_det["index"], wrong_inp)
tflite_interp.invoke()
wrong_probs = tflite_interp.get_tensor(out_det["index"])[0]
wrong_top5  = np.argsort(wrong_probs)[::-1][:5]

print("── TFLite with /255 (WRONG — for comparison) ────────────────")
for rank, idx in enumerate(wrong_top5):
    slug = idx_to_slug.get(str(idx), "unknown")
    print(f"    #{rank+1}  {slug:<35}  {wrong_probs[idx]*100:.1f}%")
print()

# ── Conclusion ────────────────────────────────────────────────────────────────
keras_correct  = keras_top5[0]  == true_idx
tflite_correct = tflite_top5[0] == true_idx
keras_conf     = keras_probs[keras_top5[0]]
tflite_conf    = tflite_probs[tflite_top5[0]]
drift          = abs(keras_conf - tflite_conf)

print("── Diagnosis ────────────────────────────────────────────────")
print(f"  Keras  Top-1 correct: {keras_correct}  ({keras_conf*100:.1f}%)")
print(f"  TFLite Top-1 correct: {tflite_correct}  ({tflite_conf*100:.1f}%)")
print(f"  Confidence drift:     {drift*100:.1f}%")
print()

if not keras_correct:
    print("🚨 Keras itself is wrong on this image — re-train or check dataset.")
elif not tflite_correct and drift > 0.3:
    print("🚨 TFLite conversion broke the model. Re-export (see fix below).")
elif not tflite_correct and drift < 0.3:
    print("⚠️  Quantization degraded accuracy. Use float32 TFLite instead.")
elif tflite_correct and tflite_conf < 0.7:
    print("⚠️  TFLite works but confidence is low. Issue is in inference service preprocessing.")
else:
    print("✅ Both models work in diagnostic. Bug is in inference service, not the model file.")
