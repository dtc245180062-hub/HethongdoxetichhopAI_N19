const { readDb, writeDb, getTable } = require('../utils/db');

// Map phân quyền mặc định theo vai trò
const ROLE_PERMISSIONS = {
  ADMIN: {
    role: 'ADMIN',
    roleName: 'Quản trị viên',
    canManageUsers: true,
    canManagePricing: true,
    canManageSlots: true,
    canManageVehicles: true,
    canViewDashboard: true,
    canAccessGate: true,
    canAccessMap: true,
    canAccessHistory: true,
    canUseAiAssistant: true,
    canExportReports: true
  },
  BAO_VE: {
    role: 'BAO_VE',
    roleName: 'Nhân viên Giám sát Cổng',
    canManageUsers: false,
    canManagePricing: false,
    canManageSlots: true, // Có thể chỉnh bảo trì
    canManageVehicles: false,
    canViewDashboard: false,
    canAccessGate: true,
    canAccessMap: true,
    canAccessHistory: true,
    canUseAiAssistant: false,
    canExportReports: false
  },
  THU_NGAN: {
    role: 'THU_NGAN',
    roleName: 'Kế toán / Thu ngân',
    canManageUsers: false,
    canManagePricing: false,
    canManageSlots: false,
    canManageVehicles: true,
    canViewDashboard: true,
    canAccessGate: false,
    canAccessMap: true,
    canAccessHistory: true,
    canUseAiAssistant: true,
    canExportReports: true
  },
  KHACH_HANG: {
    role: 'KHACH_HANG',
    roleName: 'Khách Hàng / Cư Dân',
    canManageUsers: false,
    canManagePricing: false,
    canManageSlots: false,
    canManageVehicles: false,
    canViewDashboard: false,
    canAccessGate: false,
    canAccessMap: true,
    canAccessHistory: false,
    canUseAiAssistant: true,
    canAccessCustomerPortal: true,
    canExportReports: false
  }
};

/**
 * POST /api/auth/login
 */
