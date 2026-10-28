import React, { useState } from 'react';
import {
  Shield,
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Info,
  Check,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  X
} from 'lucide-react';

export default function UserProfile({
  currentUser,
  onUpdateUser,
  onOpenPasswordModal
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    hoTen: currentUser?.hoTen || 'Lê Quốc Bảo',
    soDienThoai: currentUser?.soDienThoai || '0912888999',
    email: currentUser?.email || 'bao.le@doxeai.vn',
    ngaySinh: currentUser?.ngaySinh || '',
    gioiTinh: currentUser?.gioiTinh || '',
    khuVucPhuTrach: currentUser?.khuVucPhuTrach || 'Toàn bộ hệ thống bãi xe DoXeAI'
  });

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const initialLetter = (formData.hoTen || currentUser?.hoTen || 'Q').charAt(0).toUpperCase();

  const isBirthAndGenderSet = Boolean(formData.ngaySinh && formData.gioiTinh);
  const completionPercent = isBirthAndGenderSet ? 100 : 65;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      if (onUpdateUser) {
        await onUpdateUser(formData);
      }
      setIsEditing(false);
      setNotification({
        type: 'success',
        message: 'Đã cập nhật hồ sơ cá nhân thành công!'
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Có lỗi xảy ra khi lưu thông tin'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* 1. Yêu cầu bổ sung thông tin cá nhân Banner */}
      {!isBirthAndGenderSet && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-700 shrink-0">
              <Shield className="w-5 h-5 text-amber-600 stroke-[1.8]" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 tracking-tight">
                Yêu cầu bổ sung thông tin cá nhân
              </p>
              <p className="text-xs text-amber-700/90 mt-0.5">
                Vui lòng cập nhật đầy đủ Ngày sinh và Giới tính để hoàn tất 100% hồ sơ nhân sự theo quy chuẩn hệ thống.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition shadow-xs cursor-pointer shrink-0"
          >
            Cập nhật ngay
          </button>
        </div>
      )}

      {/* Thông báo cập nhật */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái: Thông tin cá nhân chi tiết (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-7">
            {/* Header hồ sơ với Avatar tròn lớn và nút chỉnh sửa */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-white shrink-0">
                  {initialLetter}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {formData.hoTen || currentUser?.hoTen || 'Lê Quốc Bảo'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Hồ sơ nhân sự &amp; Định danh tài khoản
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-10 px-4 rounded-2xl bg-blue-50/80 hover:bg-blue-100/90 text-blue-700 font-semibold text-xs border border-blue-200/80 flex items-center gap-2 transition cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isEditing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa thông tin'}</span>
                </button>
              </div>
            </div>

            {/* Form trường thông tin chi tiết với kích thước h-12 rounded-2xl đồng nhất */}
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 1. Tên tài khoản */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      Tên tài khoản
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Cố định
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.taiKhoan || 'admin'}
                    className="w-full h-12 px-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-slate-800 text-sm font-semibold cursor-not-allowed select-none outline-none"
                  />
                </div>

                {/* 2. Địa chỉ Email */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      Địa chỉ Email
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Đã xác thực
                    </span>
                  </div>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full h-12 px-4 rounded-2xl border text-sm font-semibold transition outline-none ${
                      isEditing
                        ? 'bg-white border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900'
                        : 'bg-slate-50/70 border-slate-200/90 text-slate-800'
                    }`}
                  />
                </div>

                {/* 3. Họ và tên */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      Họ và tên
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.hoTen}
                    onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                    className={`w-full h-12 px-4 rounded-2xl border text-sm font-semibold transition outline-none ${
                      isEditing
                        ? 'bg-white border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900'
                        : 'bg-slate-50/70 border-slate-200/90 text-slate-800'
                    }`}
                  />
                </div>

                {/* 4. Số điện thoại */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      Số điện thoại liên hệ
                    </span>
                  </div>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={formData.soDienThoai}
                    onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                    className={`w-full h-12 px-4 rounded-2xl border text-sm font-semibold transition outline-none ${
                      isEditing
                        ? 'bg-white border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900'
                        : 'bg-slate-50/70 border-slate-200/90 text-slate-800'
                    }`}
                  />
                </div>

                {/* 5. Ngày sinh */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Ngày sinh
                    </span>
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                      Cập nhật 1 lần
                    </span>
                  </div>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.ngaySinh}
                      onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                      className="w-full h-12 px-4 rounded-2xl bg-white border border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-900 outline-none"
                    />
                  ) : (
                    <div className="w-full h-12 px-4 rounded-2xl bg-amber-50/30 border border-amber-200/80 text-sm flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className={formData.ngaySinh ? 'text-slate-800 font-semibold' : 'text-amber-800 font-medium'}>
                        {formData.ngaySinh || 'Chưa cập nhật ngày sinh'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 6. Giới tính */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      Giới tính
                    </span>
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                      Cập nhật 1 lần
                    </span>
                  </div>
                  {isEditing ? (
                    <select
                      value={formData.gioiTinh}
                      onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
                      className="w-full h-12 px-4 rounded-2xl bg-white border border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="">-- Chọn giới tính --</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  ) : (
                    <div className="w-full h-12 px-4 rounded-2xl bg-amber-50/30 border border-amber-200/80 text-sm flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className={formData.gioiTinh ? 'text-slate-800 font-semibold' : 'text-amber-800 font-medium'}>
                        {formData.gioiTinh || 'Chưa cập nhật giới tính'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Khu vực / Kho phụ trách (Full width across 2 cols) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Building className="w-4 h-4 text-slate-400" />
                    Khu vực / Kho phụ trách
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 italic">
                    Do quản trị viên phân công
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={formData.khuVucPhuTrach}
                  className="w-full h-12 px-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-slate-800 text-sm font-semibold cursor-not-allowed select-none outline-none"
                />
              </div>

              {/* Nút lưu khi ở chế độ chỉnh sửa */}
              {isEditing && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="h-10 px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Cột phải: Mức độ hoàn thiện & Chi tiết hệ thống (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Mức độ hoàn thiện hồ sơ */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Mức độ hoàn thiện hồ sơ
            </h2>

            {/* Thanh tiến độ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Tiến trình</span>
                <span className="font-bold text-blue-600">{completionPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            {/* Checklist items với kích thước h-12 rounded-2xl đồng nhất */}
            <div className="space-y-3 pt-1">
              <div className="h-12 w-full px-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Số điện thoại</span>
                </div>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Đã có
                </span>
              </div>

              <div className="h-12 w-full px-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
                  <AlertCircle className={`w-4 h-4 ${isBirthAndGenderSet ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span>Ngày sinh &amp; Giới tính</span>
                </div>
                <span
                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                    isBirthAndGenderSet
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                      : 'text-amber-700 bg-amber-50 border-amber-100'
                  }`}
                >
                  {isBirthAndGenderSet ? 'Đã có' : 'Chưa cập nhật'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Chi tiết hệ thống với kích thước h-12 rounded-2xl đồng nhất */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              Chi tiết hệ thống
            </h2>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">Tên tài khoản</label>
                <div className="h-12 px-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-slate-800 font-bold font-mono text-sm flex items-center select-none">
                  {currentUser?.taiKhoan || 'admin'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">Ngày khởi tạo</label>
                <div className="h-12 px-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-slate-700 font-semibold text-sm flex items-center select-none">
                  {currentUser?.ngayTao || '01/01/2026'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">Quyền hạn hệ thống</label>
                <div className="h-12 px-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-slate-700 font-semibold text-sm flex items-center justify-between select-none">
                  <span>{currentUser?.chucVu || 'Quản trị hệ thống'}</span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {currentUser?.vaiTro || 'ADMIN'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 font-medium">Trạng thái định danh</label>
                <div className="h-12 px-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 text-emerald-700 font-semibold text-sm flex items-center gap-2 select-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Đang hoạt động trên hệ thống</span>
                </div>
              </div>
            </div>

            {/* Nút Đổi mật khẩu tài khoản h-12 rounded-2xl */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenPasswordModal}
                className="w-full h-12 px-4 rounded-2xl bg-slate-50/70 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/90 flex items-center justify-between transition cursor-pointer shadow-2xs"
              >
                <span className="flex items-center gap-2.5 text-slate-800 text-xs font-semibold">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Đổi mật khẩu tài khoản
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
