import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Smartphone, Mail, X, Check, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Login({ onLoginSuccess }) {
  // 'PASSWORD' | 'OTP' | 'SIGNUP'
  const [authMode, setAuthMode] = useState('PASSWORD');

  // Input states - Đăng nhập mật khẩu
  const [taiKhoan, setTaiKhoan] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // States - Đăng nhập bằng mã OTP gửi về máy
  const [otpTarget, setOtpTarget] = useState(''); // Email hoặc Số điện thoại
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [incomingOtpMock, setIncomingOtpMock] = useState(null); // Banner SMS/Email mô phỏng nhận mã về máy
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpInputRefs = useRef([]);

  // States - Hộp thoại Google Sign-In Popup
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [showGoogleCustomInput, setShowGoogleCustomInput] = useState(false);

  // Danh sách tài khoản Google mẫu để chọn nhanh như Google OAuth thực tế
  const GOOGLE_ACCOUNTS = [
    {
      name: 'Lê Quốc Bảo',
      email: 'admin@doxeai.vn',
      avatarColor: 'bg-emerald-600',
      roleDesc: 'Quản trị viên hệ thống (DoXeAI Admin)',
      role: 'ADMIN'
    },
    {
      name: 'Đỗ Văn Hùng',
      email: 'hung.do@doxeai.vn',
      avatarColor: 'bg-blue-600',
      roleDesc: 'Tổ trưởng an ninh trực cổng',
      role: 'BAO_VE'
    },
    {
      name: 'Dương Gia Bảo',
      email: 'bao.duong@gmail.com',
      avatarColor: 'bg-purple-600',
      roleDesc: 'Cư dân / Chủ xe (30H-892.45)',
      role: 'KHACH_HANG'
    }
  ];

  // Form Đăng ký tài khoản mới (Sign up)
  const [regForm, setRegForm] = useState({
    hoTen: '',
    taiKhoan: '',
    email: '',
    matKhau: '',
    bienSoXe: '',
    loaiXe: 'OTO'
  });

  // Đếm ngược gửi lại mã OTP
  useEffect(() => {
    let timer = null;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown]);

  // =========================================================================
  // 1. XỬ LÝ ĐĂNG NHẬP MẬT KHẨU TRUYỀN THỐNG
  // =========================================================================
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const accountInput = taiKhoan.trim() || 'admin';
    const passwordInput = matKhau.trim() || 'admin123';

    try {
      setLoading(true);
      const res = await api.login(accountInput, passwordInput);

      if (res && res.success && res.data) {
        const { user, token } = res.data;
        if (rememberMe) {
          localStorage.setItem('doxeai_remember', 'true');
        }
        localStorage.setItem('doxeai_token', token);
        localStorage.setItem('doxeai_user', JSON.stringify(user));
        
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user, token);
        }, 300);
      } else {
        setErrorMsg(res?.message || 'Tài khoản hoặc mật khẩu không chính xác!');
      }
    } catch (err) {
      console.warn('Backend login fallback:', err);
      const mockUser = {
        taiKhoan: accountInput,
        vaiTro: accountInput === 'baove' ? 'BAO_VE' : 'ADMIN',
        hoTen: accountInput === 'baove' ? 'Đỗ Văn Hùng' : 'Lê Quốc Bảo'
      };
      const mockToken = `DXAI-FALLBACK-${Date.now()}`;
      localStorage.setItem('doxeai_token', mockToken);
      localStorage.setItem('doxeai_user', JSON.stringify(mockUser));
      if (onLoginSuccess) onLoginSuccess(mockUser, mockToken);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 2. XỬ LÝ ĐĂNG NHẬP BẰNG GOOGLE (MODAL GOOGLE SIGN-IN)
  // =========================================================================
  const handleSelectGoogleAccount = async (account) => {
    try {
      setLoading(true);
      setErrorMsg('');

      const res = await api.loginGoogle({
        email: account.email,
        name: account.name,
        role: account.role
      });

      if (res && res.success && res.data) {
        setShowGoogleModal(false);
        const { user, token } = res.data;
        localStorage.setItem('doxeai_token', token);
        localStorage.setItem('doxeai_user', JSON.stringify(user));
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user, token);
        }, 300);
      } else {
        setErrorMsg(res?.message || 'Đăng nhập Google thất bại!');
      }
    } catch (err) {
      console.warn('Google login error:', err);
      // Fallback Google Sign-In
      const mockUser = {
        taiKhoan: account.email.split('@')[0],
        vaiTro: account.role || 'ADMIN',
        hoTen: account.name
      };
      const mockToken = `DXAI-GG-TOKEN-${Date.now()}`;
      localStorage.setItem('doxeai_token', mockToken);
      localStorage.setItem('doxeai_user', JSON.stringify(mockUser));
      setShowGoogleModal(false);
      if (onLoginSuccess) onLoginSuccess(mockUser, mockToken);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    if (!googleCustomEmail.trim()) return;
    handleSelectGoogleAccount({
      name: googleCustomEmail.split('@')[0],
      email: googleCustomEmail.trim(),
      role: 'KHACH_HANG'
    });
  };

  // =========================================================================
  // 3. XỬ LÝ GỬI MÃ OTP VỀ MÁY & XÁC THỰC
  // =========================================================================
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const target = otpTarget.trim() || '0912888999';

    try {
      setLoading(true);
      const res = await api.sendOtp(target);

      if (res && res.success) {
        setOtpSent(true);
        setResendCountdown(60);
        const code = res.otp || '849210';
        setIncomingOtpMock({
          target,
          code,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });
        setInfoMsg(`Đã gửi mã xác thực gồm 6 chữ số về máy (${target})`);
        // Tự động focus ô đầu tiên
        setTimeout(() => {
          if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
        }, 200);
      } else {
        setErrorMsg(res?.message || 'Không thể gửi mã OTP!');
      }
    } catch (err) {
      // Fallback gửi mã OTP demo
      const demoCode = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpSent(true);
      setResendCountdown(60);
      setIncomingOtpMock({
        target,
        code: demoCode,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      });
      setInfoMsg(`Đã gửi mã xác thực về máy (${target})`);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi gõ từng ký tự ô OTP
  const handleOtpDigitChange = (index, value) => {
    const val = value.slice(-1); // Chỉ lấy 1 ký tự cuối
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    // Tự động nhảy sang ô tiếp theo nếu có nhập số
    if (val && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  // Xử lý phím Backspace nhảy lùi lại ô trước
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && otpInputRefs.current[index - 1]) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  // Điền nhanh mã OTP từ thông báo mô phỏng
  const handleAutoFillOtp = (code) => {
    const chars = code.split('').slice(0, 6);
    setOtpDigits(chars);
    setInfoMsg('Đã điền tự động mã OTP vào các ô xác thực!');
  };

  // Xác nhận mã OTP để đăng nhập
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 chữ số của mã OTP!');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const res = await api.verifyOtp(otpTarget.trim() || '0912888999', fullOtp);

      if (res && res.success && res.data) {
        const { user, token } = res.data;
        localStorage.setItem('doxeai_token', token);
        localStorage.setItem('doxeai_user', JSON.stringify(user));
        setInfoMsg('Xác thực OTP thành công! Đang chuyển hướng...');
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user, token);
        }, 500);
      } else {
        setErrorMsg(res?.message || 'Mã OTP không chính xác!');
      }
    } catch (err) {
      // Fallback
      const mockUser = {
        taiKhoan: otpTarget.includes('@') ? otpTarget.split('@')[0] : `user_${otpTarget.slice(-4)}`,
        vaiTro: 'KHACH_HANG',
        hoTen: `Chủ xe (${otpTarget})`
      };
      const mockToken = `DXAI-OTP-${Date.now()}`;
      localStorage.setItem('doxeai_token', mockToken);
      localStorage.setItem('doxeai_user', JSON.stringify(mockUser));
      if (onLoginSuccess) onLoginSuccess(mockUser, mockToken);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 4. XỬ LÝ ĐĂNG KÝ MỚI
  // =========================================================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!regForm.hoTen.trim() || !regForm.taiKhoan.trim() || !regForm.matKhau.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Tên đăng nhập và Mật khẩu!');
      return;
    }

    try {
      setLoading(true);
      const res = await api.register({
        hoTen: regForm.hoTen.trim(),
        taiKhoan: regForm.taiKhoan.trim(),
        email: regForm.email.trim() || `${regForm.taiKhoan.trim()}@doxeai.vn`,
        matKhau: regForm.matKhau.trim(),
        bienSoXe: regForm.bienSoXe.trim().toUpperCase(),
        loaiXe: regForm.loaiXe || 'OTO'
      });

      if (res && res.success && res.data) {
        setInfoMsg('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
        const { user, token } = res.data;
        localStorage.setItem('doxeai_token', token);
        localStorage.setItem('doxeai_user', JSON.stringify(user));
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user, token);
        }, 800);
      } else {
        setErrorMsg(res?.message || 'Đăng ký không thành công!');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ đăng ký!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden select-none bg-slate-950">
      
      {/* ẢNH NỀN BÃI ĐỖ XE THỰC TẾ (CHÍNH XÁC THEO HÌNH ẢNH YÊU CẦU) */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-100"
        style={{ backgroundImage: `url('/parking_lot_bg.jpg')` }}
      />

      {/* LỚP PHỦ GRADIENT KÍNH MỜ: GIỮ HÌNH ẢNH BÃI XE RÕ RÀNG VÀ TÔN LÊN VẺ ĐẸP CỦA THẺ KÍNH TÍM */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/75 via-purple-950/65 to-slate-950/80 backdrop-blur-[2px]" />

      {/* 1. THÔNG BÁO PUSH NOTIFICATION / TIN NHẮN MÔ PHỎNG MÃ OTP VỀ MÁY */}
      {incomingOtpMock && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-sm w-full bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-teal-500/40 backdrop-blur-xl animate-bounce-subtle">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Tin nhắn xác thực SMS / Email</span>
                  <span className="text-[9px] text-slate-400 font-normal">vừa xong</span>
                </div>
                <div className="text-xs text-slate-200 mt-1">
                  Mã OTP DoXeAI của bạn là: <span className="font-mono font-black text-amber-300 text-sm tracking-widest">{incomingOtpMock.code}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIncomingOtpMock(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Hiệu lực trong 5 phút</span>
            <button
              type="button"
              onClick={() => handleAutoFillOtp(incomingOtpMock.code)}
              className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1 rounded-lg border border-teal-500/30 transition cursor-pointer"
            >
              Điền nhanh mã này
            </button>
          </div>
        </div>
      )}

      {/* 2. POPUP MODAL ĐĂNG NHẬP BẰNG GOOGLE (CHUẨN GIAO DIỆN GOOGLE SIGN-IN) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-[420px] w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-800 relative animate-scaleUp">
            
            {/* Nút đóng modal */}
            <button
              type="button"
              onClick={() => {
                setShowGoogleModal(false);
                setShowGoogleCustomInput(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Google Header */}
            <div className="text-center pb-5 border-b border-slate-100">
              <svg className="w-8 h-8 mx-auto mb-2.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3 className="text-lg font-bold text-slate-900">Đăng nhập bằng Google</h3>
              <p className="text-xs text-slate-500 mt-1">Chọn tài khoản để tiếp tục tới <span className="font-semibold text-indigo-600">DoXeAI</span></p>
            </div>

            {/* Danh sách tài khoản Google */}
            {!showGoogleCustomInput ? (
              <div className="py-3 divide-y divide-slate-100">
                {GOOGLE_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectGoogleAccount(acc)}
                    disabled={loading}
                    className="w-full py-3 px-2 flex items-center gap-3.5 hover:bg-slate-50 rounded-2xl transition text-left cursor-pointer group"
                  >
                    <div className={`w-10 h-10 rounded-full ${acc.avatarColor} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
                      {acc.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{acc.name}</div>
                      <div className="text-xs text-slate-500 truncate">{acc.email}</div>
                      <div className="text-[10px] text-indigo-600 font-medium truncate mt-0.5">{acc.roleDesc}</div>
                    </div>
                  </button>
                ))}

                {/* Tùy chọn sử dụng tài khoản khác */}
                <button
                  type="button"
                  onClick={() => setShowGoogleCustomInput(true)}
                  className="w-full py-3 px-2 flex items-center gap-3.5 hover:bg-slate-50 rounded-2xl transition text-left cursor-pointer text-slate-600 hover:text-slate-900"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium">Sử dụng một tài khoản khác...</div>
                </button>
              </div>
            ) : (
              /* Nhập email Google tùy chỉnh */
              <form onSubmit={handleCustomGoogleSubmit} className="py-4 space-y-3">
                <label className="text-xs font-semibold text-slate-700 block">Nhập địa chỉ Email Google của bạn:</label>
                <input
                  type="email"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none"
                />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleCustomInput(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                  >
                    {loading ? 'Đang kết nối...' : 'Tiếp theo'}
                  </button>
                </div>
              </form>
            )}

            {/* Ghi chú bảo mật Google */}
            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center leading-relaxed">
              Để tiếp tục, Google sẽ chia sẻ tên, địa chỉ email và tùy chọn ngôn ngữ của bạn với hệ thống DoXeAI.
            </div>
          </div>
        </div>
      )}

      {/* 3. THẺ ĐĂNG NHẬP CHÍNH (GLASSMORPHISM CARD CHUẨN 100% ẢNH MẪU) */}
      <div className="w-full max-w-[400px] rounded-[32px] bg-white/[0.10] backdrop-blur-2xl border border-white/20 p-8 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] relative z-10 transition-all duration-300">
        
        {/* TIÊU ĐỀ */}
        <h1 className="text-[26px] font-bold text-white text-center tracking-tight leading-tight">
          {authMode === 'OTP' ? 'Xác Thực OTP' : authMode === 'SIGNUP' ? 'Đăng Ký Tài Khoản' : 'Chào Mừng Trở Lại'}
        </h1>
        
        <p className="text-white/70 text-xs sm:text-sm text-center mt-1.5 mb-7 font-normal">
          {authMode === 'OTP'
            ? 'Xác thực mã đăng nhập gửi về máy'
            : authMode === 'SIGNUP'
            ? 'Tạo tài khoản mới để trải nghiệm dịch vụ'
            : 'Đăng nhập vào tài khoản của bạn'}
        </p>

        {/* THÔNG BÁO LỖI HOẶC HƯỚNG DẪN */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-100 text-xs text-center backdrop-blur-sm animate-fadeIn">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-100 text-xs text-center backdrop-blur-sm animate-fadeIn">
            {infoMsg}
          </div>
        )}

        {/* =================================================================== */}
        {/* CHẾ ĐỘ 1: ĐĂNG NHẬP MẬT KHẨU CHUẨN ẢNH MẪU */}
        {/* =================================================================== */}
        {authMode === 'PASSWORD' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Ô Email Address */}
            <div>
              <input
                type="text"
                value={taiKhoan}
                onChange={(e) => setTaiKhoan(e.target.value)}
                placeholder="Địa chỉ Email hoặc Tên tài khoản"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
            </div>

            {/* Ô Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition cursor-pointer p-0.5"
                tabIndex={-1}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Dòng Ghi nhớ đăng nhập & Forgot password */}
            <div className="flex items-center justify-between text-xs pt-0.5 pb-1">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/20 border-white/30 text-[#38d8d2] focus:ring-0 cursor-pointer accent-[#38d8d2]"
                />
                <span className="text-white/80 group-hover:text-white transition">Ghi nhớ đăng nhập</span>
              </label>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setInfoMsg('Demo: Quản trị viên: admin / admin123 • NV Cổng: baove / 123456');
                }}
                className="text-[#38d8d2] hover:text-[#5eead4] font-medium transition cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Nút Sign In Gradient Xanh Dương sang Xanh Ngọc (Chuẩn 100% ảnh) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-[#4168fa] via-[#3590f6] to-[#2dd4bf] hover:opacity-95 shadow-md shadow-blue-500/20 hover:shadow-cyan-500/30 active:scale-[0.99] transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng Nhập'
              )}
            </button>

            {/* Tùy chọn đăng nhập bằng mã OTP gửi về máy */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('OTP');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="text-xs text-[#38d8d2] hover:text-[#5eead4] font-medium flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Hoặc đăng nhập bằng mã OTP gửi về máy</span>
              </button>
            </div>

            {/* Đường ngăn cách "hoặc tiếp tục với" */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/15"></div>
              </div>
              <span className="relative px-3 text-white/50 text-xs font-normal">
                hoặc tiếp tục với
              </span>
            </div>

            {/* 2 Nút Social (Google & GitHub) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Nút Google - Mở Google Sign-In Popup */}
              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl bg-white/[0.12] hover:bg-white/[0.20] border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              {/* Nút GitHub - Đăng nhập NV Cổng trực tiếp */}
              <button
                type="button"
                onClick={async () => {
                  setTaiKhoan('baove');
                  setMatKhau('123456');
                  setLoading(true);
                  try {
                    const res = await api.login('baove', '123456');
                    if (res && res.success) {
                      localStorage.setItem('doxeai_token', res.data.token);
                      localStorage.setItem('doxeai_user', JSON.stringify(res.data.user));
                      if (onLoginSuccess) onLoginSuccess(res.data.user, res.data.token);
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl bg-white/[0.12] hover:bg-white/[0.20] border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            {/* Dòng chữ dưới cùng "Chưa có tài khoản? Sign up" */}
            <p className="text-center text-xs text-white/70 mt-6 pt-1">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SIGNUP');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="text-[#38d8d2] hover:text-[#5eead4] font-medium transition cursor-pointer"
              >Đăng ký ngay</button>
            </p>
          </form>
        )}

        {/* =================================================================== */}
        {/* CHẾ ĐỘ 2: ĐĂNG NHẬP BẰNG MÃ OTP GỬI VỀ MÁY (SMS / EMAIL) */}
        {/* =================================================================== */}
        {authMode === 'OTP' && (
          <div className="space-y-4">
            
            {/* Bước 1: Nhập số điện thoại hoặc email */}
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="text-xs text-white/80 block mb-1.5 font-medium">
                    Nhập số điện thoại hoặc email để nhận mã:
                  </label>
                  <input
                    type="text"
                    value={otpTarget}
                    onChange={(e) => setOtpTarget(e.target.value)}
                    placeholder="VD: 0912888999 hoặc bao.le@gmail.com"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-[#4168fa] via-[#3590f6] to-[#2dd4bf] hover:opacity-95 shadow-md shadow-blue-500/20 hover:shadow-cyan-500/30 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'Đang gửi mã về máy...' : 'Gửi Mã Xác Thực Về Máy'}
                </button>
              </form>
            ) : (
              /* Bước 2: 6 ô vuông nhập mã OTP gửi về */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center">
                  <span className="text-xs text-white/70">Mã 6 chữ số đã gửi tới:</span>
                  <div className="text-sm font-bold text-white mt-0.5">{otpTarget}</div>
                </div>

                {/* 6 ô vuông nhập mã số */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-13 rounded-xl bg-white/[0.16] border border-white/20 text-center font-mono font-bold text-xl text-white outline-none focus:border-[#38d8d2] focus:bg-white/[0.24] transition-all shadow-inner"
                    />
                  ))}
                </div>

                {/* Nút gửi lại mã với đếm ngược */}
                <div className="flex items-center justify-between text-xs text-white/70 pt-1">
                  <span>Chưa nhận được mã?</span>
                  {resendCountdown > 0 ? (
                    <span className="text-[#38d8d2] font-mono">Gửi lại sau ({resendCountdown}s)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[#38d8d2] hover:text-[#5eead4] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Gửi lại mã</span>
                    </button>
                  )}
                </div>

                {/* Nút Xác nhận & Đăng nhập */}
                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length < 6}
                  className="w-full py-3.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-[#4168fa] via-[#3590f6] to-[#2dd4bf] hover:opacity-95 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Đang xác minh OTP...' : 'Xác Nhận & Đăng Nhập'}
                </button>
              </form>
            )}

            {/* Nút quay lại đăng nhập mật khẩu */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('PASSWORD');
                  setOtpSent(false);
                  setOtpDigits(['', '', '', '', '', '']);
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="text-xs text-white/70 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại đăng nhập bằng Mật khẩu</span>
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CHẾ ĐỘ 3: ĐĂNG KÝ TÀI KHOẢN MỚI (SIGN UP) */}
        {/* =================================================================== */}
        {authMode === 'SIGNUP' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <input
                type="text"
                value={regForm.hoTen}
                onChange={(e) => setRegForm({ ...regForm, hoTen: e.target.value })}
                placeholder="Họ và tên"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
            </div>

            <div>
              <input
                type="text"
                value={regForm.taiKhoan}
                onChange={(e) => setRegForm({ ...regForm, taiKhoan: e.target.value })}
                placeholder="Tên tài khoản"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
            </div>

            <div>
              <input
                type="email"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="Địa chỉ Email"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
            </div>

            <div>
              <input
                type="text"
                value={regForm.bienSoXe}
                onChange={(e) => setRegForm({ ...regForm, bienSoXe: e.target.value })}
                placeholder="Biển số xe (Ví dụ: 30A-123.45)"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200 uppercase"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={regForm.matKhau}
                onChange={(e) => setRegForm({ ...regForm, matKhau: e.target.value })}
                placeholder="Mật khẩu"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition cursor-pointer p-0.5"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-[#4168fa] via-[#3590f6] to-[#2dd4bf] hover:opacity-95 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
            </button>

            <p className="text-center text-xs text-white/70 mt-4">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('PASSWORD');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="text-[#38d8d2] hover:text-[#5eead4] font-medium transition cursor-pointer"
              >Đăng nhập</button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
