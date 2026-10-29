import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ParkingSquare,
  History,
  BadgePercent,
  Car,
  Users,
  Shield,
  LogOut,
  UserCheck,
  Key,
  Cpu,
  ShieldAlert,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  overview,
  onRefresh,
  loading,
  currentUser,
  onLogout
}) {
  const perms = currentUser?.permissions || {};
  const isRole = currentUser?.vaiTro || 'ADMIN';

  // Danh sách các module chức năng - Chuẩn font, đơn dòng, trực quan
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Bảng điều khiển',
      icon: LayoutDashboard,
      visible: isRole !== 'KHACH_HANG' && (perms.canViewDashboard !== false || isRole === 'ADMIN')
    },
    {
      id: 'gate',
      label: 'Kiểm soát trạm cổng',
      icon: ArrowLeftRight,
      visible: isRole !== 'KHACH_HANG' && (perms.canAccessGate !== false || isRole === 'ADMIN' || isRole === 'BAO_VE')
    },
    {
      id: 'map',
      label: 'Sơ đồ vị trí ô đỗ',
      icon: ParkingSquare,
      visible: perms.canAccessMap !== false
    },
    {
      id: 'history',
      label: 'Lịch sử xe vào / ra',
      icon: History,
      visible: isRole !== 'KHACH_HANG' && perms.canAccessHistory !== false
    },
    {
      id: 'camera_ai',
      label: 'Trung tâm Camera AI',
      icon: Cpu,
      visible: isRole !== 'KHACH_HANG'
    },
    {
      id: 'pricing',
      label: 'Bảng giá dịch vụ',
      icon: BadgePercent,
      visible: isRole === 'ADMIN' || perms.canManagePricing === true
    },
    {
      id: 'users',
      label: 'Quản lý người dùng',
      icon: Users,
      visible: isRole === 'ADMIN' || isRole === 'QUAN_LY_DIEU_HANH' || perms.canManageUsers === true
    },
    {
      id: 'blacklist',
      label: 'Quản lý danh sách đen',
      icon: ShieldAlert,
      visible: isRole === 'ADMIN' || isRole === 'BAO_VE'
    },
    {
      id: 'customer',
      label: 'Cổng khách hàng & Cư dân',
      icon: Car,
      visible: isRole === 'KHACH_HANG' || isRole === 'ADMIN'
    }
  ];

  const visibleMenuItems = menuItems.filter((item) => item.visible);

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 shadow-xs select-none">
      {/* 1. Brand Header - Tối giản, thanh lịch, bỏ v4.8 PRO */}
      <div className="h-[72px] px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 shrink-0">
            <Car className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-extrabold text-[15px] tracking-tight text-slate-900 leading-none">
              DOXE AI
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Smart Parking System
            </p>
          </div>
        </div>

        {/* Nút thu gọn menu bên phải logo giống LOHA SALES */}
        <button
          type="button"
          title="Thu gọn menu"
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Menu Chức Năng - Căn chỉnh font chữ rõ ràng, thanh thoát, dễ nhìn nhất */}
      <nav className="p-3.5 space-y-1 flex-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'gate' && (activeTab === 'gate_in' || activeTab === 'gate_out'));

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] transition-all cursor-pointer group text-left relative ${
                isActive
                  ? 'bg-[#f0f3ff] text-indigo-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`}
            >
              {/* Vạch chỉ báo tím nổi bật bên trái khi active giống hệt mẫu LOHA SALES */}
              {isActive && (
                <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-indigo-600 rounded-r-full" />
              )}

              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive
                      ? 'text-indigo-600'
                      : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {/* Mũi tên > nhỏ màu tím bên phải mục đang chọn giống mẫu */}
              {isActive && (
                <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Bottom Widget: Tỷ lệ lấp đầy bãi xe tối giản, sạch sẽ */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Tỷ lệ lấp đầy:</span>
            <span className="text-slate-900 font-bold font-mono">
              {overview ? `${overview.tyLeLapDay}%` : '0%'}
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (overview?.tyLeLapDay || 0) > 85
                  ? 'bg-rose-500'
                  : (overview?.tyLeLapDay || 0) > 60
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${overview ? overview.tyLeLapDay : 0}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 pt-0.5 font-medium">
            <span>{overview ? `${overview.soXeDangDo} xe đang đỗ` : '0 xe'}</span>
            <span>{overview ? `${overview.soChoTrong} chỗ trống` : '0 chỗ'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
