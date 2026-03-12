
import os
import sys
import argparse
import numpy as np
from PIL import Image
from ai_edge_litert.interpreter import Interpreter
import json

# Configuration
IMAGE_SIZE = 128
MODEL_PATH = "models/font_classifier.tflite"
MAPPING_PATH = "models/idx_to_slug.json"

def test_direct(image_path):
    print(f"Loading model from {MODEL_PATH}...")
    interpreter = Interpreter(MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    print(f"Loading mapping from {MAPPING_PATH}...")
    with open(MAPPING_PATH, 'r') as f:
        idx_to_slug = json.load(f)

    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found.")
        return

    print(f"Processing image {image_path}...")
    img = Image.open(image_path).convert('L')
    
    # Base 128x128 patch
    img_128 = img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
    patch_128 = np.array(img_128).astype(np.float32)

    # 64x64 -> 128x128 patch
    img_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
    img_64_to_128 = img_64.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
    patch_64_to_128 = np.array(img_64_to_128).astype(np.float32)

    # Try all normalization schemes
    schemes = [
        ("Normalized [0, 1] (128)", patch_128 / 255.0),
        ("Raw [0, 255] (128)", patch_128),
        ("Inverted Raw [255, 0] (128)", 255.0 - patch_128),
        ("Raw [0, 255] (64 -> 128)", patch_64_to_128),
        ("Centered [-1, 1] (128)", (patch_128 - 127.5) / 127.5)
    ]

    for name, inp_data in schemes:
        print(f"\n--- Testing System: {name} ---")
        inp = inp_data.reshape(1, IMAGE_SIZE, IMAGE_SIZE, 1)
        interpreter.set_tensor(input_details[0]["index"], inp)
        interpreter.invoke()
        
        probs = interpreter.get_tensor(output_details[0]["index"])[0]
        sorted_idx = np.argsort(probs)[::-1]
        
        print(f"Top 5 predictions:")
        for i in range(5):
            idx = sorted_idx[i]
            slug = idx_to_slug.get(str(idx), f"Unknown({idx})")
            val = probs[idx]
            print(f"  {slug:25} (idx {idx:3}): {val:.6f}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, default="debug_patches/patch_1773341072841.png")
    args = parser.parse_args()
    test_direct(args.image)
