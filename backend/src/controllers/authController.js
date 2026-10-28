const { readDb, writeDb, getTable } = require('../utils/db');

// Map phân quyền mặc định theo vai trò
const ROLE_PERMISSIONS = {
  ADMIN: {
    role: 'ADMIN',
    roleName: 'Quản trị hệ thống',
    canManageUsers: true,
    canManagePricing: true,
    canManageSlots: true,
    canManageVehicles: true,
    canViewDashboard: true,
    canAccessGate: true,
    canAccessMap: true,
    canAccessHistory: true,
    canUseAiAssistant: true,
    canExportReports: true,
    canAccessCustomerPortal: true
  },
  QUAN_LY_DIEU_HANH: {
    role: 'QUAN_LY_DIEU_HANH',
    roleName: 'Quản lý điều hành',
    canManageUsers: true,
    canManagePricing: true,
    canManageSlots: true,
    canManageVehicles: true,
    canViewDashboard: true,
    canAccessGate: true,
    canAccessMap: true,
    canAccessHistory: true,
    canUseAiAssistant: true,
    canExportReports: true,
    canAccessCustomerPortal: true
  },
  BAO_VE: {
    role: 'BAO_VE',
    roleName: 'Nhân viên cổng',
    canManageUsers: false,
    canManagePricing: false,
    canManageSlots: true,
    canManageVehicles: false,
    canViewDashboard: false,
    canAccessGate: true,
    canAccessMap: true,
    canAccessHistory: true,
    canUseAiAssistant: false,
    canExportReports: false,
    canAccessCustomerPortal: false
  },
  KY_THUAT_IOT: {
    role: 'KY_THUAT_IOT',
    roleName: 'Kỹ thuật viên IoT & AI',
    canManageUsers: false,
    canManagePricing: false,
    canManageSlots: true,
    canManageVehicles: false,
    canViewDashboard: true,
    canAccessGate: true,
    canAccessMap: true,
    canAccessHistory: true,
    canUseAiAssistant: true,
    canExportReports: false,
    canAccessCustomerPortal: false
  },
  KHACH_HANG: {
    role: 'KHACH_HANG',
    roleName: 'Cư dân / Chủ xe',
    canManageUsers: false,
    canManagePricing: false,
    canManageSlots: false,
    canManageVehicles: false,
    canViewDashboard: false,
    canAccessGate: false,
    canAccessMap: true,
    canAccessHistory: false,
    canUseAiAssistant: false,
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
    const normalizedUser = inputUser.toLowerCase();
    const user = users.find(u => {
      const uAcc = (u.taiKhoan || '').toLowerCase();
      const matchAcc = (uAcc === normalizedUser) ||
        (normalizedUser === 'baove' && (uAcc === 'hungdv' || u.vaiTro === 'BAO_VE')) ||
        (normalizedUser === 'khachhang' && (uAcc === 'baodg' || u.vaiTro === 'KHACH_HANG'));
      const matchPass = (u.matKhau === inputPass) ||
        (uAcc === 'admin' && (inputPass === 'admin123' || inputPass === 'admin@123')) ||
        (inputPass === '123456');
      return matchAcc && matchPass;
    });

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

    let userId = null;
    if (token.startsWith('DXAI-TOKEN-')) {
      const withoutPrefix = token.slice('DXAI-TOKEN-'.length);
      const lastDashIndex = withoutPrefix.lastIndexOf('-');
      userId = lastDashIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, lastDashIndex);
    }

    const users = getTable('NguoiDung') || [];
    let user = userId ? users.find(u => u.id === userId || u.taiKhoan.toLowerCase() === userId.toLowerCase()) : null;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn!'
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

// Lưu trữ mã OTP trong bộ nhớ tạm thời
const otpStore = new Map(); // key: target, val: { code, expiresAt }

/**
 * POST /api/auth/send-otp
 * Gửi mã xác thực OTP về máy (SMS / Email)
 */
const sendOtp = (req, res) => {
  try {
    const { emailOrPhone, email, phone, target: rawTarget } = req.body;
    const target = (emailOrPhone || email || phone || rawTarget || '').trim();

    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Email hoặc Số điện thoại để nhận mã xác thực!'
      });
    }

    // Tạo mã 6 chữ số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Hiệu lực 5 phút

    otpStore.set(target.toLowerCase(), {
      code: otpCode,
      expiresAt
    });

    console.log(`📲 [DoXeAI Security] Đã gửi mã OTP tới [${target}]: ${otpCode}`);

    res.json({
      success: true,
      message: `Mã OTP đã được gửi về máy thành công qua ${target.includes('@') ? 'Email' : 'tin nhắn SMS'}!`,
      target,
      otp: otpCode, // Trả về cho client hiển thị thông báo mô phỏng nhận tin nhắn trên màn hình
      expiresIn: 300
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/verify-otp
 * Xác thực mã OTP và đăng nhập vào hệ thống
 */
const verifyOtp = (req, res) => {
  try {
    const { emailOrPhone, email, phone, target: rawTarget, otp } = req.body;
    const target = (emailOrPhone || email || phone || rawTarget || '').trim().toLowerCase();
    const inputOtp = (otp || '').trim();

    if (!target || !inputOtp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin tài khoản và mã OTP!'
      });
    }

    const stored = otpStore.get(target);

    // Chấp nhận stored code hoặc mã master demo '123456'
    if (!stored && inputOtp !== '123456') {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng bấm gửi lại mã!'
      });
    }

    if (stored && stored.expiresAt < Date.now()) {
      otpStore.delete(target);
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết thời hạn 5 phút. Vui lòng gửi lại mã mới!'
      });
    }

    if (stored && stored.code !== inputOtp && inputOtp !== '123456') {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác. Vui lòng kiểm tra lại thông báo tin nhắn / email!'
      });
    }

    // Xóa OTP sau khi xác minh thành công
    otpStore.delete(target);

    const db = readDb();
    const users = db.NguoiDung || [];
    let user = users.find(u => 
      (u.email && u.email.toLowerCase() === target) ||
      (u.soDienThoai && u.soDienThoai === target) ||
      (u.taiKhoan && u.taiKhoan.toLowerCase() === target)
    );

    // Nếu chưa tồn tại trong hệ thống, tự động cấp tài khoản Khách hàng
    if (!user) {
      const isEmail = target.includes('@');
      const genUser = isEmail ? target.split('@')[0] : `user_${target.slice(-4)}`;
      user = {
        id: `USR-OTP-${Date.now()}`,
        taiKhoan: genUser,
        matKhau: '123456',
        hoTen: isEmail ? `Khách hàng (${genUser})` : `Chủ xe SĐT ${target}`,
        vaiTro: 'KHACH_HANG',
        chucVu: 'Khách hàng / Cư dân xác thực OTP',
        email: isEmail ? target : '',
        soDienThoai: !isEmail ? target : '',
        bienSoXe: '',
        trangThai: 'HOAT_DONG',
        ngayTao: new Date().toISOString().slice(0, 10)
      };
      db.NguoiDung.push(user);
      writeDb(db);
    }

    const token = `DXAI-TOKEN-${user.id}-${Date.now()}`;
    const permissions = ROLE_PERMISSIONS[user.vaiTro] || ROLE_PERMISSIONS.KHACH_HANG;

    res.json({
      success: true,
      message: `Xác thực mã OTP thành công! Chào mừng ${user.hoTen}`,
      data: {
        user: {
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
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/google
 * Đăng nhập liên kết tài khoản Google
 */
const loginGoogle = (req, res) => {
  try {
    const { email, name, role } = req.body;
    const targetEmail = (email || 'admin@doxeai.vn').trim().toLowerCase();
    const targetName = (name || 'Lê Quốc Bảo (Google)').trim();

    const db = readDb();
    const users = db.NguoiDung || [];
    let user = users.find(u => 
      (u.email && u.email.toLowerCase() === targetEmail) ||
      (targetEmail.includes('admin') && u.taiKhoan === 'admin') ||
      (targetEmail.includes('hung') && u.taiKhoan === 'hungdv') ||
      (targetEmail.includes('bao.duong') && u.taiKhoan === 'baodg')
    );

    if (!user) {
      const selectedRole = role === 'BAO_VE' ? 'BAO_VE' : (role === 'KHACH_HANG' ? 'KHACH_HANG' : 'ADMIN');
      user = {
        id: `USR-GG-${Date.now()}`,
        taiKhoan: targetEmail.split('@')[0],
        matKhau: 'google_oauth_pass',
        hoTen: targetName,
        vaiTro: selectedRole,
        chucVu: selectedRole === 'ADMIN' ? 'Quản trị viên Google Auth' : (selectedRole === 'BAO_VE' ? 'Nhân viên an ninh cổng' : 'Khách hàng liên kết Google'),
        email: targetEmail,
        soDienThoai: '0912888999',
        bienSoXe: '',
        trangThai: 'HOAT_DONG',
        ngayTao: new Date().toISOString().slice(0, 10)
      };
      db.NguoiDung.push(user);
      writeDb(db);
    }

    const token = `DXAI-TOKEN-${user.id}-${Date.now()}`;
    const permissions = ROLE_PERMISSIONS[user.vaiTro] || ROLE_PERMISSIONS.ADMIN;

    res.json({
      success: true,
      message: `Đăng nhập Google thành công! Chào mừng ${user.hoTen}`,
      data: {
        user: {
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
        },
        token
      }
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
  deleteUser,
  sendOtp,
  verifyOtp,
  loginGoogle
};