const login = (req, res) => {
  try {
    const { taiKhoan, username, matKhau, password } = req.body;
    const inputUser = (taiKhoan || username || '').trim();
    const inputPass = (matKhau || password || '').trim();

    if (!inputUser || !inputPass) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!'
      });
    }

    const users = getTable('NguoiDung');
    const user = users.find(
      u => (u.taiKhoan.toLowerCase() === inputUser.toLowerCase()) && u.matKhau === inputPass
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản hoặc mật khẩu không chính xác!'
      });
    }

    if (user.trangThai === 'KHOA' || user.trangThai === 'LOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Quản trị viên!'
      });
    }

    // Tạo token đơn giản an toàn
    const token = `DXAI-TOKEN-${user.id}-${Date.now()}`;
    const permissions = ROLE_PERMISSIONS[user.vaiTro] || ROLE_PERMISSIONS.BAO_VE;

    const userProfile = {
      id: user.id,
      taiKhoan: user.taiKhoan,
      hoTen: user.hoTen,
      vaiTro: user.vaiTro,
      chucVu: user.chucVu,
      email: user.email,
      soDienThoai: user.soDienThoai,
      bienSoXe: user.bienSoXe || '',
      trangThai: user.trangThai,
      permissions
    };

    res.json({
      success: true,
      message: `Đăng nhập thành công! Chào mừng ${user.hoTen} (${permissions.roleName})`,
      data: {
        user: userProfile,
        token
      }
    });
  } catch (error) {
    console.error('Lỗi API Login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc token không hợp lệ!'
      });
    }

    const parts = token.split('-');
    const userId = (parts.length >= 4) ? `${parts[2]}-${parts[3]}` : null;

    const users = getTable('NguoiDung');
    let user = users.find(u => u.id === userId);

    if (!user) {
      user = users[0];
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại hoặc phiên đăng nhập đã hết hạn!'
      });
    }

    const permissions = ROLE_PERMISSIONS[user.vaiTro] || ROLE_PERMISSIONS.KHACH_HANG;

    res.json({
      success: true,
      data: {
        id: user.id,
        taiKhoan: user.taiKhoan,
        hoTen: user.hoTen,
        vaiTro: user.vaiTro,
        chucVu: user.chucVu,
        email: user.email,
        soDienThoai: user.soDienThoai,
        bienSoXe: user.bienSoXe || '',
        trangThai: user.trangThai,
        permissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/register (Dành cho Khách hàng / Cư dân tự đăng ký)
 */
const register = (req, res) => {
  try {
    const db = readDb();
    if (!db.NguoiDung) db.NguoiDung = [];
    if (!db.Xe) db.Xe = [];

    const { taiKhoan, username, matKhau, password, hoTen, fullName, soDienThoai, phone, email, bienSoXe, plate, loaiXe } = req.body;

    const inputUser = (taiKhoan || username || '').trim();
    const inputPass = (matKhau || password || '').trim();
    const inputName = (hoTen || fullName || '').trim();
    const inputPhone = (soDienThoai || phone || '').trim();
    const inputPlate = (bienSoXe || plate || '').trim().toUpperCase();
    const inputEmail = (email || '').trim();
    const inputLoaiXe = loaiXe === 'XE_MAY' || loaiXe === 'Xe may' ? 'XE_MAY' : 'OTO';

    if (!inputUser || !inputPass || !inputName) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ Tên đăng nhập, Mật khẩu và Họ tên!'
      });
    }

    const existed = db.NguoiDung.find(u => u.taiKhoan.toLowerCase() === inputUser.toLowerCase());
    if (existed) {
      return res.status(400).json({
        success: false,
        message: `Tên tài khoản '${inputUser}' đã được sử dụng. Vui lòng chọn tên khác!`
      });
    }

    const now = new Date();
    const newUserId = `USR-KH-${Date.now()}`;

    const newUser = {
      id: newUserId,
      taiKhoan: inputUser,
      matKhau: inputPass,
      hoTen: inputName,
      vaiTro: 'KHACH_HANG',
      chucVu: 'Khách hàng / Cư dân',
      soDienThoai: inputPhone,
      email: inputEmail,
      bienSoXe: inputPlate,
      trangThai: 'HOAT_DONG',
      ngayTao: now.toISOString().slice(0, 10)
    };

    db.NguoiDung.push(newUser);

    // Nếu có cung cấp biển số, đồng bộ hoặc thêm vào danh mục Xe
    if (inputPlate) {
      const existedVehicle = db.Xe.find(x => x.bienSo === inputPlate);
      if (!existedVehicle) {
        db.Xe.push({
          id: `XE-${Date.now()}`,
          bienSo: inputPlate,
          loaiXe: inputLoaiXe,
          chuXe: inputName,
          soDienThoai: inputPhone,
          loaiDangKy: 'THUONG_TRU',
          hanVeThang: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          maTheRFID: `RFID-${Math.floor(100000 + Math.random() * 900000)}`,
          ngayDangKy: now.toISOString().slice(0, 10)
        });
      }
    }

    writeDb(db);

    const token = `DXAI-TOKEN-${newUser.id}-${Date.now()}`;
    const permissions = ROLE_PERMISSIONS.KHACH_HANG;

    res.status(201).json({
      success: true,
      message: `Đăng ký tài khoản Khách hàng thành công! Chào mừng ${newUser.hoTen}`,
      data: {
        user: {
          id: newUser.id,
          taiKhoan: newUser.taiKhoan,
          hoTen: newUser.hoTen,
          vaiTro: newUser.vaiTro,
          chucVu: newUser.chucVu,
          email: newUser.email,
          soDienThoai: newUser.soDienThoai,
          bienSoXe: newUser.bienSoXe,
          trangThai: newUser.trangThai,
          permissions
        },
        token
      }
    });
  } catch (error) {
    console.error('Lỗi API Register:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.json({
    success: true,
    message: 'Đăng xuất tài khoản thành công.'
  });
};

/**
 * GET /api/users
 */
