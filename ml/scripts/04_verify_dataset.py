import json
from pathlib import Path
from collections import Counter

DATASET_DIR = Path("../dataset")

if not (DATASET_DIR / "label_map.json").exists():
    print(f"❌ Error: label_map.json not found in {DATASET_DIR}")
    exit(1)

with open(DATASET_DIR / "label_map.json") as f:
    label_map = json.load(f)

counts = {}
empty_classes = []
low_classes = []

for slug in label_map:
    class_dir = DATASET_DIR / slug
    n = len(list(class_dir.glob("*.png"))) if class_dir.exists() else 0
    counts[slug] = n
    if n == 0:
        empty_classes.append(slug)
    elif n < 200:
        low_classes.append((slug, n))

total = sum(counts.values())
avg = total / len(counts) if counts else 0

print(f"📊 Dataset Summary")
print(f"   Classes:        {len(label_map)}")
print(f"   Total samples:  {total:,}")
print(f"   Avg per class:  {avg:.0f}")
if counts:
    print(f"   Min per class:  {min(counts.values())}")
    print(f"   Max per class:  {max(counts.values())}")

if empty_classes:
    print(f"\n❌ Empty classes: {empty_classes}")

if low_classes:
    print(f"\n⚠️  Low sample classes: {low_classes}")

if not empty_classes and total > 0:
    print(f"\n✅ Ready to train: {len(label_map)} classes")
