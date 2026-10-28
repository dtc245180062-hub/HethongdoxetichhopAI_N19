# 🚗 DoXeAI - YOLOv8 License Plate Recognition Service

Dịch vụ AI Microservice nhận diện biển số xe tốc độ cao sử dụng **YOLOv8 (Ultralytics)** và **FastAPI**.

---

## 📌 Tính Năng
- **Phát hiện phương tiện & biển số xe**: Ứng dụng mô hình YOLOv8 tối ưu cho tốc độ nhận diện chỉ **~15ms - 100ms / ảnh**.
- **Tiền xử lý ảnh thông minh**: Sử dụng OpenCV lọc nhiễu, nhị phân hóa thích ứng (Adaptive Thresholding) để tách rõ nét ký tự.
- **Phân tích định dạng biển số xe Việt Nam**:
  - Ô tô: `30H-892.45`, `51K-345.67`, `29A-688.99`
  - Xe máy: `29-X1 567.89`, `59-P2 998.11`, `23-D1 497.07`
- **Tự động tải model**: Tự động tải `yolov8n.pt` nếu chưa có sẵn.
- **Hỗ trợ nạp Custom Model**: Nếu có file trọng số biển số xe tùy chỉnh, đặt vào `ai_engine/weights/plate_yolov8.pt`, dịch vụ sẽ tự động ưu tiên nạp file này.

---

## 🚀 Cách Khởi Động

### Cách 1: Sử dụng file script (Windows)
Chạy file [run_service.bat](file:///d:/DoXeAI/ai_engine/run_service.bat) hoặc [run_service.ps1](file:///d:/DoXeAI/ai_engine/run_service.ps1).

### Cách 2: Khởi động qua dòng lệnh
```bash
cd ai_engine
python main.py
```
Dịch vụ sẽ lắng nghe tại: `http://localhost:8000`

### Cách 3: Chạy đồng thời toàn bộ hệ thống từ thư mục gốc
Tại thư mục gốc dự án:
```bash
npm run dev:all
```
*(Chạy đồng thời cả YOLOv8 AI Service (port 8000), Backend Express (port 5000), và Frontend React (port 5173))*

---

## 📡 API Endpoints

### 1. Kiểm tra trạng thái: `GET /health`
```json
{
  "status": "healthy",
  "service": "DoXeAI YOLOv8 Recognition Engine",
  "device": "CPU",
  "model_file": "yolov8n.pt"
}
```

### 2. Nhận diện biển số: `POST /predict-plate`
- **Body**: `multipart/form-data` với key `file` (ảnh định dạng JPG, PNG).
- **Response**:
```json
{
  "success": true,
  "bien_so": "30H-892.45",
  "do_tin_cay": 0.88,
  "loai_xe": "OTO",
  "vehicle_class": "car",
  "box": [120, 240, 450, 310],
  "thoi_gian_xu_ly_ms": 112,
  "engine": "YOLOv8 (CPU)"
}
```
