# DoXeAI - Hệ Thống Quản Lý Bãi Đỗ Xe Thông Minh Tích Hợp AI

Dự án Fullstack Monorepo hoàn chỉnh gồm **Backend** (Node.js/Express + Local JSON DB + Multer + AI OCR Simulation + AI Assistant NLP) và **Frontend** (React + Vite + Tailwind CSS + Lucide Icons + Floating AI Chatbot).

---

## 📁 Cấu trúc Thư mục

```
DoXeAI/
├── package.json               # Quản lý Monorepo & scripts chạy đồng thời
├── .gitignore
├── README.md
├── backend/                   # Node.js + Express.js API Server
│   ├── package.json           # express, cors, dotenv, multer, nodemon
│   ├── .env                   # Cấu hình biến môi trường (PORT=5000)
│   ├── server.js              # Entry point Express (Port 5000)
│   ├── test_api.js            # Script kiểm thử API chính
│   ├── test_assistant.js      # Script kiểm thử AI Assistant
│   ├── uploads/               # Lưu trữ ảnh chụp xe ra vào (Multer)
│   ├── data/
│   │   └── db.json            # Cơ sở dữ liệu JSON mô phỏng (KhuVuc, ViTri, Xe, LuotVaoRa, BangGia)
│   ├── services/
│   │   ├── aiService.js       # Giả lập nhận diện biển số OCR (độ tin cậy 0.6 - 0.99)
│   │   └── aiAssistantService.js # Phân tích ngôn ngữ tự nhiên hỗ trợ Admin (UC-12, UC-13, UC-14)
│   └── src/
│       ├── controllers/       # Controller xử lý nghiệp vụ xe vào, xe ra, vị trí, dashboard, assistant
│       ├── routes/            # Khai báo các API endpoints (/api/xe-vao, /api/xe-ra, /api/vi-tri, /api/dashboard, /api/ai-assistant)
│       └── utils/             # Tiện ích đọc/ghi db.json
└── frontend/                  # React + Vite + Tailwind CSS + Lucide Icons
    ├── package.json
    ├── vite.config.js         # Cấu hình Vite & Proxy đến Backend
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── App.jsx            # Layout chính & State Management
        ├── main.jsx
        ├── index.css          # Theme Tailwind & Glassmorphism
        ├── components/
        │   ├── Sidebar.jsx           # Thanh menu điều hướng
        │   ├── Dashboard.jsx         # Màn hình tổng quan & KPI
        │   ├── GateControl.jsx       # Cổng xe vào/ra 2 chiều + AI OCR + UC-15
        │   ├── ParkingMap.jsx        # Sơ đồ bãi xe Grid Card (Xanh: Trống, Đỏ: Đã đỗ)
        │   ├── HistoryLog.jsx        # Lịch sử vào ra & tìm kiếm
        │   ├── PricingTable.jsx      # Bảng giá dịch vụ
        │   └── AiAssistantWidget.jsx # Cửa sổ Chatbot AI Admin (UC-12, UC-13, UC-14)
        └── services/
            └── api.js         # Kết nối API Backend
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### 1. Cài đặt toàn bộ dependencies
```bash
npm run install:all
```

### 2. Khởi chạy toàn bộ hệ thống (1 Lệnh duy nhất)
```bash
npm run dev
```

- 🌐 **Giao diện Quản trị (Frontend)**: [http://localhost:5173](http://localhost:5173)
- 📡 **Máy chủ API (Backend)**: [http://localhost:5000](http://localhost:5000)

---

## 🤖 Tính năng Trợ Lý AI Quản Trị Viên (UC-12, UC-13, UC-14)

API Endpoint: `POST /api/ai-assistant`

| Mã Use Case | Tính năng | Câu hỏi mẫu |
| :--- | :--- | :--- |
| **UC-12** | **Phân tích khung giờ cao điểm** | *"Khung giờ nào đông xe nhất trong ngày?"* |
| **UC-13** | **Báo cáo doanh thu & hiệu suất** | *"Hãy báo cáo doanh thu hôm nay"* |
| **UC-14** | **Đề xuất bố trí & phân bổ nhân sự** | *"Nên bố trí bao nhiêu nhân sự ca chiều và ca tối?"* |

### Widget Chatbot trên Frontend:
- Nút Chat AI nổi ở góc dưới bên phải màn hình.
- Cho phép Admin gõ câu hỏi tự nhiên hoặc chọn các câu hỏi mẫu gợi ý.
- Trả về thông tin phân tích sắc nét, đề xuất điều hành thực tế và số liệu thống kê.
