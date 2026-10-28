import React, { useState } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  ParkingSquare,
  History,
  BadgePercent,
  Sparkles,
  Car,
  Activity,
  Users,
  Shield,
  LogOut,
  UserCheck,
  Key,
  Cpu,
  ShieldAlert,
  Compass,
  AlertTriangle,
  ChevronRight,
  ChevronDown
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
  const [expandedGate, setExpandedGate] = useState(true);

  // =========================================================================
  // ĐỊNH NGHĨA 4 NHÓM CHỨC NĂNG CHÍNH CHUẨN ĐẶC TẢ HỆ THỐNG
  // =========================================================================
  const FUNCTION_GROUPS = [
    {
      groupKey: 'CUSTOMER',
      groupTitle: '1. Chức Năng Khách Hàng',
      items: [
        {
          id: 'customer',
          label: 'Cổng Khách Hàng',
          subLabel: 'Xe, đặt chỗ, lịch sử, hỗ trợ',
          icon: Car,
          badge: 'Cư Dân',
          badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
          visible: isRole === 'KHACH_HANG' || isRole === 'ADMIN'
        }
      ]
    },
    {
      groupKey: 'SECURITY',
      groupTitle: '2. Nhân Viên Bảo Vệ',
      items: [
        {
          id: 'gate',
          label: 'Kiểm Soát Trạm Cổng',
          subLabel: 'Làn Vào / Ra & Mở barie',
          icon: ArrowLeftRight,
          badge: 'Trực Tiếp',
          badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
          visible: isRole !== 'KHACH_HANG' && (perms.canAccessGate !== false || isRole === 'ADMIN' || isRole === 'BAO_VE'),
          subItems: [
            {
              id: 'gate_in',
              label: 'Cổng Vào (Làn 01)',
              subLabel: 'Tiếp nhận xe & gán ô đỗ',
              icon: ArrowDownLeft,
              badge: 'Check-In',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
            },
            {
              id: 'gate_out',
              label: 'Cổng Ra (Làn 02)',
              subLabel: 'Thu phí & xuất bãi',
              icon: ArrowUpRight,
              badge: 'Check-Out',
              badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200'
            }
          ]
        },
        {
          id: 'history',
          label: 'Tra Cứu Xe Trong Bãi',
          subLabel: 'Lịch sử lượt đỗ & tìm nhanh',
          icon: History,
          badge: null,
          visible: isRole !== 'KHACH_HANG' && perms.canAccessHistory !== false
        }
      ]
    },
    {
      groupKey: 'CAMERA_AI',
      groupTitle: '3. Camera AI & ANPR',
      items: [
        {
          id: 'camera_ai',
          label: 'Trung Tâm Camera AI',
          subLabel: 'ANPR, gợi ý ô đỗ & dự báo 24h',
          icon: Cpu,
          badge: 'YOLOv8',
          badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
          visible: isRole !== 'KHACH_HANG'
        }
      ]
    },
    {
      groupKey: 'ADMIN',
      groupTitle: '4. Quản Trị Viên',
      items: [
        {
          id: 'dashboard',
          label: 'Báo Cáo & Cảnh Báo',
          subLabel: 'Doanh thu & cảnh báo bất thường',
          icon: LayoutDashboard,
          badge: null,
          visible: isRole !== 'KHACH_HANG' && (perms.canViewDashboard !== false || isRole === 'ADMIN')
        },
        {
          id: 'map',
          label: 'Khu Vực & Chỗ Đỗ',
          subLabel: 'Sơ đồ & bảo trì ô đỗ xe',
          icon: ParkingSquare,
          badge: overview ? `${overview.soChoTrong} trống` : null,
          badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          visible: perms.canAccessMap !== false
        },
        {
          id: 'pricing',
          label: 'Cấu Hình Bảng Giá',
          subLabel: 'Bảng giá theo giờ, ngày, đêm',
          icon: BadgePercent,
          badge: null,
          visible: isRole === 'ADMIN' || perms.canManagePricing === true
        },
        {
          id: 'users',
          label: 'Người Dùng & Phân Quyền',
          subLabel: 'Quản trị nhân sự hệ thống',
          icon: Users,
          badge: 'Admin',
          badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
          visible: isRole === 'ADMIN' || isRole === 'QUAN_LY_DIEU_HANH' || perms.canManageUsers === true
        },
        {
          id: 'blacklist',
          label: 'Quản Lý Danh Sách Đen',
          subLabel: 'Cảnh báo xe nợ cước / vi phạm',
          icon: ShieldAlert,
          badge: 'Bảo mật',
          badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
          visible: isRole === 'ADMIN' || isRole === 'BAO_VE'
        }
      ]
    }
  ];

  const getRoleInfo = (role) => {
    switch (role) {
      case 'ADMIN':
        return {
          title: 'Quản trị viên',
          bg: 'from-blue-600 to-indigo-600',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Shield
        };
      case 'BAO_VE':
        return {
          title: 'Nhân viên Cổng',
          bg: 'from-emerald-600 to-teal-600',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: UserCheck
        };
      case 'KHACH_HANG':
        return {
          title: 'Khách Hàng / Cư Dân',
          bg: 'from-purple-600 to-indigo-600',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Car
        };
      default:
        return {
          title: role || 'Thành viên',
          bg: 'from-slate-700 to-slate-600',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Shield
        };
    }
  };

  const roleInfo = getRoleInfo(currentUser?.vaiTro);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 backdrop-blur-xl z-30 shadow-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 text-white shrink-0">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-tight text-slate-900">DoXeAI</h1>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> v4.8 PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Smart AI Parking System</p>
          </div>
        </div>
      </div>

      {/* Navigation Links Grouped into 4 Main Functions */}
      <nav className="p-3 space-y-4 flex-1 overflow-y-auto text-xs">
        {FUNCTION_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.groupKey} className="space-y-1">
              {/* Group Title Header */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>{group.groupTitle}</span>
              </div>

              {/* Group Items */}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isExactActive = activeTab === item.id;
                const isChildActive = item.subItems && item.subItems.some((sub) => sub.id === activeTab);

                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => {
                        if (item.subItems) {
                          if (activeTab === 'gate_in' || activeTab === 'gate_out') {
                            setExpandedGate(!expandedGate);
                          } else {
                            setExpandedGate(true);
                            setActiveTab('gate_in');
                          }
                        } else {
                          setActiveTab(item.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer text-left ${
                        isExactActive || isChildActive
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200/90 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isExactActive
                              ? 'text-white'
                              : isChildActive
                              ? 'text-indigo-600'
                              : 'text-slate-500 group-hover:text-indigo-600'
                          }`}
                        />
                        <div className="truncate">
                          <div className="truncate font-bold leading-tight">{item.label}</div>
                          {item.subLabel && (
                            <div
                              className={`text-[10px] truncate font-normal ${
                                isExactActive
                                  ? 'text-indigo-100'
                                  : isChildActive
                                  ? 'text-indigo-600 font-medium'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.subLabel}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono font-medium ${
                              isExactActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.subItems && (
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              expandedGate ? 'rotate-0' : '-rotate-90'
                            } ${isExactActive ? 'text-white' : 'text-slate-400'}`}
                          />
                        )}
                      </div>
                    </button>

                    {/* Submenu Dropdown chỉ ra xuống dưới 2 phần */}
                    {item.subItems && expandedGate && (
                      <div className="ml-3 pl-3 border-l-2 border-indigo-200 space-y-1 py-0.5 animate-fadeIn">
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = activeTab === sub.id;

                          return (
                            <button
                              key={sub.id}
                              onClick={() => setActiveTab(sub.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer text-left ${
                                isSubActive
                                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <SubIcon
                                  className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${
                                    isSubActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                                  }`}
                                />
                                <div className="truncate">
                                  <div className="truncate font-bold leading-tight text-[11px]">{sub.label}</div>
                                  {sub.subLabel && (
                                    <div
                                      className={`text-[9px] truncate font-normal ${
                                        isSubActive ? 'text-indigo-100' : 'text-slate-400'
                                      }`}
                                    >
                                      {sub.subLabel}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {sub.badge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-full border font-mono font-medium shrink-0 ml-1 ${
                                    isSubActive ? 'bg-white/20 text-white border-white/30' : sub.badgeColor
                                  }`}
                                >
                                  {sub.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section: Occupancy Widget */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
        {/* Mini Occupancy Meter */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Tỷ lệ lấp đầy bãi:</span>
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
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${overview ? overview.tyLeLapDay : 0}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
            <span>{overview ? `${overview.soXeDangDo} xe đang đỗ` : '0 xe'}</span>
            <span>{overview ? `${overview.soChoTrong} chỗ trống` : '0 chỗ'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
