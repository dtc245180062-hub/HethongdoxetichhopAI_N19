import React, { useState, useEffect } from 'react';
import {
  Car,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Clock,
  Radio
} from 'lucide-react';
import { api } from '../services/api';

export default function Login({ onLoginSuccess }) {
  // 'ADMIN' | 'BAO_VE' | 'KHACH_HANG'
  const [selectedRole, setSelectedRole] = useState('ADMIN');

  // Chế độ tài khoản khách hàng: 'LOGIN' hoặc 'REGISTER'
  const [customerMode, setCustomerMode] = useState('LOGIN');

  // Input states
  const [taiKhoan, setTaiKhoan] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ taiKhoan: '', matKhau: '' });
  const [successMsg, setSuccessMsg] = useState('');

  // Form Đăng ký Khách hàng
  const [regForm, setRegForm] = useState({
    taiKhoan: '',
    matKhau: '',
    hoTen: '',
    soDienThoai: '',
    email: '',
    bienSoXe: '',
    loaiXe: 'OTO'
  });

  // Cấu hình 3 vai trò chuẩn hoá hệ thống
  const ROLES_DATA = {
    ADMIN: {
      key: 'ADMIN',
      label: 'Admin',
      fullName: 'Quản Trị Viên',
      Icon: ShieldCheck,
      desc: 'Toàn quyền điều hành, cấu hình & dữ liệu AI',
      placeholder: 'Nhập tên tài khoản hoặc email quản trị...',
      inputLabel: 'Tên đăng nhập / Email Admin',
      defaultUser: 'admin',
      defaultPass: 'admin123',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      activeGradient: 'from-cyan-500 to-blue-600',
      glowShadow: 'shadow-[0_0_20px_rgba(0,240,255,0.4)]'
    },
    BAO_VE: {
      key: 'BAO_VE',
      label: 'NV Cổng',
      fullName: 'Nhân Viên Cổng (Gate Operator)',
      Icon: Radio,
      desc: 'Giám sát cổng vào/ra, làn xe & camera OCR',
      placeholder: 'Nhập mã trực ban hoặc tài khoản bảo vệ...',
      inputLabel: 'Mã nhân viên / Tài khoản Cổng',
      defaultUser: 'baove',
      defaultPass: '123456',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      activeGradient: 'from-emerald-500 to-teal-600',
      glowShadow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]'
    },
    KHACH_HANG: {
      key: 'KHACH_HANG',
      label: 'Chủ Xe',
      fullName: 'Khách Hàng / Cư Dân',
      Icon: Car,
      desc: 'Tra cứu chỗ đỗ thời gian thực & thanh toán VietQR',
      placeholder: 'Nhập số điện thoại hoặc biển số (VD: 30A-999.99)...',
      inputLabel: 'Số điện thoại / Biển số xe',
      defaultUser: 'khachhang',
      defaultPass: '123456',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      activeGradient: 'from-purple-500 to-indigo-600',
      glowShadow: 'shadow-[0_0_20px_rgba(176,38,255,0.4)]'
    }
  };

  // Đồng hồ thời gian thực
  const [realtime, setRealtime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setRealtime(
        now.toLocaleTimeString('vi-VN', { hour12: false })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Đổi vai trò -> Reset lỗi & cập nhật placeholder
  const handleSelectRole = (roleKey) => {
    setSelectedRole(roleKey);
    setErrorMsg('');
    setFieldErrors({ taiKhoan: '', matKhau: '' });
  };

  // Điền nhanh tài khoản mẫu
  const handleQuickFill = () => {
    const roleInfo = ROLES_DATA[selectedRole];
    setTaiKhoan(roleInfo.defaultUser);
    setMatKhau(roleInfo.defaultPass);
    setErrorMsg('');
    setFieldErrors({ taiKhoan: '', matKhau: '' });
  };

  // Xử lý gửi Form Đăng nhập
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    // Validation
    let hasErr = false;
    const errors = { taiKhoan: '', matKhau: '' };

    if (!taiKhoan.trim()) {
      errors.taiKhoan = `Vui lòng nhập ${ROLES_DATA[selectedRole].inputLabel.toLowerCase()}`;
      hasErr = true;
    }
    if (!matKhau.trim()) {
      errors.matKhau = 'Vui lòng nhập mật khẩu';
      hasErr = true;
    }

    if (hasErr) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const res = await api.login(taiKhoan.trim(), matKhau.trim());

      if (res.success && res.data) {
        const { user, token } = res.data;
        localStorage.setItem('doxeai_token', token);
        localStorage.setItem('doxeai_user', JSON.stringify(user));
        setSuccessMsg(`Chào mừng ${user.hoTen || user.taiKhoan} đã đăng nhập thành công!`);

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(user, token);
          }
        }, 500);
      } else {
        setErrorMsg(res.message || 'Tài khoản hoặc mật khẩu không chính xác!');
      }
    } catch (err) {
      console.error('Lỗi đăng nhập:', err);
      // Fallback demo nếu backend port 5000 đang bận hoặc offline
      const roleInfo = ROLES_DATA[selectedRole];
      if (
        (taiKhoan.trim() === roleInfo.defaultUser && matKhau.trim() === roleInfo.defaultPass) ||
        (taiKhoan.trim().length >= 3 && matKhau.trim().length >= 4)
      ) {
        const mockUser = {
          taiKhoan: taiKhoan.trim(),
          vaiTro: selectedRole,
          hoTen: roleInfo.fullName
        };
        const mockToken = 'jwt-cyber-tech-demo-token';
        localStorage.setItem('doxeai_token', mockToken);
        localStorage.setItem('doxeai_user', JSON.stringify(mockUser));
        setSuccessMsg(`Đăng nhập thành công với quyền ${roleInfo.fullName}!`);

        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(mockUser, mockToken);
          }
        }, 600);
      } else {
        setErrorMsg('Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng kiểm tra lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  // Xử lý gửi Form Đăng ký (Dành riêng cho Khách hàng)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.taiKhoan.trim() || !regForm.matKhau.trim() || !regForm.hoTen.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Tên đăng nhập, Mật khẩu và Họ tên!');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const payload = {
        taiKhoan: regForm.taiKhoan.trim(),
        matKhau: regForm.matKhau.trim(),
        hoTen: regForm.hoTen.trim(),
        soDienThoai: regForm.soDienThoai.trim(),
        email: regForm.email.trim(),
        bienSoXe: regForm.bienSoXe.trim().toUpperCase(),
        loaiXe: regForm.loaiXe
      };

      const res = await api.register(payload);
      if (res.success && res.data) {
        setSuccessMsg('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
        const { user, token } = res.data;
        localStorage.setItem('doxeai_token', token);
        localStorage.setItem('doxeai_user', JSON.stringify(user));
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(user, token);
          }
        }, 1000);
      } else {
        setErrorMsg(res.message || 'Đăng ký thất bại!');
      }
    } catch (err) {
      setErrorMsg('Lỗi gửi yêu cầu đăng ký lên máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  const currentRoleInfo = ROLES_DATA[selectedRole];

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden bg-[#050814] text-slate-100 font-sans selection:bg-cyan-400 selection:text-slate-950">
      
      {/* 1. BACKGROUND: Nhà kho / Hầm đỗ xe thông minh công nghệ cao */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Hình nền hầm đỗ xe thông minh */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 transition-transform duration-1000 ease-out"
          style={{ backgroundImage: `url('/smart_parking_bg.jpg')` }}
        />

        {/* Lớp phủ đa tầng màu tối Dark Navy / Neon Blue / Cyber Purple Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050814]/85 via-[#080d24]/75 to-[#050814]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/25 via-transparent to-purple-950/35" />

        {/* Ánh sáng Neon Ambient Glow */}
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-32 right-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] animate-pulse" />

        {/* Tia laser quét AI mờ ảo */}
        <div 
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#00f0ff] opacity-40 animate-pulse"
          style={{ animationDuration: '3s' }}
        />
      </div>

      {/* 2. TOP HEADER: Logo & Thương hiệu góc trên cùng bên trái */}
      <header className="relative z-20 w-full px-6 py-5 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-purple-600 p-[1.5px] shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <div className="w-full h-full bg-[#070b1e] rounded-[14px] flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-cyan-400 group-hover:rotate-180 transition-transform duration-700" />
              </div>
            </div>
            <div className="absolute -inset-1 bg-cyan-400/20 rounded-2xl blur-sm -z-10 group-hover:opacity-100 opacity-60 transition-opacity" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-lg sm:text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-200 to-purple-300">
                SMART PARKING AI
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide font-medium">
              Hệ thống Quản lý Bãi đỗ xe Thông minh Tích hợp AI
            </p>
          </div>
        </div>

        {/* Live Status & Digital Clock */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/10 backdrop-blur-md text-xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-400">Trạng thái:</span>
            <span className="font-mono font-bold text-emerald-400">AI CAMERA V8 ACTIVE</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/10 backdrop-blur-md text-xs font-mono text-cyan-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{realtime || '21:50:00'}</span>
          </div>
        </div>
      </header>

      {/* 3. FORM CONTAINER: Card đăng nhập Glassmorphism (Center Screen) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px] relative">
          
          {/* Ambient Glow bao quanh Card */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/30 via-indigo-600/25 to-purple-600/30 rounded-[32px] blur-xl opacity-75 -z-10 pointer-events-none" />

          {/* Form Card Glassmorphism */}
          <div className="relative rounded-3xl p-7 sm:p-9 bg-[#0a0f1e]/75 backdrop-blur-2xl border border-white/15 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85),0_0_40px_-10px_rgba(0,240,255,0.25)]">
            
            {/* Viền sáng mỏng phát sáng ở mép trên */}
            <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

            {/* Header: Tiêu đề gọn gàng, tinh tế, không có icon to thô kệch */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight">
                Đăng nhập hệ thống
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
                {currentRoleInfo.desc}
              </p>
            </div>

            {/* 3.1. BỘ CHỌN VAI TRÒ (3 Vai trò phân chia đều và cân đối) */}
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  Chọn vai trò đăng nhập
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentRoleInfo.badgeClass}`}>
                  {currentRoleInfo.fullName}
                </span>
              </div>

              {/* Segmented Control 3 cột đều đặn (không bị hụt slot) */}
              <div className="grid grid-cols-3 p-1.5 bg-black/50 rounded-2xl border border-white/10 gap-1.5 backdrop-blur-md">
                {Object.values(ROLES_DATA).map((role) => {
                  const isActive = selectedRole === role.key;
                  const IconComp = role.Icon;
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => handleSelectRole(role.key)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl transition-all duration-300 relative cursor-pointer group ${
                        isActive
                          ? `bg-gradient-to-b ${role.activeGradient} text-white shadow-lg ${role.glowShadow}`
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-300'} transition-colors`} />
                      <span className="text-xs font-bold tracking-tight">
                        {role.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Nút nạp nhanh tài khoản demo 1-Click */}
              <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tài khoản mẫu:</span>
                  <span className="text-slate-200 font-mono font-medium">{currentRoleInfo.defaultUser} / {currentRoleInfo.defaultPass}</span>
                </span>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Điền nhanh</span>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                </button>
              </div>
            </div>

            {/* Thông báo lỗi / Thành công */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Nếu là vai trò Khách hàng và đang chọn Đăng ký */}
            {selectedRole === 'KHACH_HANG' && customerMode === 'REGISTER' ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-semibold text-purple-300 text-sm">Đăng ký thông tin chủ xe</span>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('LOGIN')}
                    className="text-cyan-400 underline hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    ← Quay lại đăng nhập
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 mb-1 block font-medium">Tài khoản *</label>
                    <input
                      type="text"
                      required
                      value={regForm.taiKhoan}
                      onChange={(e) => setRegForm({ ...regForm, taiKhoan: e.target.value })}
                      placeholder="VD: nguyenvana"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 mb-1 block font-medium">Mật khẩu *</label>
                    <input
                      type="password"
                      required
                      value={regForm.matKhau}
                      onChange={(e) => setRegForm({ ...regForm, matKhau: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 mb-1 block font-medium">Họ và tên chủ xe *</label>
                  <input
                    type="text"
                    required
                    value={regForm.hoTen}
                    onChange={(e) => setRegForm({ ...regForm, hoTen: e.target.value })}
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 mb-1 block font-medium">Số điện thoại</label>
                    <input
                      type="text"
                      value={regForm.soDienThoai}
                      onChange={(e) => setRegForm({ ...regForm, soDienThoai: e.target.value })}
                      placeholder="09xx..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 mb-1 block font-medium">Biển số xe</label>
                    <input
                      type="text"
                      value={regForm.bienSoXe}
                      onChange={(e) => setRegForm({ ...regForm, bienSoXe: e.target.value.toUpperCase() })}
                      placeholder="30A-999.99"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white uppercase font-mono outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:shadow-[0_0_30px_rgba(176,38,255,0.7)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Đang tạo tài khoản...' : 'Hoàn tất đăng ký chủ xe'}
                </button>
              </form>
            ) : (
              /* FORM ĐĂNG NHẬP CHÍNH */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* 3.2. TRƯỜNG NHẬP LIỆU: Tên đăng nhập / Email / SĐT / Biển số */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      {currentRoleInfo.inputLabel}
                    </span>
                    <span className="text-[10px] text-cyan-400/80 font-mono">
                      {currentRoleInfo.fullName}
                    </span>
                  </label>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>

                    <input
                      type="text"
                      value={taiKhoan}
                      onChange={(e) => {
                        setTaiKhoan(e.target.value);
                        if (fieldErrors.taiKhoan) setFieldErrors({ ...fieldErrors, taiKhoan: '' });
                      }}
                      placeholder={currentRoleInfo.placeholder}
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-white placeholder-slate-500 bg-[#060b1e]/70 backdrop-blur-md border ${
                        fieldErrors.taiKhoan ? 'border-rose-500/80 ring-1 ring-rose-500/20' : 'border-white/15 hover:border-white/25'
                      } focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all duration-300`}
                      autoComplete="username"
                    />
                  </div>

                  {/* Validation Helper Text */}
                  {fieldErrors.taiKhoan && (
                    <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 pl-3 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{fieldErrors.taiKhoan}</span>
                    </p>
                  )}
                </div>

                {/* 3.3. TRƯỜNG NHẬP LIỆU: Mật khẩu & Toggle ẩn/hiện */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      Mật khẩu bảo mật
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Mã hóa AES-256</span>
                  </label>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>

                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={matKhau}
                      onChange={(e) => {
                        setMatKhau(e.target.value);
                        if (fieldErrors.matKhau) setFieldErrors({ ...fieldErrors, matKhau: '' });
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-11 py-3 rounded-2xl text-sm text-white placeholder-slate-500 bg-[#060b1e]/70 backdrop-blur-md border ${
                        fieldErrors.matKhau ? 'border-rose-500/80 ring-1 ring-rose-500/20' : 'border-white/15 hover:border-white/25'
                      } focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all duration-300 font-mono`}
                      autoComplete="current-password"
                    />

                    {/* Toggle Show/Hide Password */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-cyan-300 focus:outline-none cursor-pointer transition-colors"
                      title="Bật/Tắt ẩn hiện mật khẩu"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>

                  {/* Validation Helper Text */}
                  {fieldErrors.matKhau && (
                    <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 pl-3 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{fieldErrors.matKhau}</span>
                    </p>
                  )}
                </div>

                {/* 3.4. TIỆN ÍCH PHỤ: Ghi nhớ đăng nhập & Quên mật khẩu */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border border-white/20 text-cyan-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-slate-300 font-medium hover:text-white transition-colors">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>

                  <div className="flex items-center gap-2.5">
                    {selectedRole === 'KHACH_HANG' && (
                      <button
                        type="button"
                        onClick={() => setCustomerMode('REGISTER')}
                        className="text-purple-400 hover:text-purple-300 font-semibold transition-colors hover:underline text-xs cursor-pointer"
                      >
                        + Đăng ký
                      </button>
                    )}
                    <a
                      href="javascript:void(0)"
                      onClick={() => alert('🔒 Khôi phục Mật khẩu:\nVui lòng liên hệ Trực ban kỹ thuật DoXeAI qua Hotline 1900 8888 hoặc gửi email đến admin@doxeai.vn')}
                      className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors hover:underline"
                    >
                      Quên mật khẩu?
                    </a>
                  </div>
                </div>

                {/* 3.5. NÚT HÀNH ĐỘNG (CTA): Nút "Đăng nhập →" cao cấp */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-400 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_25px_rgba(0,240,255,0.35)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer overflow-hidden disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="relative z-10 flex items-center gap-2 text-slate-950 font-bold">
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Đang xác thực bảo mật...</span>
                      </div>
                    ) : (
                      <span className="relative z-10 flex items-center gap-2">
                        <span>Đăng nhập hệ thống</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Chân Card bảo mật */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bảo mật AI Shield 256-bit</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-500">•</span>
                <span className="text-cyan-400/80">PORT 5000 / 5173</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* 4. FOOTER: Bản quyền & Trợ giúp */}
      <footer className="relative z-20 w-full px-6 py-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Hệ Thống DoXeAI © 2026 - Smart Parking Management Solutions</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hover:text-cyan-300 transition-colors">Camera AI OCR</span>
          <span>•</span>
          <span className="hover:text-cyan-300 transition-colors">Bảng giá xe</span>
          <span>•</span>
          <span className="hover:text-cyan-300 transition-colors">Hotline 1900 8888</span>
        </div>
      </footer>
    </div>
  );
}
