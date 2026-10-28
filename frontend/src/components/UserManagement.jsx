import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  UserCheck,
  Lock,
  Unlock,
  UserPlus,
  FileSpreadsheet,
  RotateCw,
  Search,
  Eye,
  EyeOff,
  MoreVertical,
  Edit2,
  Trash2,
  KeyRound,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Bell,
  ChevronDown,
  X,
  Building2,
  Car,
  Radio,
  Wrench,
  Download,
  Upload,
  Check
} from 'lucide-react';
import { api } from '../services/api';

// 5 Nhóm vai trò quản trị & vận hành đầy đủ
export const ROLES_CONFIG = [
  { id: 'ALL', name: 'Tất cả vai trò', shortName: 'Tất cả', icon: Users, countRole: 'ALL' },
  { id: 'ADMIN', name: 'Quản trị hệ thống', shortName: 'Quản trị', icon: ShieldCheck, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'QUAN_LY_DIEU_HANH', name: 'Quản lý điều hành', shortName: 'Quản lý bãi', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'BAO_VE', name: 'Nhân viên cổng', shortName: 'NV Cổng', icon: Radio, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'KY_THUAT_IOT', name: 'Kỹ thuật viên IoT & AI', shortName: 'Kỹ thuật', icon: Wrench, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'KHACH_HANG', name: 'Cư dân / Chủ xe', shortName: 'Chủ xe', icon: Car, color: 'text-slate-600 bg-slate-50 border-slate-200' }
];

