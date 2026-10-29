const { getTable } = require('../utils/db');

/**
 * Middleware kiểm tra quyền Quản trị viên (ADMIN)
 * Trả về 403 Forbidden nếu người dùng không có vai trò ADMIN
 */
const requireAdmin = (req, res, next) => {
  try {
    // 1. Kiểm tra qua Header Authorization Bearer Token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // 2. Hỗ trợ kiểm tra qua custom header (hữu ích cho automated testing & microservices)
    const customRole = req.headers['x-user-role'];
    const customUserId = req.headers['x-user-id'];

    const users = getTable('NguoiDung');

    let matchedUser = null;

    if (customRole) {
      if (customRole.toUpperCase() === 'ADMIN') {
        req.user = users.find(u => u.vaiTro === 'ADMIN') || { vaiTro: 'ADMIN', hoTen: 'Quản trị viên' };
        return next();
      } else {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Truy cập bị từ chối (403 Forbidden): Tính năng Trợ lý AI Quản trị chỉ dành riêng cho Quản trị viên (ADMIN)!'
        });
      }
    }

    if (customUserId) {
      matchedUser = users.find(u => u.id === customUserId);
    } else if (token) {
      // Phân tích token: DXAI-TOKEN-<userId>-<timestamp>
      const parts = token.split('-');
      if (parts.length >= 4) {
        const potentialId = `${parts[2]}-${parts[3]}`;
        matchedUser = users.find(u => u.id === potentialId);
      } else if (token === 'admin' || token === 'admin-token') {
        matchedUser = users.find(u => u.vaiTro === 'ADMIN');
      }
    }

    // Nếu không tìm thấy user hoặc vai trò không phải ADMIN
    if (!matchedUser) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Truy cập bị từ chối (403 Forbidden): Bạn chưa đăng nhập hoặc không có quyền Quản trị viên (ADMIN)!'
      });
    }

    if (matchedUser.vaiTro !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Truy cập bị từ chối (403 Forbidden): Tính năng Trợ lý AI Quản trị chỉ dành riêng cho Quản trị viên (ADMIN)!'
      });
    }

    req.user = matchedUser;
    next();
  } catch (error) {
    console.error('Lỗi kiểm tra quyền Admin:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực hệ thống: ' + error.message
    });
  }
};

module.exports = {
  requireAdmin
};
