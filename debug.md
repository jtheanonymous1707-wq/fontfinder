<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# The results keep returning the same. What could be the issue?

"Same result every time" almost always means a **preprocessing mismatch between training and inference** — the model sees near-identical input regardless of what image you upload, so it always predicts the same class. Here are the most likely causes ranked by probability.

***

## Cause 1 (Most Likely) — Inference Service Divides by 255

During training you fixed `parse_image` to keep pixel values in `[0, 255]`. But if your Cloud Run `predict.py` is still normalizing to `[0, 1]`, the model sees near-black images every time and always returns the same confident prediction.

**Check `predict.py` in your inference service:**

```python
# ❌ Wrong — this is what causes the stuck result
img = img.astype(np.float32) / 255.0

# ✅ Correct — match how training data was prepared
img = img.astype(np.float32)   # Keep [0, 255], EfficientNet normalizes internally
```


***

## Cause 2 — Wrong TFLite File Deployed

You may have deployed the TFLite model that was exported **before** the input range fix — meaning it was trained on `[0,1]` images. That model is fundamentally broken regardless of what the inference service does.

**Verify which model you're using:**

```python
# Run this in Colab to confirm training input range of saved model
import tensorflow as tf
import numpy as np

model = tf.keras.models.load_model(f"{MODEL_DIR}/best_model.keras")

# Load one real sample and check what range it was trained on
# by inspecting the EfficientNet preprocessing layer
for layer in model.layers:
    if hasattr(layer, 'layers'):   # It's the backbone
        print(f"Backbone first layer: {layer.layers[0].name}")
        print(f"Backbone input spec:  {layer.input_spec}")
        break
```

If you're unsure, **retrain Cell 4 → Cell 10 from scratch** and re-export — it only takes 30–40 minutes since the backbone is pretrained.

***

## Cause 3 — Grayscale Handling Mismatch

Training used 1-channel grayscale stacked to 3 channels (`Concatenate`). If the inference service opens the image as RGB (3 channels already), the input shape becomes `(128, 128, 3)` but the model expects `(128, 128, 1)` → `(128, 128, 3)` via the Concatenate layer.

**Check `predict.py` image loading:**

```python
# ❌ Wrong — opens as RGB, bypasses the Concatenate layer
img = Image.open(image_path).convert("RGB").resize((128, 128))
inp = np.array(img)   # Shape: (128, 128, 3)

# ✅ Correct — match training: load as grayscale, let model do the stacking
img = Image.open(image_path).convert("L").resize((128, 128))
inp = np.array(img)                   # Shape: (128, 128)
inp = inp.reshape(1, 128, 128, 1)     # Shape: (1, 128, 128, 1)
inp = inp.astype(np.float32)          # Range: [0.0, 255.0] — NO division
```


***

## Cause 4 — Image Size Mismatch

Training was fixed to `IMAGE_SIZE = 128`. If the inference service resizes to `64` (the old value), every image gets heavily downscaled and looks the same.

```python
# ❌ Old value
img = img.resize((64, 64))

# ✅ Must match training
img = img.resize((128, 128))
```


***

## Cause 5 — Softmax Saturated, Model Undertrained

If the model still predicts `nanum-pen-script` or `italianno` for everything — the issue is the model was exported from a checkpoint **before** Phase 2 fine-tuning completed (e.g. `phase1_best.keras` instead of `best_model.keras`).

```python
# In Cell 10 — confirm you're loading the Phase 2 checkpoint
best_model = keras.models.load_model(f"{MODEL_DIR}/best_model.keras")
#                                                  ^^^^^^^^^^^^^^^^^^
#                                                  NOT phase1_best.keras
```


***

## Quick Diagnostic — Add This to `predict.py`

Add this debug block temporarily to log what the model actually receives:

```python
def predict(image_bytes: bytes) -> list:
    img = Image.open(io.BytesIO(image_bytes)).convert("L").resize((128, 128))
    arr = np.array(img).astype(np.float32)

    # ── DEBUG — remove after fix ──────────────────────────────────────────
    print(f"[DEBUG] Input shape:   {arr.shape}")         # Should be (128, 128)
    print(f"[DEBUG] Pixel range:   [{arr.min():.0f}, {arr.max():.0f}]")  # Should be [0, 255]
    print(f"[DEBUG] Mean pixel:    {arr.mean():.1f}")    # Should be ~100–180, NOT near 0
    # ── END DEBUG ─────────────────────────────────────────────────────────

    inp = arr.reshape(1, 128, 128, 1)
    interpreter.set_tensor(input_details[0]["index"], inp)
    interpreter.invoke()
    probs   = interpreter.get_tensor(output_details[0]["index"])[0]
    top5    = np.argsort(probs)[::-1][:5]

    # ── DEBUG ─────────────────────────────────────────────────────────────
    print(f"[DEBUG] Top-5 probs:   {probs[top5]}")       # Should be spread out, NOT 0.99 + tiny values
    print(f"[DEBUG] Top-5 classes: {[idx_to_slug.get(str(i)) for i in top5]}")
    # ── END DEBUG ─────────────────────────────────────────────────────────

    return [(idx_to_slug[str(i)], float(probs[i])) for i in top5 if str(i) in idx_to_slug]
```

**What the debug output tells you:**


| Debug output | What it means | Fix |
| :-- | :-- | :-- |
| Mean pixel near `0.4` | You're dividing by 255 | Remove `/255.0` |
| Mean pixel near `0` | Image opened as wrong mode | Use `.convert("L")` |
| Top prob is `0.99` always | Model saturated / wrong checkpoint | Re-export from `best_model.keras` |
| Top-5 always same 5 fonts | Shape mismatch `(128,128,3)` vs `(128,128,1)` | Fix reshape to `(1,128,128,1)` |
| Mean pixel `100–180`, probs spread | Everything is correct | Bug is elsewhere |

The most common fix is **Cause 1 + Cause 3 together** — removing the `/255.0` and switching from `.convert("RGB")` to `.convert("L")`.

