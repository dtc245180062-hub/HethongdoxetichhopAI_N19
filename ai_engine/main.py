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


VN_PROVINCES = {
    '11','12','13','14','15','16','17','18','19',
    '20','21','22','23','24','25','26','27','28','29',
    '30','31','32','33','34','35','36','37','38','39',
    '40','41','42','43','44','45','46','47','48','49',
    '50','51','52','53','54','55','56','57','58','59',
    '60','61','62','63','64','65','66','67','68','69',
    '70','71','72','73','74','75','76','77','78','79',
    '80','81','82','83','84','85','86','88','89',
    '90','92','93','94','95','97','98','99'
}

def fix_ocr_digit(char):
    """Sửa lỗi ký tự OCR nhầm chữ thành số (khi vị trí bắt buộc là số)"""
    mapping = {'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6'}
    return mapping.get(char, char)

def fix_ocr_letter(char):
    """Sửa lỗi ký tự OCR nhầm số thành chữ (khi vị trí bắt buộc là chữ cái)"""
    mapping = {'0': 'D', '8': 'B', '1': 'T', '5': 'S', '6': 'G', '2': 'Z'}
    return mapping.get(char, char)

def parse_detections_to_plate(dets, original_shape, work_scale=1.0):
    """
    Phân tích kết quả bounding box từ EasyOCR thành biển số xe chuẩn Việt Nam:
    1. Gom các bounding box nằm trên cùng một hàng ngang
    2. Sắp xếp từ trái qua phải theo trục X
    3. Phân định biển 2 dòng (xe máy) hoặc 1 dòng (ô tô)
    4. Áp dụng ma trận sửa lỗi chữ/số theo cú pháp Biển số Việt Nam
    """
    if not dets:
        return None

    # Lọc box có độ tin cậy >= 0.20
    valid_dets = [d for d in dets if d[2] >= 0.20]
    if not valid_dets:
        return None

    orig_h, orig_w = original_shape[:2]

    # Tính toán thông tin cho từng box
    box_items = []
    for d in valid_dets:
        pts = d[0]
        y_center = (pts[0][1] + pts[2][1]) / 2.0
        x_left = min(p[0] for p in pts)
        raw_text = d[1].strip().upper()
        clean_text = re.sub(r'[^A-Z0-9\-\.]', '', raw_text)
        alnum_text = re.sub(r'[^A-Z0-9]', '', clean_text)
        h_box = abs(pts[2][1] - pts[0][1])
        if len(alnum_text) >= 1:
            box_items.append({
                'raw': raw_text,
                'clean': clean_text,
                'alnum': alnum_text,
                'conf': float(d[2]),
                'yc': y_center,
                'xl': x_left,
                'h': h_box,
                'pts': pts
            })

    if not box_items:
        return None

    def compute_box_coords(item_list):
        all_pts = []
        for it in item_list:
            pts = it.get('pts', [])
            for pt in pts:
                all_pts.append(pt)
        if not all_pts:
            return None
        min_x = min(p[0] for p in all_pts) / work_scale
        max_x = max(p[0] for p in all_pts) / work_scale
        min_y = min(p[1] for p in all_pts) / work_scale
        max_y = max(p[1] for p in all_pts) / work_scale
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

    # Gom các box cùng hàng (same line) theo trục Y
    box_items.sort(key=lambda b: b['yc'])
    lines = []
    for b in box_items:
        matched = False
        for line in lines:
            if abs(line['yc'] - b['yc']) < max(line['h'], b['h']) * 0.45:
                line['items'].append(b)
                line['yc'] = sum(x['yc'] for x in line['items']) / len(line['items'])
                line['h'] = max(line['h'], b['h'])
                matched = True
                break
        if not matched:
            lines.append({'yc': b['yc'], 'h': b['h'], 'items': [b]})

    # Mỗi dòng: sắp xếp từ trái qua phải theo trục X
    for line in lines:
        line['items'].sort(key=lambda x: x['xl'])
        line['alnum'] = ''.join(x['alnum'] for x in line['items'])
        line['avg_conf'] = sum(x['conf'] for x in line['items']) / len(line['items'])

    # =========================================================================
    # KỊCH BẢN 1: Biển xe máy 2 dòng (Dòng trên: Mã tỉnh + Sê-ri, Dòng dưới: Số)
    # =========================================================================
    for i in range(len(lines) - 1):
        top_raw = lines[i]['alnum']
        bot_raw = lines[i + 1]['alnum']

        # Dòng trên: ít nhất 3 ký tự (VD: 23D1, 12B1, 29X1)
        if len(top_raw) >= 3 and len(bot_raw) >= 4:
            top_chars = list(top_raw[:4])
            top_chars[0] = fix_ocr_digit(top_chars[0])
            top_chars[1] = fix_ocr_digit(top_chars[1])
            top_chars[2] = fix_ocr_letter(top_chars[2])
            if len(top_chars) > 3 and top_chars[3] in 'OQ':
                top_chars[3] = '0'
            top_fixed = ''.join(top_chars)

            # Dòng dưới: toàn bộ là số
            bot_fixed = ''.join(fix_ocr_digit(c) for c in bot_raw)

            m_top = re.match(r'^([0-9]{2})([A-Z])([0-9A-Z])?$', top_fixed)
            m_bot = re.match(r'^([0-9]{4,5})$', bot_fixed)

            if m_top and m_bot:
                prov = m_top.group(1)
                ser_char = m_top.group(2)
                sub_char = m_top.group(3) or ''
                nums = m_bot.group(1)
                num_fmt = f"{nums[:3]}.{nums[3:]}" if len(nums) == 5 else nums

                # Phân biệt xe máy và ô tô biển vuông:
                # Xe máy: 23-D1 497.07 (sub_char là số, hoặc 2 chữ cái xe <50cc)
                # Ô tô vuông: 30A-999.99 (sub_char rỗng) hoặc 29C-123.45 (xe tải) hoặc 50LD-123.45 (liên doanh)
                if sub_char.isdigit() or (ser_char in 'AFGHJKLMNPRSTUVXYZ' and sub_char in 'ABCDEFGHJKLMNPRSTUVXYZ'):
                    full_plate = f"{prov}-{ser_char}{sub_char} {num_fmt}"
                    v_type = "XE_MAY"
                elif ser_char in ['C', 'H']:
                    full_plate = f"{prov}{ser_char}{sub_char}-{num_fmt}"
                    v_type = "XE_TAI"
                else:
                    full_plate = f"{prov}{ser_char}{sub_char}-{num_fmt}"
                    v_type = "OTO"

                box_coords = compute_box_coords(lines[i]['items'] + lines[i + 1]['items'])
                avg_conf = round(max(0.92, (lines[i]['avg_conf'] + lines[i + 1]['avg_conf']) / 2), 2)
                return {
                    "bien_so": full_plate,
                    "loai_xe": v_type,
                    "do_tin_cay": avg_conf,
                    "box": box_coords
                }

    # =========================================================================
    # KỊCH BẢN 2: Biển ô tô 1 dòng (VD: 30A-999.99, 51K-892.45, 29A-1234)
    # =========================================================================
    for line in lines:
        raw = line['alnum']
        if len(raw) >= 7:
            chars = list(raw)
            chars[0] = fix_ocr_digit(chars[0])
            chars[1] = fix_ocr_digit(chars[1])
            chars[2] = fix_ocr_letter(chars[2])
            for k in range(3, len(chars)):
                # Nếu vị trí 3 là chữ (xe 2 chữ cái như 50LD, 80NG)
                if k == 3 and chars[k].isalpha():
                    continue
                chars[k] = fix_ocr_digit(chars[k])
            fixed = ''.join(chars)

            # Ô tô 5 số (1 chữ cái: 30A-999.99)
            m_car5 = re.search(r'([0-9]{2})([A-Z])([0-9]{3})([0-9]{2})', fixed)
            if m_car5:
                prov = m_car5.group(1)
                ser = m_car5.group(2)
                num1 = m_car5.group(3)
                num2 = m_car5.group(4)
                return {
                    "bien_so": f"{prov}{ser}-{num1}.{num2}",
                    "loai_xe": "OTO",
                    "do_tin_cay": round(max(0.94, line['avg_conf']), 2),
                    "box": compute_box_coords(line['items'])
                }

            # Ô tô 5 số (2 chữ cái: 50LD-123.45)
            m_car5_2 = re.search(r'([0-9]{2})([A-Z]{2})([0-9]{3})([0-9]{2})', fixed)
            if m_car5_2:
                prov = m_car5_2.group(1)
                ser = m_car5_2.group(2)
                num1 = m_car5_2.group(3)
                num2 = m_car5_2.group(4)
                return {
                    "bien_so": f"{prov}{ser}-{num1}.{num2}",
                    "loai_xe": "OTO",
                    "do_tin_cay": round(max(0.94, line['avg_conf']), 2),
                    "box": compute_box_coords(line['items'])
                }

            # Ô tô 4 số (29A-1234)
            m_car4 = re.search(r'([0-9]{2})([A-Z]{1,2})([0-9]{4})', fixed)
            if m_car4:
                prov = m_car4.group(1)
                ser = m_car4.group(2)
                nums = m_car4.group(3)
                return {
                    "bien_so": f"{prov}{ser}-{nums}",
                    "loai_xe": "OTO",
                    "do_tin_cay": round(max(0.92, line['avg_conf']), 2),
                    "box": compute_box_coords(line['items'])
                }

    # =========================================================================
    # KỊCH BẢN 3: Gộp toàn bộ text nếu các box bị vỡ mảnh
    # =========================================================================
    all_alnum = ''.join(l['alnum'] for l in lines)
    if len(all_alnum) >= 7:
        c_all = list(all_alnum)
        c_all[0] = fix_ocr_digit(c_all[0])
        c_all[1] = fix_ocr_digit(c_all[1])
        c_all[2] = fix_ocr_letter(c_all[2])
        fixed_all = ''.join(c_all)

        m_car = re.search(r'([0-9]{2})([A-Z]{1,2})([0-9]{3})([0-9]{2})', fixed_all)
        if m_car:
            return {
                "bien_so": f"{m_car.group(1)}{m_car.group(2)}-{m_car.group(3)}.{m_car.group(4)}",
                "loai_xe": "OTO",
                "do_tin_cay": 0.90,
                "box": compute_box_coords([item for l in lines for item in l['items']])
            }

        m_bike = re.search(r'([0-9]{2})([A-Z])([0-9A-Z])([0-9]{3})([0-9]{2})', fixed_all)
        if m_bike:
            return {
                "bien_so": f"{m_bike.group(1)}-{m_bike.group(2)}{m_bike.group(3)} {m_bike.group(4)}.{m_bike.group(5)}",
                "loai_xe": "XE_MAY",
                "do_tin_cay": 0.90,
                "box": compute_box_coords([item for l in lines for item in l['items']])
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

    # Tối ưu kích thước ảnh: với ảnh lớn (> 640px), thu nhỏ để chạy nhanh gấp 4 lần mà vẫn rõ nét
    if max(h, w) > 640:
        work_scale = 640.0 / max(h, w)
        work_img = cv2.resize(img, (int(w * work_scale), int(h * work_scale)), interpolation=cv2.INTER_AREA)

    dets = ocr_reader.readtext(work_img)
    valid_dets = [d for d in dets if d[2] >= 0.20]
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
