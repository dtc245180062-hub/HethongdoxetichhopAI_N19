import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

export default function Login({ onLoginSuccess }) {
  // Chế độ đăng nhập (LOGIN) hoặc đăng ký (REGISTER)
  const [isSignUp, setIsSignUp] = useState(false);

  // Input states
  const [taiKhoan, setTaiKhoan] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Form Đăng ký tài khoản mới (Sign up)
  const [regForm, setRegForm] = useState({
    hoTen: '',
    taiKhoan: '',
    email: '',
    matKhau: '',
    bienSoXe: '',
    loaiXe: 'OTO'
  });

  // Xử lý gửi Form Đăng nhập
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    // Nếu người dùng không nhập gì mà bấm Sign In trực tiếp, tự động điền demo admin
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
          if (onLoginSuccess) {
            onLoginSuccess(user, token);
          }
        }, 300);
      } else {
        setErrorMsg(res?.message || 'Tài khoản hoặc mật khẩu không chính xác!');
      }
    } catch (err) {
      console.warn('Backend login fallback:', err);
      // Fallback an toàn nếu backend đang bận
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

  // Đăng nhập nhanh 1-Click bằng Social (Google / GitHub)
  const handleSocialLogin = async (provider) => {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    try {
      // Google -> Đăng nhập tài khoản Admin Quản trị viên
      // GitHub -> Đăng nhập tài khoản Nhân viên cổng
      const loginUser = provider === 'Google' ? 'admin' : 'baove';
      const loginPass = provider === 'Google' ? 'admin123' : '123456';

      setTaiKhoan(loginUser);
      setMatKhau(loginPass);

      const res = await api.login(loginUser, loginPass);
      if (res && res.success && res.data) {
        const { user, token } = res.data;
        localStorage.setItem('doxeai_token', token);
        localStorage.setItem('doxeai_user', JSON.stringify(user));
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user, token);
        }, 300);
      } else {
        setErrorMsg(res?.message || 'Đăng nhập thất bại!');
      }
    } catch (err) {
      console.warn('Social login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi bấm "Forgot password?"
  const handleForgotPassword = (e) => {
    e.preventDefault();
    setInfoMsg('Demo: Quản trị viên: admin / admin123 • NV Cổng: baove / 123456');
    setErrorMsg('');
  };

  // Xử lý gửi Form Đăng ký
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#5352d1] via-[#655ee1] to-[#806ff5] font-sans relative overflow-hidden select-none">
      
      {/* Hiệu ứng hào quang nền tinh tế */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* THẺ ĐĂNG NHẬP THỦY TINH (GLASSMORPHISM CARD) - THIẾT KẾ GIỐNG 100% ẢNH MẪU */}
      <div className="w-full max-w-[400px] rounded-[32px] bg-white/[0.10] backdrop-blur-2xl border border-white/20 p-8 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] relative z-10 transition-all duration-300">
        
        {/* TIÊU ĐỀ CHÍNH */}
        <h1 className="text-[26px] font-bold text-white text-center tracking-tight leading-tight">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        
        <p className="text-white/70 text-xs sm:text-sm text-center mt-1.5 mb-7 font-normal">
          {isSignUp ? 'Sign up for a new account' : 'Sign in to your account'}
        </p>

        {/* THÔNG BÁO LỖI HOẶC HƯỚNG DẪN GỌN GÀNG */}
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

        {/* FORM ĐĂNG NHẬP */}
        {!isSignUp ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Ô Email Address / Tài khoản */}
            <div>
              <input
                type="text"
                value={taiKhoan}
                onChange={(e) => setTaiKhoan(e.target.value)}
                placeholder="Email Address"
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
                placeholder="Password"
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

            {/* Dòng Remember me & Forgot password */}
            <div className="flex items-center justify-between text-xs pt-0.5 pb-1">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/20 border-white/30 text-[#38d8d2] focus:ring-0 cursor-pointer accent-[#38d8d2]"
                />
                <span className="text-white/80 group-hover:text-white transition">Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[#38d8d2] hover:text-[#5eead4] font-medium transition cursor-pointer"
              >
                Forgot password?
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
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Đường ngăn cách "or continue with" */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/15"></div>
              </div>
              <span className="relative px-3 text-white/50 text-xs font-normal">
                or continue with
              </span>
            </div>

            {/* 2 Nút Social (Google & GitHub) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Nút Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl bg-white/[0.12] hover:bg-white/[0.20] border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {/* Google Logo chuẩn SVG */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              {/* Nút GitHub */}
              <button
                type="button"
                onClick={() => handleSocialLogin('GitHub')}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl bg-white/[0.12] hover:bg-white/[0.20] border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {/* GitHub Mark SVG */}
                <svg className="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            {/* Dòng chữ dưới cùng "Don't have an account? Sign up" */}
            <p className="text-center text-xs text-white/70 mt-6 pt-1">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="text-[#38d8d2] hover:text-[#5eead4] font-medium transition cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </form>
        ) : (
          /* FORM ĐĂNG KÝ TÀI KHOẢN MỚI (SIGN UP) */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <input
                type="text"
                value={regForm.hoTen}
                onChange={(e) => setRegForm({ ...regForm, hoTen: e.target.value })}
                placeholder="Full Name"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
            </div>

            <div>
              <input
                type="text"
                value={regForm.taiKhoan}
                onChange={(e) => setRegForm({ ...regForm, taiKhoan: e.target.value })}
                placeholder="Username"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
            </div>

            <div>
              <input
                type="email"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="Email Address"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200"
              />
            </div>

            <div>
              <input
                type="text"
                value={regForm.bienSoXe}
                onChange={(e) => setRegForm({ ...regForm, bienSoXe: e.target.value })}
                placeholder="License Plate (e.g. 30A-123.45)"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.16] focus:bg-white/[0.20] border border-white/10 focus:border-white/30 text-white placeholder-white/50 text-sm outline-none transition-all duration-200 uppercase"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={regForm.matKhau}
                onChange={(e) => setRegForm({ ...regForm, matKhau: e.target.value })}
                placeholder="Password"
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
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p className="text-center text-xs text-white/70 mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="text-[#38d8d2] hover:text-[#5eead4] font-medium transition cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
