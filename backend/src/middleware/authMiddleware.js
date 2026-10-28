const { getTable } = require('../utils/db');

/**
 * Trích xuất userId từ token dạng: DXAI-TOKEN-${user.id}-${Date.now()}
 */
const extractUserIdFromToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  const clean = token.replace('Bearer ', '').trim();
  if (!clean.startsWith('DXAI-TOKEN-')) return null;

  const withoutPrefix = clean.slice('DXAI-TOKEN-'.length);
  const lastDashIndex = withoutPrefix.lastIndexOf('-');
  if (lastDashIndex === -1) return withoutPrefix;
  return withoutPrefix.slice(0, lastDashIndex);
};

/**
 * Middleware xác thực người dùng từ Authorization Header
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      req.user = null;
      req.userRole = null;
      return next();
    }

    const userId = extractUserIdFromToken(token);
    if (!userId) {
      req.user = null;
      req.userRole = null;
      return next();
    }

    const users = getTable('NguoiDung') || [];
    const user = users.find(u => u.id === userId || u.taiKhoan.toLowerCase() === userId.toLowerCase());

    if (user && user.trangThai !== 'KHOA' && user.trangThai !== 'LOCKED') {
      req.user = user;
      req.userRole = user.vaiTro;
    } else {
      req.user = null;
      req.userRole = null;
    }

    next();
  } catch (err) {
    console.error('Lỗi authenticate middleware:', err);
    next();
  }
};

/**
 * Middleware kiểm tra quyền theo danh sách vai trò
 * @param {string[]} allowedRoles - Danh sách vai trò được phép
 * @param {string} customErrorMessage - Thông báo lỗi tùy biến
 */
const requireRole = (allowedRoles = [], customErrorMessage = null) => {
  return (req, res, next) => {
    // Nếu request có thông tin người dùng từ token
    if (req.user) {
      if (allowedRoles.includes(req.userRole)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: customErrorMessage || `Quyền truy cập bị từ chối! Vai trò '${req.user.vaiTro}' không được phép thực hiện chức năng này.`
      });
    }

    // Nếu không có header Authorization (hỗ trợ gọi test/internal không truyền token)
    if (!req.headers.authorization) {
      return next();
    }

    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Vui lòng đăng nhập với tài khoản có thẩm quyền để tiếp tục!'
    });
  };
};

module.exports = {
  extractUserIdFromToken,
  authenticate,
  requireRole
};
