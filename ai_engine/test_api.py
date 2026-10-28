import requests
import sys
import os

URL = "http://localhost:8000/predict-plate"

def test_image(image_path):
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return

    print(f"\n🚀 Đang gửi ảnh kiểm thử: {image_path}")
    with open(image_path, "rb") as f:
        files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
        try:
            res = requests.post(URL, files=files, timeout=10)
            print("Status code:", res.status_code)
            print("Response:", res.json())
        except Exception as e:
            print("Error connecting to YOLOv8 service:", e)

if __name__ == "__main__":
    test_img = sys.argv[1] if len(sys.argv) > 1 else "../backend/uploads/plate-1787582830275-878774211.jpg"
    test_image(test_img)
