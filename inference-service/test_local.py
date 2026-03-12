# inference-service/test_local.py
import requests
from pathlib import Path

BASE_URL = "http://127.0.0.1:8080"
TEST_IMAGES_DIR = Path(__file__).parent.parent / "ml" / "test_images"

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
    try:
        test_health()
        test_error_cases()
    except Exception as e:
        print(f"⚠️ Initial tests failed (is the server running?): {e}")

    images = list(TEST_IMAGES_DIR.glob("*.png")) + list(TEST_IMAGES_DIR.glob("*.jpg"))
    if not images:
        print(f"\n⚠️  No test images found in {TEST_IMAGES_DIR}")
    else:
        for img in images:
            test_recognition(img)
