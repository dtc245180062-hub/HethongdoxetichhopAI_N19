import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  User,
  LogOut,
  Shield,
  UserCheck,
  Key,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Car,
  Bell,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Lock
} from 'lucide-react';
import { api } from './services/api';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GateControl from './components/GateControl';
import ParkingMap from './components/ParkingMap';
import HistoryLog from './components/HistoryLog';
import PricingTable from './components/PricingTable';
import UserManagement from './components/UserManagement';
import AiAssistantWidget from './components/AiAssistantWidget';
import CustomerPortal from './components/CustomerPortal';
import CameraAiHub from './components/CameraAiHub';
import BlacklistManagement from './components/BlacklistManagement';
import UserProfile from './components/UserProfile';

export default function App() {
  // Trạng thái phiên đăng nhập người dùng
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('doxeai_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.hoTen === 'Nguyễn Văn Admin' || u.hoTen === 'Trần Minh Quân') {
          u.hoTen = 'Lê Quốc Bảo';
          u.email = 'bao.le@doxeai.vn';
        }
        return u;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedUser = localStorage.getItem('doxeai_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.vaiTro === 'BAO_VE') return 'gate';
        if (u.vaiTro === 'KHACH_HANG') return 'customer';
      }
    } catch {}
    return 'dashboard';
  });

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [slots, setSlots] = useState([]);
  const [zones, setZones] = useState([]);
  const [history, setHistory] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [preSelectedSlot, setPreSelectedSlot] = useState(null);

  // Profile Pop-up Dropdown state & ref
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Bảo vệ phân quyền truy cập Tab theo vai trò thực tế
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.vaiTro;

    if (role === 'KHACH_HANG') {
      const allowed = ['customer', 'map', 'pricing', 'profile'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('customer');
      }
    } else if (role === 'BAO_VE') {
      const allowed = ['gate', 'gate_in', 'gate_out', 'map', 'history', 'pricing', 'profile'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('gate');
      }
    }
  }, [currentUser, activeTab]);

  // Modal đổi mật khẩu cá nhân
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    taiKhoan: '',
    matKhau: '',
    hoTen: '',
    soDienThoai: '',
    email: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Xác thực token và lấy thông tin tài khoản mới nhất khi khởi động
  useEffect(() => {
    const token = localStorage.getItem('doxeai_token');
    if (token) {
      api.getMe()
        .then((res) => {
          if (res.success && res.data) {
            const userData = res.data;
            if (userData.hoTen === 'Nguyễn Văn Admin') {
              userData.hoTen = 'Lê Quốc Bảo';
              userData.email = 'bao.le@doxeai.vn';
            }
            setCurrentUser(userData);
            localStorage.setItem('doxeai_user', JSON.stringify(userData));
          } else {
            handleLogout();
          }
        })
        .catch(() => {});
    }
  }, []);

  // Tải dữ liệu từ Backend Express (port 5000)
  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const [dashRes, slotRes, zoneRes, histRes, priceRes] = await Promise.all([
        api.getDashboard(),
        api.getViTri(),
        api.getKhuVuc(),
        api.getLuotVaoRa({ limit: 50 }),
        api.getBangGia()
      ]);

      if (dashRes.success) setOverview(dashRes.data);
      if (slotRes.success) setSlots(slotRes.data);
      if (zoneRes.success) setZones(zoneRes.data);
      if (histRes.success) setHistory(histRes.data);
      if (priceRes.success) setPricing(priceRes.data);
    } catch (err) {
      console.error('Lỗi kết nối Backend API:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  // Xử lý Đăng nhập thành công
  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    if (user.vaiTro === 'BAO_VE') {
      setActiveTab('gate');
    } else if (user.vaiTro === 'KHACH_HANG') {
      setActiveTab('customer');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Xử lý Đăng xuất
  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Mở modal đổi mật khẩu
  const handleOpenProfileModal = () => {
    if (!currentUser) return;
    setProfileForm({
      taiKhoan: currentUser.taiKhoan || '',
      matKhau: '',
      hoTen: currentUser.hoTen || '',
      soDienThoai: currentUser.soDienThoai || '',
      email: currentUser.email || ''
    });
    setProfileMsg(null);
    setShowPass(false);
    setShowProfileModal(true);
  };

  // Lưu thông tin cá nhân & đổi mật khẩu
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.taiKhoan.trim() || !profileForm.hoTen.trim()) {
      setProfileMsg({ type: 'error', text: 'Tên tài khoản và Họ tên không được để trống!' });
      return;
    }

    try {
      setProfileSaving(true);
      setProfileMsg(null);

      const payload = {
        taiKhoan: profileForm.taiKhoan.trim(),
        hoTen: profileForm.hoTen.trim(),
        soDienThoai: profileForm.soDienThoai.trim(),
        email: profileForm.email.trim()
      };

      if (profileForm.matKhau.trim()) {
        payload.matKhau = profileForm.matKhau.trim();
      }

      const res = await api.updateUser(currentUser.id, payload);
      if (res.success && res.data) {
        const updatedUser = { ...currentUser, ...res.data };
        setCurrentUser(updatedUser);
        localStorage.setItem('doxeai_user', JSON.stringify(updatedUser));
        setProfileMsg({ type: 'success', text: 'Cập nhật tài khoản & mật khẩu thành công!' });
        setTimeout(() => {
          setShowProfileModal(false);
        }, 1500);
      } else {
        setProfileMsg({ type: 'error', text: res.message || 'Cập nhật thất bại!' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Lỗi kết nối máy chủ!' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Nếu chưa đăng nhập, hiển thị Màn hình Đăng nhập
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Danh sách các vị trí còn trống và xe đang đỗ
  const availableSlots = slots.filter(
    (s) => s.trangThai === 'Trống' || s.trangThaiCode === 'TRONG'
  );

  const parkedVehicles = slots
    .filter((s) => (s.trangThai === 'Đã đỗ' || s.trangThaiCode === 'DA_DO') && s.bienSoXe)
    .map((s) => ({
      id: s.id,
      maViTri: s.id,
      bienSo: s.bienSoXe,
      loaiXe: s.loaiXe,
      thoiGianVao: s.thoiGianVao
    }));

  // Xử lý chuyển trang nhanh từ Modal sơ đồ
  const handleQuickAction = (action, payload) => {
    if (currentUser?.vaiTro === 'KHACH_HANG') {
      if (action === 'book_slot') {
        setPreSelectedSlot(payload);
        setActiveTab('customer');
      } else if (action === 'view_my_car') {
        setActiveTab('customer');
      }
      return;
    }

    if (action === 'checkout' || action === 'checkin') {
      setActiveTab('gate');
    }
  };

  const getRoleHeaderBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50/40 px-2.5 py-1 rounded-lg border border-blue-500/30 font-medium">
            <Shield className="w-3 h-3 text-blue-600" />
            Quản Trị Viên
          </span>
        );
      case 'BAO_VE':
        return (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50/40 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            Trực Ban Cổng
          </span>
        );
      case 'KHACH_HANG':
        return (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-purple-400 bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-500/30 font-medium">
            <Car className="w-3 h-3 text-purple-400" />
            Khách Hàng / Cư Dân
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-slate-900 overflow-hidden">
      {/* 1. Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        overview={overview}
        onRefresh={fetchData}
        loading={loading}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-[72px] border-b border-slate-200/80 bg-white/70 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {activeTab === 'profile' && 'Hồ sơ cá nhân'}
              {activeTab === 'customer' && 'Cổng Dịch Vụ Khách Hàng & Cư Dân'}
              {activeTab === 'dashboard' && 'Bảng Điều Khiển Tổng Quan'}
              {activeTab === 'gate' && 'Kiểm Soát Cổng Vào (Làn 01 • Check-In)'}
              {activeTab === 'gate_in' && 'Kiểm Soát Cổng Vào (Làn 01 • Check-In)'}
              {activeTab === 'gate_out' && 'Kiểm Soát Cổng Ra (Làn 02 • Check-Out)'}
              {activeTab === 'map' && 'Sơ Đồ Vị Trí Ô Đỗ Xe'}
              {activeTab === 'history' && 'Nhật Ký Lịch Sử Xe Vào / Ra'}
              {activeTab === 'pricing' && 'Bảng Giá & Định Mức Dịch Vụ'}
              {activeTab === 'users' && 'Quản Lý Người Dùng & Phân Quyền'}
              {activeTab === 'camera_ai' && 'Trung Tâm Camera AI & ANPR'}
              {activeTab === 'blacklist' && 'Quản Lý Danh Sách Đen Xe'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Profile Dropdown Pop-up in Top Right Corner */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="h-12 px-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs flex items-center gap-3 transition cursor-pointer group"
              >
                {/* Rounded avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                  {(currentUser?.hoTen || 'Lê Quốc Bảo').charAt(0).toUpperCase()}
                </div>

                {/* Name & Role */}
                <div className="text-left leading-tight hidden sm:block">
                  <div className="text-xs font-bold text-slate-800">
                    {currentUser?.hoTen || 'Lê Quốc Bảo'}
                  </div>
                  <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                    <span>{currentUser?.chucVu || 'Quản trị hệ thống'}</span>
                  </div>
                </div>

                {isProfileDropdownOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition ml-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition ml-0.5" />
                )}
              </button>

              {/* Pop-up Menu exactly matching LOHA SALES design & proportions */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-5 z-50 animate-fadeIn">
                  <div className="px-1 pt-1 pb-4">
                    <div className="text-base font-bold text-slate-900 tracking-tight">
                      {currentUser?.hoTen || 'Lê Quốc Bảo'}
                    </div>
                    <div className="text-xs text-slate-400 font-normal mt-0.5">
                      {currentUser?.chucVu || 'Quản trị hệ thống'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('profile');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition shrink-0">
                          <User className="w-5 h-5 stroke-[1.8]" />
                        </div>
                        <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900">
                          Hồ sơ cá nhân
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleOpenProfileModal();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-amber-50 group-hover:text-amber-600 transition shrink-0">
                          <Lock className="w-5 h-5 stroke-[1.8]" />
                        </div>
                        <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900">
                          Đổi mật khẩu
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-rose-50/70 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-rose-100 group-hover:text-rose-600 transition shrink-0">
                          <LogOut className="w-5 h-5 stroke-[1.8]" />
                        </div>
                        <span className="text-sm font-medium text-slate-800 group-hover:text-rose-600">
                          Đăng xuất
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                    <p className="text-[11px] text-slate-400 font-normal">
                      DoXeAI • Hệ thống quản lý bãi đỗ xe thông minh
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
          {activeTab === 'customer' && (
            <CustomerPortal
              currentUser={currentUser}
              slots={slots}
              zones={zones}
              pricing={pricing}
              onRefresh={fetchData}
              loading={loading}
              onNavigate={setActiveTab}
              preSelectedSlot={preSelectedSlot}
              onClearPreSelectedSlot={() => setPreSelectedSlot(null)}
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              overview={overview}
              onNavigate={setActiveTab}
              onRefresh={fetchData}
            />
          )}

          {(activeTab === 'gate' || activeTab === 'gate_in' || activeTab === 'gate_out') && (
            currentUser?.vaiTro === 'KHACH_HANG' ? (
              <div className="glass-panel p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12 border border-rose-500/30">
                <div className="p-4 rounded-full bg-rose-500/10 text-rose-600 w-16 h-16 mx-auto flex items-center justify-center">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Quyền Truy Cập Bị Từ Chối</h3>
                <p className="text-sm text-slate-700">
                  Chức năng điều khiển cổng xe Vào / Ra chỉ dành cho Nhân viên Bảo vệ trực cổng và Quản trị viên.
                </p>
                <button
                  onClick={() => setActiveTab('customer')}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-900 font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  Quay Lại Cổng Khách Hàng
                </button>
              </div>
            ) : (
              <GateControl
                onTransactionSuccess={fetchData}
                availableSlots={availableSlots}
                parkedVehicles={parkedVehicles}
                currentUser={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )
          )}

          {activeTab === 'map' && (
            <ParkingMap
              slots={slots}
              zones={zones}
              loading={loading}
              onRefresh={fetchData}
              onQuickAction={handleQuickAction}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'history' && (
            <HistoryLog
              history={history}
              loading={loading}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingTable
              pricing={pricing}
              currentUser={currentUser}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'users' && (
            <UserManagement
              currentUser={currentUser}
            />
          )}

          {activeTab === 'camera_ai' && (
            <CameraAiHub
              slots={slots}
              zones={zones}
              onSelectSlot={(slotId) => {
                setActiveTab('map');
              }}
            />
          )}

          {activeTab === 'blacklist' && (
            <BlacklistManagement
              currentUser={currentUser}
            />
          )}

          {activeTab === 'profile' && (
            <UserProfile
              currentUser={currentUser}
              onUpdateUser={async (updatedData) => {
                const updated = { ...currentUser, ...updatedData };
                setCurrentUser(updated);
                localStorage.setItem('doxeai_user', JSON.stringify(updated));
                try {
                  if (api.updateUser && currentUser?.id) {
                    await api.updateUser(currentUser.id, updatedData);
                  }
                } catch (e) {
                  console.error('Lỗi cập nhật hồ sơ:', e);
                }
              }}
              onOpenPasswordModal={handleOpenProfileModal}
            />
          )}
        </main>
      </div>

      {/* Profile & Change Password Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-100/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tài Khoản & Mật Khẩu</h3>
                  <p className="text-xs text-slate-600">Đổi thông tin đăng nhập của bạn</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-600 hover:text-slate-900 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {profileMsg && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-700'
                    : 'bg-rose-50/60 border-rose-500/40 text-rose-700'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold">Tên đăng nhập (Username) *</label>
                <input
                  type="text"
                  required
                  value={profileForm.taiKhoan}
                  onChange={(e) => setProfileForm({ ...profileForm, taiKhoan: e.target.value })}
                  className="w-full h-11 px-4 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold">Họ và tên hiển thị *</label>
                <input
                  type="text"
                  required
                  value={profileForm.hoTen}
                  onChange={(e) => setProfileForm({ ...profileForm, hoTen: e.target.value })}
                  className="w-full h-11 px-4 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-slate-900 text-sm font-semibold outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold">
                  Mật khẩu mới <span className="text-slate-500 font-normal">(để trống nếu giữ nguyên)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={profileForm.matKhau}
                    onChange={(e) => setProfileForm({ ...profileForm, matKhau: e.target.value })}
                    placeholder="Nhập mật khẩu mới nếu muốn đổi..."
                    className="w-full h-11 px-4 pr-11 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-slate-900 text-sm font-mono outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-semibold">Số điện thoại</label>
                  <input
                    type="text"
                    value={profileForm.soDienThoai}
                    onChange={(e) => setProfileForm({ ...profileForm, soDienThoai: e.target.value })}
                    placeholder="09xx..."
                    className="w-full h-11 px-4 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-slate-900 text-sm outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-semibold">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="email@..."
                    className="w-full h-11 px-4 bg-slate-50/70 border border-slate-200/90 rounded-2xl text-slate-900 text-sm outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-slate-900 shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {profileSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Floating AI Assistant Chatbot */}
      <AiAssistantWidget currentUser={currentUser} />
    </div>
  );
}