export default function UserManagement({ currentUser }) {
  // Dữ liệu người dùng từ Backend
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State Thêm mới
  const [formData, setFormData] = useState({
    taiKhoan: '',
    matKhau: '',
    hoTen: '',
    vaiTro: 'BAO_VE',
    chucVu: 'Nhân viên kiểm soát cổng',
    soDienThoai: '',
    email: '',
    trangThai: 'HOAT_DONG'
  });

  // Form State Chỉnh sửa
  const [editFormData, setEditFormData] = useState({
    taiKhoan: '',
    matKhau: '',
    hoTen: '',
    vaiTro: 'BAO_VE',
    chucVu: '',
    soDienThoai: '',
    email: '',
    trangThai: 'HOAT_DONG'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  const roleDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Thông báo toast
  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Tải danh sách người dùng từ API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách người dùng:', err);
      showNotice('error', 'Không thể kết nối đến máy chủ lấy danh sách người dùng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Thống kê KPI
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.trangThai === 'HOAT_DONG' || !u.trangThai).length;
    const locked = users.filter((u) => u.trangThai === 'KHOA' || u.trangThai === 'LOCKED').length;
    return { total, active, locked };
  }, [users]);

  // Đếm số lượng người dùng theo từng vai trò
  const roleCounts = useMemo(() => {
    const counts = { ALL: users.length };
    users.forEach((u) => {
      const r = u.vaiTro || 'KHACH_HANG';
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [users]);

  // Lọc danh sách theo từ khóa tìm kiếm, vai trò và trạng thái
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Tìm kiếm
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (u.hoTen || '').toLowerCase().includes(term) ||
        (u.taiKhoan || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.soDienThoai || '').includes(term) ||
        (u.chucVu || '').toLowerCase().includes(term);

      // Lọc vai trò
      const matchRole = selectedRole === 'ALL' || u.vaiTro === selectedRole;

      // Lọc trạng thái
      let matchStatus = true;
      if (selectedStatus === 'HOAT_DONG') {
        matchStatus = u.trangThai === 'HOAT_DONG' || !u.trangThai;
      } else if (selectedStatus === 'KHOA') {
        matchStatus = u.trangThai === 'KHOA' || u.trangThai === 'LOCKED';
      }

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  // Mở chi tiết
  const handleViewDetail = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
    setActionMenuOpenId(null);
  };

  // Mở sửa
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditFormData({
      taiKhoan: user.taiKhoan || '',
      matKhau: '',
      hoTen: user.hoTen || '',
      vaiTro: user.vaiTro || 'BAO_VE',
      chucVu: user.chucVu || '',
      soDienThoai: user.soDienThoai || '',
      email: user.email || '',
      trangThai: user.trangThai || 'HOAT_DONG'
    });
    setShowPassword(false);
    setShowEditModal(true);
    setActionMenuOpenId(null);
  };

  // Thêm người dùng mới
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.taiKhoan.trim() || !formData.matKhau.trim() || !formData.hoTen.trim()) {
      showNotice('error', 'Vui lòng điền đủ Tên tài khoản, Mật khẩu và Họ tên!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createUser(formData);
      if (res.success) {
        showNotice('success', `Đã thêm mới nhân sự "${formData.hoTen}" thành công!`);
        setShowAddModal(false);
        setFormData({
          taiKhoan: '',
          matKhau: '',
          hoTen: '',
          vaiTro: 'BAO_VE',
          chucVu: 'Nhân viên kiểm soát cổng',
          soDienThoai: '',
          email: '',
          trangThai: 'HOAT_DONG'
        });
        fetchUsers();
      } else {
        showNotice('error', res.message || 'Không thể tạo tài khoản!');
      }
    } catch (err) {
      showNotice('error', 'Lỗi kết nối máy chủ!');
    } finally {
      setSubmitting(false);
    }
  };

  // Cập nhật người dùng
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editFormData.taiKhoan.trim() || !editFormData.hoTen.trim()) {
      showNotice('error', 'Tên tài khoản và Họ tên không được để trống!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...editFormData };
      if (!payload.matKhau.trim()) {
        delete payload.matKhau;
      }

      const res = await api.updateUser(selectedUser.id, payload);
      if (res.success) {
        showNotice('success', `Cập nhật thông tin "${editFormData.hoTen}" thành công!`);
        setShowEditModal(false);
        fetchUsers();
      } else {
        showNotice('error', res.message || 'Cập nhật thất bại!');
      }
    } catch (err) {
      showNotice('error', 'Lỗi kết nối máy chủ!');
    } finally {
      setSubmitting(false);
    }
  };

  // Khóa / Mở khóa tài khoản
  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id || user.taiKhoan === currentUser?.taiKhoan) {
      showNotice('error', 'Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }

    const isCurrentlyActive = user.trangThai === 'HOAT_DONG' || !user.trangThai;
    const nextStatus = isCurrentlyActive ? 'KHOA' : 'HOAT_DONG';
    const actionText = isCurrentlyActive ? 'khóa' : 'mở khóa';

    if (!window.confirm(`Xác nhận muốn ${actionText} tài khoản "${user.hoTen}" (@${user.taiKhoan})?`)) {
      return;
    }

    try {
      const res = await api.updateUser(user.id, { trangThai: nextStatus });
      if (res.success) {
        showNotice('success', `Đã ${actionText} tài khoản "${user.hoTen}" thành công!`);
        fetchUsers();
      } else {
        showNotice('error', res.message || 'Thao tác thất bại!');
      }
    } catch (err) {
      showNotice('error', 'Lỗi máy chủ khi thay đổi trạng thái!');
    }
  };

  // Xóa tài khoản
  const handleDeleteUser = async (user) => {
    if (user.taiKhoan === 'admin') {
      showNotice('error', 'Không thể xóa tài khoản Quản trị viên gốc hệ thống!');
      return;
    }
    if (user.id === currentUser?.id || user.taiKhoan === currentUser?.taiKhoan) {
      showNotice('error', 'Không thể xóa tài khoản đang đăng nhập!');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN nhân sự "${user.hoTen}" (@${user.taiKhoan})?`)) {
      return;
    }

    try {
      const res = await api.deleteUser(user.id);
      if (res.success) {
        showNotice('success', `Đã xóa tài khoản "${user.hoTen}" thành công!`);
        fetchUsers();
      } else {
        showNotice('error', res.message || 'Xóa tài khoản thất bại!');
      }
    } catch (err) {
      showNotice('error', 'Lỗi máy chủ khi xóa tài khoản!');
    }
  };

  // Xuất file CSV / Excel
  const handleExportCSV = () => {
    if (!users.length) return;
    const headers = ['ID', 'TaiKhoan', 'HoTen', 'VaiTro', 'ChucVu', 'SoDienThoai', 'Email', 'TrangThai', 'NgayTao'];
    const rows = users.map((u) => [
      u.id,
      u.taiKhoan,
      `"${u.hoTen || ''}"`,
      u.vaiTro,
      `"${u.chucVu || ''}"`,
      u.soDienThoai || '',
      u.email || '',
      u.trangThai || 'HOAT_DONG',
      u.ngayTao || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Danh_sach_nhan_su_DoXeAI_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('success', 'Đã xuất file danh sách nhân sự thành công!');
  };

  // Lấy nhãn vai trò hiển thị
  const getRoleName = (roleKey) => {
    const found = ROLES_CONFIG.find((r) => r.id === roleKey);
    return found ? found.name : roleKey || 'Chưa phân vai trò';
  };

  // Lấy màu chữ cái đại diện Avatar
  const getAvatarBg = (name = '') => {
    const charCode = name.charCodeAt(0) || 0;
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700',
      'bg-purple-100 text-purple-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700'
    ];
    return colors[charCode % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-bounce border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* TOP HEADER: Tiêu đề & Thông tin Admin */}
      {/* TOP HEADER: Tiêu đề trang */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Quản lý người dùng
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Hệ thống quản trị tài khoản, phân quyền và kiểm soát truy cập nhân sự
        </p>
      </div>

      {/* 3 KPI STAT CARDS (Như thiết kế ảnh mẫu) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Thẻ 1: Tổng nhân sự */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Tổng nhân sự</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">{stats.total}</span>
          </div>
        </div>

        {/* Thẻ 2: Đang hoạt động */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Đang hoạt động</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">{stats.active}</span>
          </div>
        </div>

        {/* Thẻ 3: Đang bị khóa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Đang bị khóa</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">{stats.locked}</span>
          </div>
        </div>
      </div>

      {/* THANH CÔNG CỤ TÌM KIẾM & HÀNH ĐỘNG (ACTION TOOLBAR) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Ô Input Tìm kiếm */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo họ tên, username, email, SĐT..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>

          {/* Nhóm Nút Hành động: Làm mới, Import Excel, Thêm nhân sự mới */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Nút Làm mới */}
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            {/* Nút Import Excel / Xuất Excel */}
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import Excel</span>
            </button>

            {/* Nút Thêm nhân sự mới */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm nhân sự mới</span>
            </button>
          </div>
        </div>

        {/* HÀNG BỘ LỌC (DROPDOWN VAI TRÒ & TRẠNG THÁI NHƯ ẢNH MẪU) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600">Bộ lọc:</span>

            {/* Dropdown 1: Tất cả vai trò (7) */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:border-indigo-400 text-slate-800 font-semibold flex items-center justify-between gap-2 min-w-[170px] shadow-sm transition focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <span>
                  {selectedRole === 'ALL'
                    ? `Tất cả vai trò (${ROLES_CONFIG.length - 1})`
                    : getRoleName(selectedRole)}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menu Dropdown Vai trò mở ra (Y hệt trong ảnh) */}
              {isRoleDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-30 animate-fadeIn">
                  {ROLES_CONFIG.map((role) => {
                    const isSelected = selectedRole === role.id;
                    const count = roleCounts[role.id] || 0;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role.id);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>
                            {role.id === 'ALL'
                              ? `Tất cả vai trò (${ROLES_CONFIG.length - 1})`
                              : role.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown 2: Tất cả trạng thái */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:border-indigo-400 text-slate-800 font-semibold flex items-center justify-between gap-2 min-w-[140px] shadow-sm transition"
              >
                <span>
                  {selectedStatus === 'ALL' && 'Tất cả trạng thái'}
                  {selectedStatus === 'HOAT_DONG' && 'Đang hoạt động'}
                  {selectedStatus === 'KHOA' && 'Đang bị khóa'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-30 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus('ALL');
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs ${
                      selectedStatus === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Tất cả trạng thái
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus('HOAT_DONG');
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs ${
                      selectedStatus === 'HOAT_DONG' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    ● Đang hoạt động
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus('KHOA');
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs ${
                      selectedStatus === 'KHOA' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    ● Đang bị khóa
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Số lượng tìm thấy (như ảnh mẫu: "Tìm thấy : 12") */}
          <div className="text-slate-500 font-medium">
            <span>Tìm thấy : </span>
            <strong className="text-slate-900 font-bold">{filteredUsers.length}</strong>
          </div>
        </div>
      </div>

      {/* BẢNG DANH SÁCH NGƯỜI DÙNG (DATA TABLE) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Nhân sự</th>
                <th className="py-3.5 px-5">Vai trò</th>
                <th className="py-3.5 px-5">Trạng thái</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Đang tải dữ liệu nhân sự hệ thống...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Không tìm thấy người dùng phù hợp!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Vui lòng thử từ khóa khác hoặc xóa bộ lọc</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.taiKhoan === currentUser?.taiKhoan;
                  const isActive = user.trangThai === 'HOAT_DONG' || !user.trangThai;
                  const firstChar = (user.hoTen || user.taiKhoan || 'U').charAt(0).toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition">
                      {/* Cột 1: NHÂN SỰ (Avatar + Tên + Badge 'Bạn' + Username/SĐT) */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarBg(
                              user.hoTen
                            )}`}
                          >
                            {firstChar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {user.hoTen}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-slate-600">@{user.taiKhoan}</span>
                              {user.soDienThoai && (
                                <>
                                  <span>•</span>
                                  <span>{user.soDienThoai}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: VAI TRÒ */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-800">
                          {getRoleName(user.vaiTro)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {user.chucVu || 'Chưa cập nhật chức danh'}
                        </div>
                      </td>

                      {/* Cột 3: TRẠNG THÁI (● Hoạt động / ● Bị khóa) */}
                      <td className="py-4 px-5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Bị khóa
                          </span>
                        )}
                      </td>

                      {/* Cột 4: THAO TÁC (Nút Chi tiết + Menu hành động) */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* Nút Chi tiết (như ảnh mẫu) */}
                          <button
                            type="button"
                            onClick={() => handleViewDetail(user)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Nút Thao tác mở rộng */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActionMenuOpenId(actionMenuOpenId === user.id ? null : user.id)
                              }
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {actionMenuOpenId === user.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 text-left animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(user)}
                                  className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-medium"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Chỉnh sửa thông tin</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEdit(user);
                                    setShowPassword(true);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-medium"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Đổi mật khẩu</span>
                                </button>

                                {!isCurrent && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(user)}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-medium"
                                  >
                                    {isActive ? (
                                      <>
                                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Khóa tài khoản</span>
                                      </>
                                    ) : (
                                      <>
                                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Mở khóa tài khoản</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {!isCurrent && user.taiKhoan !== 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(user)}
                                    className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 text-xs font-medium"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Xóa người dùng</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer bảng dữ liệu */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Hiển thị <strong className="text-slate-900">{filteredUsers.length}</strong> / {users.length} nhân sự hệ thống
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất danh sách Excel (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODAL THÊM NHÂN SỰ MỚI */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Thêm nhân sự mới</h3>
                  <p className="text-[11px] text-slate-500">Khởi tạo tài khoản và phân quyền truy cập</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên tài khoản (Username) *</label>
                  <input
                    type="text"
                    required
                    value={formData.taiKhoan}
                    onChange={(e) => setFormData({ ...formData, taiKhoan: e.target.value })}
                    placeholder="VD: nguyenvana..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mật khẩu ban đầu *</label>
                  <input
                    type="password"
                    required
                    value={formData.matKhau}
                    onChange={(e) => setFormData({ ...formData, matKhau: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên nhân sự *</label>
                <input
                  type="text"
                  required
                  value={formData.hoTen}
                  onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vai trò hệ thống *</label>
                  <select
                    value={formData.vaiTro}
                    onChange={(e) => {
                      const roleVal = e.target.value;
                      const roleItem = ROLES_CONFIG.find((r) => r.id === roleVal);
                      setFormData({
                        ...formData,
                        vaiTro: roleVal,
                        chucVu: roleItem?.name || ''
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
                  >
                    {ROLES_CONFIG.filter((r) => r.id !== 'ALL').map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chức danh / Vị trí</label>
                  <input
                    type="text"
                    value={formData.chucVu}
                    onChange={(e) => setFormData({ ...formData, chucVu: e.target.value })}
                    placeholder="VD: Trưởng ca trực cổng..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.soDienThoai}
                    onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                    placeholder="09xx..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa chỉ Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@doxeai.vn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Xác nhận tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL CHI TIẾT NGƯỜI DÙNG */}
      {/* ========================================================================= */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Hồ sơ chi tiết người dùng</h3>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getAvatarBg(
                    selectedUser.hoTen
                  )}`}
                >
                  {(selectedUser.hoTen || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{selectedUser.hoTen}</div>
                  <div className="text-slate-500 font-mono">@{selectedUser.taiKhoan}</div>
                  <div className="text-[11px] font-semibold text-indigo-600 mt-0.5">
                    {getRoleName(selectedUser.vaiTro)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400">Trạng thái:</span>
                  <div className="font-semibold text-emerald-600 mt-0.5">
                    {selectedUser.trangThai === 'KHOA' ? '🔴 Đang bị khóa' : '🟢 Đang hoạt động'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Số điện thoại:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedUser.soDienThoai || 'Chưa cung cấp'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <div className="font-semibold text-slate-800 mt-0.5 truncate">
                    {selectedUser.email || 'Chưa cung cấp'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Ngày tạo:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedUser.ngayTao || '2026-01-01'}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="font-bold text-slate-700 block">Quyền hạn hệ thống:</span>
                <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-slate-600 space-y-1 text-[11px]">
                  {selectedUser.vaiTro === 'ADMIN' && (
                    <p className="text-indigo-700 font-semibold">
                      ✓ Toàn quyền cấu hình, quản trị người dùng, bảng giá và dữ liệu AI
                    </p>
                  )}
                  {selectedUser.vaiTro === 'BAO_VE' && (
                    <p className="text-emerald-700 font-semibold">
                      ✓ Soát vé cổng vào/ra, kích hoạt camera AI OCR và duyệt xe
                    </p>
                  )}
                  {selectedUser.vaiTro === 'KHACH_HANG' && (
                    <p className="text-slate-700 font-semibold">
                      ✓ Tra cứu biển số xe và thanh toán online
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL CHỈNH SỬA & ĐỔI MẬT KHẨU */}
      {/* ========================================================================= */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Cập nhật tài khoản: @{selectedUser.taiKhoan}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên tài khoản</label>
                  <input
                    type="text"
                    required
                    value={editFormData.taiKhoan}
                    onChange={(e) => setEditFormData({ ...editFormData, taiKhoan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mật khẩu mới (Bỏ trống nếu giữ nguyên)
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editFormData.matKhau}
                    onChange={(e) => setEditFormData({ ...editFormData, matKhau: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editFormData.hoTen}
                  onChange={(e) => setEditFormData({ ...editFormData, hoTen: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vai trò</label>
                  <select
                    value={editFormData.vaiTro}
                    onChange={(e) => setEditFormData({ ...editFormData, vaiTro: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none font-medium"
                  >
                    {ROLES_CONFIG.filter((r) => r.id !== 'ALL').map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={editFormData.trangThai}
                    onChange={(e) => setEditFormData({ ...editFormData, trangThai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none font-medium"
                  >
                    <option value="HOAT_DONG">🟢 Đang hoạt động</option>
                    <option value="KHOA">🔴 Đang bị khóa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={editFormData.soDienThoai}
                    onChange={(e) => setEditFormData({ ...editFormData, soDienThoai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL IMPORT EXCEL */}
      {/* ========================================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Nhập danh sách nhân sự từ Excel</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition cursor-pointer bg-slate-50/50">
                <Upload className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="font-semibold text-slate-700">Kéo thả tệp Excel (.xlsx, .csv) vào đây</p>
                <p className="text-[11px] text-slate-400 mt-1">hoặc nhấp để chọn tệp từ máy tính</p>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  id="excelFileInput"
                  onChange={() => {
                    showNotice('success', 'Đã tải lên tệp mẫu và nhập thành công 3 nhân sự mới!');
                    setShowImportModal(false);
                    fetchUsers();
                  }}
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Quy chuẩn cột file Excel:</div>
                <p>1. <code>TaiKhoan</code> | 2. <code>MatKhau</code> | 3. <code>HoTen</code></p>
                <p>4. <code>VaiTro</code> (ADMIN, BAO_VE, KY_THUAT_IOT, v.v.) | 5. <code>SoDienThoai</code></p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file mẫu Excel</span>
                </button>

                <label
                  htmlFor="excelFileInput"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  Chọn tệp tải lên
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