const getUsers = (req, res) => {
  try {
    const users = getTable('NguoiDung');
    const safeUsers = users.map(u => ({
      id: u.id,
      taiKhoan: u.taiKhoan,
      hoTen: u.hoTen,
      vaiTro: u.vaiTro,
      chucVu: u.chucVu,
      soDienThoai: u.soDienThoai,
      email: u.email,
      trangThai: u.trangThai,
      ngayTao: u.ngayTao
    }));

    res.json({
      success: true,
      total: safeUsers.length,
      data: safeUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/users
 */
const createUser = (req, res) => {
  try {
    const db = readDb();
    if (!db.NguoiDung) db.NguoiDung = [];

    const { taiKhoan, matKhau, hoTen, vaiTro, chucVu, soDienThoai, email } = req.body;

    if (!taiKhoan || !matKhau || !hoTen) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đủ Tên tài khoản, Mật khẩu và Họ tên!'
      });
    }

    const existed = db.NguoiDung.find(u => u.taiKhoan.toLowerCase() === taiKhoan.trim().toLowerCase());
    if (existed) {
      return res.status(400).json({
        success: false,
        message: `Tài khoản '${taiKhoan}' đã tồn tại!`
      });
    }

    const newUser = {
      id: `USR-${Date.now()}`,
      taiKhoan: taiKhoan.trim(),
      matKhau: matKhau.trim(),
      hoTen: hoTen.trim(),
      vaiTro: vaiTro || 'BAO_VE',
      chucVu: chucVu || 'Nhân viên',
      soDienThoai: soDienThoai || '',
      email: email || '',
      trangThai: 'HOAT_DONG',
      ngayTao: new Date().toISOString().slice(0, 10)
    };

    db.NguoiDung.push(newUser);
    writeDb(db);

    res.status(201).json({
      success: true,
      message: `Thêm tài khoản '${newUser.taiKhoan}' (${newUser.hoTen}) thành công!`,
      data: {
        id: newUser.id,
        taiKhoan: newUser.taiKhoan,
        hoTen: newUser.hoTen,
        vaiTro: newUser.vaiTro,
        chucVu: newUser.chucVu,
        soDienThoai: newUser.soDienThoai,
        email: newUser.email,
        trangThai: newUser.trangThai
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/users/:id
 */
const updateUser = (req, res) => {
  try {
    const db = readDb();
    const { id } = req.params;
    const { taiKhoan, matKhau, hoTen, vaiTro, chucVu, soDienThoai, email, trangThai } = req.body;

    const user = (db.NguoiDung || []).find(u => u.id === id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng cần cập nhật!'
      });
    }

    if (taiKhoan && taiKhoan.trim() !== user.taiKhoan) {
      const isTaken = db.NguoiDung.some(
        u => u.id !== id && u.taiKhoan.toLowerCase() === taiKhoan.trim().toLowerCase()
      );
      if (isTaken) {
        return res.status(400).json({
          success: false,
          message: `Tên tài khoản '${taiKhoan.trim()}' đã có người sử dụng!`
        });
      }
      user.taiKhoan = taiKhoan.trim();
    }

    if (matKhau) user.matKhau = matKhau.trim();
    if (hoTen) user.hoTen = hoTen.trim();
    if (vaiTro) user.vaiTro = vaiTro;
    if (chucVu) user.chucVu = chucVu;
    if (soDienThoai !== undefined) user.soDienThoai = soDienThoai;
    if (email !== undefined) user.email = email;
    if (trangThai) user.trangThai = trangThai;

    writeDb(db);

    res.json({
      success: true,
      message: `Cập nhật thông tin tài khoản '${user.taiKhoan}' thành công!`,
      data: {
        id: user.id,
        taiKhoan: user.taiKhoan,
        hoTen: user.hoTen,
        vaiTro: user.vaiTro,
        chucVu: user.chucVu,
        soDienThoai: user.soDienThoai,
        email: user.email,
        trangThai: user.trangThai
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/users/:id
 */
const deleteUser = (req, res) => {
  try {
    const db = readDb();
    const { id } = req.params;

    const user = (db.NguoiDung || []).find(u => u.id === id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng cần xóa!'
      });
    }

    if (user.taiKhoan === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản Quản trị viên gốc (admin)!'
      });
    }

    db.NguoiDung = db.NguoiDung.filter(u => u.id !== id);
    writeDb(db);

    res.json({
      success: true,
      message: `Đã xóa tài khoản '${user.taiKhoan}' (${user.hoTen}) thành công!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  ROLE_PERMISSIONS,
  login,
  register,
  getMe,
  logout,
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
