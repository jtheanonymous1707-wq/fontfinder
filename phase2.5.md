<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# ✅ Phase 1 complete. Copy both files to inference-service/models/ for Phase 2.

/usr/local/lib/python3.12/dist-packages/tensorflow/lite/python/interpreter.py:457: UserWarning:     Warning: tf.lite.Interpreter is deprecated and is scheduled for deletion in
TF 2.20. Please use the LiteRT interpreter from the ai_edge_litert package.
See the [migration guide](%5Bhttps://ai.google.dev/edge/litert/migration%5D(https://ai.google.dev/edge/litert/migration))
for details.

warnings.warn(_INTERPRETER_DELETION_WARNING)

Phase 1 is complete. The warning is harmless — `tf.lite.Interpreter` still works fully in TF 2.19, it's only being removed in TF 2.20 which isn't out yet.

## What to Do With the Warning

**In Colab (Cell 11)** — ignore it, training is done and you won't use this again.

**In Phase 2 (Cloud Run `inference-service/`)** — swap `tflite-runtime` for `ai-edge-litert` since that's the official replacement. Update two files:

### `requirements.txt` — replace one line

```
# Remove this:
tflite-runtime==2.14.0

# Add this:
ai-edge-litert==1.0.1
```


### `predict.py` — replace one import line

```python
# Remove this:
import tflite_runtime.interpreter as tflite

# Add this:
from ai_edge_litert.interpreter import Interpreter as TFLiteInterpreter
```

Then update the interpreter instantiation:

```python
# Remove this:
interpreter = tflite.Interpreter(
    model_path=str(MODEL_PATH),
    num_threads=4,
)

# Add this:
interpreter = TFLiteInterpreter(
    model_path=str(MODEL_PATH),
    num_threads=4,
)
```

Everything else in `predict.py` stays identical — `get_input_details()`, `allocate_tensors()`, `invoke()` all have the same API.[^1]

***

## Phase 1 → Phase 2 Handoff Checklist

Download these two files from Google Drive and place them in `inference-service/models/`:

```bash
inference-service/
└── models/
    ├── font_classifier.tflite    ← from Drive/font_models/
    └── idx_to_slug.json          ← from Drive/font_models/
```

Then continue with **Phase 2, Step 1** — building the Docker container locally.

<div align="center">⁂</div>

[^1]: https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-service

