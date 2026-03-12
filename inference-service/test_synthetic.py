
import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from ai_edge_litert.interpreter import Interpreter
import json

def create_synthetic_test():
    font_path = "/Users/jj/Downloads/fontfinder/fonts/abril-fatface.ttf"
    mapping_path = "/Users/jj/Downloads/fontfinder/inference-service/models/idx_to_slug.json"
    model_path = "/Users/jj/Downloads/fontfinder/inference-service/models/font_classifier.tflite"
    
    # 1. Create 128x128 synthetic image
    img = Image.new("L", (128, 128), color=255)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(font_path, 40)
        draw.text((10, 40), "CLASS", fill=0, font=font)
    except:
        print("Could not load font")
        return

    # 2. Prepare for model
    patch = np.array(img).astype(np.float32)
    # Test multiple normalizations
    schemes = [
        ("Raw [0, 255]", patch),
        ("Normalized [0, 1]", patch / 255.0),
        ("Inverted [1, 0]", 1.0 - (patch / 255.0)),
        ("Centered [-1, 1]", (patch - 127.5) / 127.5)
    ]

    print(f"Loading model and mapping...")
    interpreter = Interpreter(model_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    with open(mapping_path, 'r') as f:
        idx_to_slug = json.load(f)

    for name, inp_data in schemes:
        print(f"\n--- Testing System: {name} ---")
        inp = inp_data.reshape(1, 128, 128, 1)
        interpreter.set_tensor(input_details[0]["index"], inp)
        interpreter.invoke()
        
        probs = interpreter.get_tensor(output_details[0]["index"])[0]
        sorted_idx = np.argsort(probs)[::-1]
        
        print(f"Top 3 predictions:")
        for i in range(3):
            idx = sorted_idx[i]
            slug = idx_to_slug.get(str(idx), f"Unknown({idx})")
            val = probs[idx]
            print(f"  {slug}: {val:.4f}")

if __name__ == "__main__":
    create_synthetic_test()
