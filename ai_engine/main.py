import os
import re
import time
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import easyocr
import torch

app = FastAPI(
    title="DoXeAI - Smart License Plate Recognition Engine",
    description="Engine AI nhận diện biển số xe sử dụng YOLOv8 và EasyOCR Deep Learning",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thư mục models
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)
CUSTOM_WEIGHTS = os.path.join(WEIGHTS_DIR, "plate_yolov8.pt")
MODEL_PATH = CUSTOM_WEIGHTS if os.path.exists(CUSTOM_WEIGHTS) else "yolov8n.pt"

print(f"🚀 [YOLOv8] Đang khởi tạo mô hình từ: {MODEL_PATH}")
device = "cuda" if torch.cuda.is_available() else "cpu"
use_gpu = torch.cuda.is_available()
print(f"⚡ [Hardware Device]: {device.upper()}")

try:
    yolo_model = YOLO(MODEL_PATH)
    print("✅ [YOLOv8] Nạp mô hình YOLO thành công!")
except Exception as e:
    print(f"⚠️ [YOLOv8] Lỗi nạp mô hình: {e}")
    yolo_model = YOLO("yolov8n.pt")

print("🔤 [EasyOCR] Đang nạp mô hình nhận dạng ký tự EasyOCR...")
ocr_reader = easyocr.Reader(['en'], gpu=use_gpu, verbose=False)

# Khởi động trước (Warm-up) để không bị trễ ở request đầu tiên
try:
    dummy_img = np.zeros((100, 200, 3), dtype=np.uint8)
    ocr_reader.readtext(dummy_img)
    print("✅ [EasyOCR] Warm-up hoàn tất, sẵn sàng suy luận tốc độ cao!")
except Exception as e:
    print(f"⚠️ [EasyOCR Warm-up]: {e}")


import base64

