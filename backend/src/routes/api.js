const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const parkingController = require('../controllers/parkingController');
const authController = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Cấu hình Multer lưu ảnh vào thư mục uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'plate-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận tệp hình ảnh (JPEG, PNG, WEBP)!'), false);
    }
  }
});

// ==========================================
// 1. MODULE XÁC THỰC & NGƯỜI DÙNG (AUTH & RBAC)
// ==========================================
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/me', authController.getMe);
router.post('/auth/logout', authController.logout);

// Quản lý nhân viên/tài khoản (Admin)
router.get('/users', authController.getUsers);
router.post('/users', authController.createUser);
router.put('/users/:id', authController.updateUser);
router.delete('/users/:id', authController.deleteUser);

// ==========================================
// 2. CÁC API ENDPOINTS XE VÀO / XE RA & VỊ TRÍ
// ==========================================

// POST /api/xe-vao: Xe vào bãi + AI OCR + gán vị trí đỗ
router.post('/xe-vao', upload.single('image'), parkingController.xeVao);
router.post('/check-in', upload.single('image'), parkingController.xeVao); // Alias

// POST /api/xe-ra: Xe ra bãi + Tính phí tự động / Nhận diện vé tháng + Giải phóng vị trí
router.post('/xe-ra', upload.single('image'), parkingController.xeRa);
router.post('/check-out', upload.single('image'), parkingController.xeRa); // Alias

// GET & PATCH /api/vi-tri: Lấy danh sách & Cập nhật trạng thái bảo trì ô đỗ
router.get('/vi-tri', parkingController.getViTriList);
router.get('/vitri', parkingController.getViTriList); // Alias
router.patch('/vi-tri/:id/status', parkingController.updateViTriStatus);
router.put('/vi-tri/:id/status', parkingController.updateViTriStatus);

// GET /api/dashboard: Thống kê tổng số xe, chỗ trống, doanh thu ngày
router.get('/dashboard', parkingController.getDashboard);
router.get('/overview', parkingController.getDashboard); // Alias

// ==========================================
// 3. QUẢN LÝ PHƯƠNG TIỆN, BẢNG GIÁ, LỊCH SỬ & AI
// ==========================================

// Phân khu
router.get('/khu-vuc', parkingController.getKhuVucList);
router.get('/khuvuc', parkingController.getKhuVucList);

// Quản lý danh sách phương tiện & Vé tháng (CRUD)
router.get('/xe', parkingController.getXeList);
router.post('/xe', parkingController.createXe);
router.put('/xe/:id', parkingController.updateXe);
router.delete('/xe/:id', parkingController.deleteXe);

// Lịch sử vào ra
router.get('/luot-vao-ra', parkingController.getLuotVaoRaList);
router.get('/luotvaora', parkingController.getLuotVaoRaList);

// Bảng giá dịch vụ (Xem & Cập nhật)
router.get('/bang-gia', parkingController.getBangGiaList);
router.get('/banggia', parkingController.getBangGiaList);
router.put('/bang-gia/:id', parkingController.updateBangGia);

// Quét biển số AI độc lập
router.post('/ai/detect-plate', upload.single('image'), parkingController.mockAiDetectEndpoint);

const { requireAdmin } = require('../middlewares/authMiddleware');

// Trợ lý AI phân tích và hỗ trợ quản trị viên (Admin AI Assistant)
// Yêu cầu phân quyền ADMIN (trả HTTP 403 nếu không phải ADMIN)
router.post('/admin/assistant/ask', requireAdmin, parkingController.handleAdminAssistantAsk);
router.post('/assistant/ask', requireAdmin, parkingController.handleAdminAssistantAsk);

// Endpoints tương thích cho Widget và kiểm thử
router.post('/ai-assistant', parkingController.handleAiAssistant);
router.post('/assistant', parkingController.handleAiAssistant);

// ==========================================
// 4. API DÀNH RIÊNG CHO KHÁCH HÀNG & CƯ DÂN
// ==========================================
router.get('/khach-hang/lich-su', parkingController.customerGetHistory);
router.post('/khach-hang/dat-cho', parkingController.customerBookSlot);
router.post('/khach-hang/ho-tro', parkingController.customerSendSupport);
router.get('/khach-hang/ho-tro', parkingController.customerGetSupportList);

// ==========================================
// 5. QUẢN LÝ DANH SÁCH ĐEN (BLACKLIST) - ADMIN
// ==========================================
router.get('/blacklist', parkingController.getBlacklist);
router.post('/blacklist', requireRole(['ADMIN', 'BAO_VE']), parkingController.addBlacklist);
router.delete('/blacklist/:id', requireRole(['ADMIN', 'BAO_VE', 'QUAN_LY_DIEU_HANH']), parkingController.deleteBlacklist);
module.exports = router;
