const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const parkingController = require('../controllers/parkingController');
const authController = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Tự động phân tích Token người dùng nếu có cho mọi request
router.use(authenticate);

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

// Quản lý nhân viên/tài khoản (Chỉ Admin)
router.get('/users', requireRole(['ADMIN'], 'Chỉ Quản trị viên mới có quyền xem danh sách nhân viên!'), authController.getUsers);
router.post('/users', requireRole(['ADMIN'], 'Chỉ Quản trị viên mới có quyền tạo tài khoản nhân viên!'), authController.createUser);
router.put('/users/:id', requireRole(['ADMIN'], 'Chỉ Quản trị viên mới có quyền cập nhật tài khoản nhân viên!'), authController.updateUser);
router.delete('/users/:id', requireRole(['ADMIN'], 'Chỉ Quản trị viên mới có quyền xóa tài khoản nhân viên!'), authController.deleteUser);

// ==========================================
// 2. CÁC API ENDPOINTS XE VÀO / XE RA & VỊ TRÍ
// ==========================================

// POST /api/xe-vao: Xe vào bãi + AI OCR + gán vị trí đỗ (Bảo vệ & Admin)
router.post(
  '/xe-vao',
  requireRole(['ADMIN', 'BAO_VE'], 'Khách hàng / Cư dân không có quyền quét biển số hoặc kiểm soát cổng vào!'),
  upload.single('image'),
  parkingController.xeVao
);
router.post(
  '/check-in',
  requireRole(['ADMIN', 'BAO_VE'], 'Khách hàng / Cư dân không có quyền quét biển số hoặc kiểm soát cổng vào!'),
  upload.single('image'),
  parkingController.xeVao
);

// POST /api/xe-ra: Xe ra bãi + Tính phí tự động / Giải phóng vị trí (Bảo vệ & Admin)
router.post(
  '/xe-ra',
  requireRole(['ADMIN', 'BAO_VE'], 'Khách hàng / Cư dân không có quyền kiểm soát cổng ra và mở barrier trực tiếp!'),
  upload.single('image'),
  parkingController.xeRa
);
router.post(
  '/check-out',
  requireRole(['ADMIN', 'BAO_VE'], 'Khách hàng / Cư dân không có quyền kiểm soát cổng ra và mở barrier trực tiếp!'),
  upload.single('image'),
  parkingController.xeRa
);

// GET & PATCH /api/vi-tri: Lấy danh sách & Cập nhật trạng thái bảo trì ô đỗ
router.get('/vi-tri', parkingController.getViTriList);
router.get('/vitri', parkingController.getViTriList); // Alias
router.patch(
  '/vi-tri/:id/status',
  requireRole(['ADMIN', 'BAO_VE'], 'Khách hàng / Cư dân không có quyền thay đổi trạng thái bảo trì ô đỗ!'),
  parkingController.updateViTriStatus
);
router.put(
  '/vi-tri/:id/status',
  requireRole(['ADMIN', 'BAO_VE'], 'Khách hàng / Cư dân không có quyền thay đổi trạng thái bảo trì ô đỗ!'),
  parkingController.updateViTriStatus
);

// GET /api/dashboard: Thống kê tổng số xe, chỗ trống, doanh thu ngày (Admin & Thu ngân)
router.get(
  '/dashboard',
  requireRole(['ADMIN', 'QUAN_LY_DIEU_HANH'], 'Chức năng Báo cáo & Doanh thu chỉ dành cho Quản trị viên và Quản lý!'),
  parkingController.getDashboard
);
router.get(
  '/overview',
  requireRole(['ADMIN', 'QUAN_LY_DIEU_HANH'], 'Chức năng Báo cáo & Doanh thu chỉ dành cho Quản trị viên và Quản lý!'),
  parkingController.getDashboard
);

// ==========================================
// 3. QUẢN LÝ PHƯƠNG TIỆN, BẢNG GIÁ, LỊCH SỬ & AI
// ==========================================

// Phân khu
router.get('/khu-vuc', parkingController.getKhuVucList);
router.get('/khuvuc', parkingController.getKhuVucList);

// Quản lý danh sách phương tiện (CRUD)
router.get('/xe', parkingController.getXeList);
router.post('/xe', requireRole(['ADMIN']), parkingController.createXe);
router.put('/xe/:id', requireRole(['ADMIN']), parkingController.updateXe);
router.delete('/xe/:id', requireRole(['ADMIN']), parkingController.deleteXe);

// Lịch sử vào ra
router.get(
  '/luot-vao-ra',
  requireRole(['ADMIN', 'BAO_VE'], 'Khách hàng vui lòng tra cứu lịch sử phương tiện cá nhân tại Cổng Khách Hàng!'),
  parkingController.getLuotVaoRaList
);
router.get(
  '/luotvaora',
  requireRole(['ADMIN', 'BAO_VE'], 'Khách hàng vui lòng tra cứu lịch sử phương tiện cá nhân tại Cổng Khách Hàng!'),
  parkingController.getLuotVaoRaList
);

// Bảng giá dịch vụ (Xem & Cập nhật)
router.get('/bang-gia', parkingController.getBangGiaList);
router.get('/banggia', parkingController.getBangGiaList);
router.put(
  '/bang-gia/:id',
  requireRole(['ADMIN'], 'Chỉ Quản trị viên mới có quyền cập nhật bảng giá dịch vụ!'),
  parkingController.updateBangGia
);

// Quét biển số AI độc lập
router.post(
  '/ai/detect-plate',
  requireRole(['ADMIN', 'BAO_VE'], 'Chức năng quét biển số AI chỉ dành cho Nhân viên Bảo vệ và Quản trị viên!'),
  upload.single('image'),
  parkingController.mockAiDetectEndpoint
);

// Trợ lý AI phân tích và hỗ trợ (Cho cả Admin và Khách hàng)
router.post(
  '/ai-assistant',
  parkingController.handleAiAssistant
);
router.post(
  '/assistant',
  requireRole(['ADMIN', 'QUAN_LY_DIEU_HANH'], 'Trợ lý AI Admin chỉ phục vụ công tác điều hành quản trị bãi xe!'),
  parkingController.handleAiAssistant
);

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
router.delete('/blacklist/:id', requireRole(['ADMIN']), parkingController.deleteBlacklist);

module.exports = router;