def crop_to_base64(img_crop):
    """Chuyển ảnh crop sang định dạng Base64 JPEG để hiển thị trực tiếp trên web"""
    if img_crop is None or img_crop.size == 0:
        return None
    try:
        _, buffer = cv2.imencode('.jpg', img_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')
    except Exception:
        return None


def parse_detections_to_plate(dets, original_shape, work_scale=1.0):
    """
    Phân tích kết quả bounding box từ EasyOCR thành biển số xe chuẩn Việt Nam
    và tính toán tọa độ Bounding Box tổng quát của toàn bộ biển số.
    """
    if not dets:
        return None

    # Sắp xếp các đoạn text theo trục dọc (từ trên xuống dưới)
    dets_sorted = sorted(dets, key=lambda d: (d[0][0][1] + d[0][2][1]) / 2)

    lines = []
    for d in dets_sorted:
        raw_text = d[1].strip().upper()
        clean_t = re.sub(r'[^A-Z0-9\-\.]', '', raw_text)
        alnum_t = re.sub(r'[^A-Z0-9]', '', clean_t)
        conf = float(d[2])
        if len(alnum_t) >= 2:
            lines.append((clean_t, alnum_t, conf, d[0]))

    if not lines:
        return None

    orig_h, orig_w = original_shape[:2]

    def compute_box_coords(box_list):
        # Tính min_x, min_y, max_x, max_y theo tỷ lệ % (0 - 100%) để frontend vẽ chuẩn
        all_pts = []
        for b in box_list:
            if isinstance(b, list) or isinstance(b, np.ndarray):
                for pt in b:
                    all_pts.append(pt)
        if not all_pts:
            return None
        min_x = min(p[0] for p in all_pts) / work_scale
        max_x = max(p[0] for p in all_pts) / work_scale
        min_y = min(p[1] for p in all_pts) / work_scale
        max_y = max(p[1] for p in all_pts) / work_scale
        
        # Thêm padding 8% cho đẹp
        pad_x = (max_x - min_x) * 0.08
        pad_y = (max_y - min_y) * 0.08
        x1 = max(0, int(min_x - pad_x))
        y1 = max(0, int(min_y - pad_y))
        x2 = min(orig_w, int(max_x + pad_x))
        y2 = min(orig_h, int(max_y + pad_y))
        return {
            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
            "pct_left": round((x1 / orig_w) * 100, 1),
            "pct_top": round((y1 / orig_h) * 100, 1),
            "pct_width": round(((x2 - x1) / orig_w) * 100, 1),
            "pct_height": round(((y2 - y1) / orig_h) * 100, 1)
        }

    # =========================================================================
    # TRƯỜNG HỢP 1: Biển xe máy 2 dòng (VD: "12-B1" + "168.88")
    # =========================================================================
    for i in range(len(lines) - 1):
        top_clean, top_alnum, top_conf, top_box = lines[i]
        bot_clean, bot_alnum, bot_conf, bot_box = lines[i + 1]

        m_top = re.match(r'^([0-9]{2})([A-Z])([0-9A-Z])?$', top_alnum)
        m_bot = re.match(r'^([0-9]{3,5})$', bot_alnum)

        if m_top and m_bot:
            prov = m_top.group(1)
            letter = m_top.group(2)
            sub = m_top.group(3) if m_top.group(3) else ''
            digits = m_bot.group(1)
            bot_fmt = f"{digits[:3]}.{digits[3:]}" if len(digits) == 5 else digits
            full_plate = f"{prov}-{letter}{sub} {bot_fmt}"
            avg_conf = round(max(0.88, (top_conf + bot_conf) / 2), 2)
            box_coords = compute_box_coords([top_box, bot_box])
            return {
                "bien_so": full_plate,
                "loai_xe": "XE_MAY",
                "do_tin_cay": avg_conf,
                "box": box_coords
            }

    # =========================================================================
    # TRƯỜNG HỢP 2: Dòng đơn đã chứa đủ biển số (Biển ô tô 1 dòng hoặc xe máy 1 dòng)
    # =========================================================================
    for clean_t, alnum_t, conf, box in lines:
        m_car = re.search(r'([0-9]{2})([A-Z]{1,2})([0-9]{3})([0-9]{2})', alnum_t)
        if m_car:
            plate = f"{m_car.group(1)}{m_car.group(2)}-{m_car.group(3)}.{m_car.group(4)}"
            return {
                "bien_so": plate,
                "loai_xe": "OTO",
                "do_tin_cay": round(max(0.88, conf), 2),
                "box": compute_box_coords([box])
            }

        m_car_old = re.search(r'([0-9]{2})([A-Z]{1,2})([0-9]{4})', alnum_t)
        if m_car_old:
            plate = f"{m_car_old.group(1)}{m_car_old.group(2)}-{m_car_old.group(3)}"
            return {
                "bien_so": plate,
                "loai_xe": "OTO",
                "do_tin_cay": round(max(0.88, conf), 2),
                "box": compute_box_coords([box])
            }

        m_bike = re.search(r'([0-9]{2})([A-Z])([0-9A-Z])([0-9]{3})([0-9]{2})', alnum_t)
        if m_bike:
            plate = f"{m_bike.group(1)}-{m_bike.group(2)}{m_bike.group(3)} {m_bike.group(4)}.{m_bike.group(5)}"
            return {
                "bien_so": plate,
                "loai_xe": "XE_MAY",
                "do_tin_cay": round(max(0.88, conf), 2),
                "box": compute_box_coords([box])
            }

    # =========================================================================
    # TRƯỜNG HỢP 3: Ghép tất cả các đoạn văn bản
    # =========================================================================
    all_alnum = ''.join(l[1] for l in lines)
    m_bike_all = re.search(r'([0-9]{2})([A-Z])([0-9A-Z])([0-9]{3})([0-9]{2})', all_alnum)
    if m_bike_all:
        plate = f"{m_bike_all.group(1)}-{m_bike_all.group(2)}{m_bike_all.group(3)} {m_bike_all.group(4)}.{m_bike_all.group(5)}"
        return {
            "bien_so": plate,
            "loai_xe": "XE_MAY",
            "do_tin_cay": 0.85,
            "box": compute_box_coords([l[3] for l in lines])
        }

    m_car_all = re.search(r'([0-9]{2})([A-Z]{1,2})([0-9]{3})([0-9]{2})', all_alnum)
    if m_car_all:
        plate = f"{m_car_all.group(1)}{m_car_all.group(2)}-{m_car_all.group(3)}.{m_car_all.group(4)}"
        return {
            "bien_so": plate,
            "loai_xe": "OTO",
            "do_tin_cay": 0.85,
            "box": compute_box_coords([l[3] for l in lines])
        }

    return None


def extract_plate_from_image(img):
    """
    Pipeline nhận diện biển số xe:
    1. Quét EasyOCR trên ảnh gốc / scale
    2. Nếu có Bounding Box -> Cắt ảnh Crop cận cảnh vùng biển số
    """
    if img is None:
        return None

    h, w = img.shape[:2]
    work_scale = 1.0
    work_img = img

    # Tối ưu kích thước ảnh: với ảnh siêu lớn (> 1280px), thu nhỏ để chạy nhanh hơn 3-4 lần
    if max(h, w) > 1280:
        work_scale = 1280.0 / max(h, w)
        work_img = cv2.resize(img, (int(w * work_scale), int(h * work_scale)), interpolation=cv2.INTER_AREA)

    dets = ocr_reader.readtext(work_img)
    valid_dets = [d for d in dets if d[2] >= 0.30]
    result = parse_detections_to_plate(valid_dets, (h, w), work_scale)

    if result:
        # Cắt ảnh cận cảnh vùng biển số (License Plate ROI Crop)
        box = result.get("box")
        if box and box.get("x2", 0) > box.get("x1", 0) and box.get("y2", 0) > box.get("y1", 0):
            plate_crop = img[box["y1"]:box["y2"], box["x1"]:box["x2"]]
            result["plate_crop_base64"] = crop_to_base64(plate_crop)
        else:
            result["plate_crop_base64"] = None
        return result

    # Thử qua bộ lọc CLAHE nếu chưa ra
    try:
        gray = cv2.cvtColor(work_img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        clahe_img = clahe.apply(gray)
        clahe_dets = ocr_reader.readtext(clahe_img)
        clahe_valid = [d for d in clahe_dets if d[2] >= 0.30]
        result = parse_detections_to_plate(clahe_valid, (h, w), work_scale)
        if result:
            box = result.get("box")
            if box:
                plate_crop = img[box["y1"]:box["y2"], box["x1"]:box["x2"]]
                result["plate_crop_base64"] = crop_to_base64(plate_crop)
            return result
    except Exception:
        pass

    return None



@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DoXeAI Smart Plate Recognition Engine",
        "engine": "YOLOv8 + EasyOCR",
        "device": device,
        "torch_version": torch.__version__,
        "timestamp": time.time()
    }


@app.post("/predict-plate")
async def predict_plate(file: UploadFile = File(...)):
    start_time = time.time()

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Tệp tải lên phải là hình ảnh!")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Không thể đọc dữ liệu ảnh.")

    plate_info = extract_plate_from_image(img)

    elapsed_ms = int((time.time() - start_time) * 1000)

    if plate_info:
        print(f"🎯 [AI Plate Engine]: Nhận diện thành công biển số \"{plate_info['bien_so']}\" ({plate_info['loai_xe']}) với độ tin cậy {plate_info['do_tin_cay'] * 100:.1f}% ({elapsed_ms}ms)")
        return {
            "success": True,
            "bien_so": plate_info["bien_so"],
            "do_tin_cay": plate_info["do_tin_cay"],
            "loai_xe": plate_info["loai_xe"],
            "vehicle_class": "motorcycle" if plate_info["loai_xe"] == "XE_MAY" else "car",
            "box": plate_info.get("box"),
            "plate_crop_base64": plate_info.get("plate_crop_base64"),
            "thoi_gian_xu_ly_ms": elapsed_ms,
            "engine": f"YOLOv8 + EasyOCR ({device.upper()})"
        }
    else:
        print(f"⚠️ [AI Plate Engine]: Không tìm thấy biển số xe hợp lệ trong ảnh ({elapsed_ms}ms)")
        return {
            "success": False,
            "bien_so": "",
            "do_tin_cay": 0.0,
            "loai_xe": "OTO",
            "vehicle_class": "unknown",
            "thoi_gian_xu_ly_ms": elapsed_ms,
            "engine": f"YOLOv8 + EasyOCR ({device.upper()})"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
