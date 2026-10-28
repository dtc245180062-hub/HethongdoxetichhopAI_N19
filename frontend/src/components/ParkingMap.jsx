import React, { useState } from 'react';
import {
  Car,
  Bike,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Wrench,
  ShieldAlert,
  Calendar,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';

export default function ParkingMap({
  slots = [],
  zones = [],
  loading = false,
  onRefresh,
  onQuickAction,
  currentUser
}) {
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSlotDetail, setSelectedSlotDetail] = useState(null);

  // Lọc theo phân khu và trạng thái
  const filteredSlots = slots.filter((slot) => {
    const matchZone = selectedZone === 'ALL' || slot.maKhuVuc === selectedZone;
    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'TRONG' && (slot.trangThai === 'Trống' || slot.trangThaiCode === 'TRONG')) ||
      (selectedStatus === 'DA_DO' && (slot.trangThai === 'Đã đỗ' || slot.trangThaiCode === 'DA_DO')) ||
      (selectedStatus === 'DANG_BAO_TRI' && (slot.trangThai === 'Bảo trì' || slot.trangThaiCode === 'DANG_BAO_TRI'));

    return matchZone && matchStatus;
  });

  const totalTrong = slots.filter(s => s.trangThai === 'Trống' || s.trangThaiCode === 'TRONG').length;
  const totalDaDo = slots.filter(s => s.trangThai === 'Đã đỗ' || s.trangThaiCode === 'DA_DO').length;
  const totalBaoTri = slots.filter(s => s.trangThai === 'Bảo trì' || s.trangThaiCode === 'DANG_BAO_TRI').length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Summary */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Sơ Đồ Vị Trí Bãi Đỗ Xe Thời Gian Thực
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Trực quan hóa trạng thái từng ô đỗ xe: Màu Xanh (Trống), Màu Đỏ (Xe đang đỗ)
          </p>
        </div>

        {/* Legend Summary Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-200 text-emerald-600 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>{totalTrong} Trống</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            <span>{totalDaDo} Đã Đỗ</span>
          </div>

          {totalBaoTri > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              <span>{totalBaoTri} Bảo Trì</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all border border-slate-300 disabled:opacity-50"
            title="Làm mới trạng thái sơ đồ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Zone Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-600 font-semibold mr-1">Phân khu:</span>
          <button
            onClick={() => setSelectedZone('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedZone === 'ALL'
                ? 'bg-blue-600 text-slate-900 shadow-md shadow-blue-600/30'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tất cả ({slots.length})
          </button>
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => setSelectedZone(z.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedZone === z.id
                  ? 'bg-blue-600 text-slate-900 shadow-md shadow-blue-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {z.tenKhuVuc ? z.tenKhuVuc.split(' - ')[0] : z.id} ({z.soChoTrong}/{z.soChoHienCo})
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-600 font-semibold mr-1">Trạng thái:</span>
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedStatus === 'ALL'
                ? 'bg-slate-200 text-slate-900'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setSelectedStatus('TRONG')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedStatus === 'TRONG'
                ? 'bg-emerald-600 text-slate-900'
                : 'text-emerald-600 hover:bg-emerald-50/40'
            }`}
          >
            🟢 Trống
          </button>
          <button
            onClick={() => setSelectedStatus('DA_DO')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedStatus === 'DA_DO'
                ? 'bg-rose-600 text-slate-900'
                : 'text-rose-600 hover:bg-rose-50/40'
            }`}
          >
            🔴 Đã đỗ
          </button>
        </div>
      </div>

      {/* Grid Card Layout (Màu Xanh: Trống, Màu Đỏ: Xe đang đỗ + biển số xe) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {filteredSlots.map((slot) => {
          const isOccupied = slot.trangThai === 'Đã đỗ' || slot.trangThaiCode === 'DA_DO';
          const isMaintenance = slot.trangThai === 'Bảo trì' || slot.trangThaiCode === 'DANG_BAO_TRI';
          const isAvailable = !isOccupied && !isMaintenance;

          return (
            <div
              key={slot.id}
              onClick={() => setSelectedSlotDetail(slot)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px] transform hover:-translate-y-1 hover:shadow-lg group ${
                isOccupied
                  ? 'bg-gradient-to-b from-rose-50 to-white border-rose-200 hover:border-rose-400 shadow-sm'
                  : isMaintenance
                  ? 'bg-gradient-to-b from-amber-50 to-white border-amber-200 opacity-75 shadow-sm'
                  : 'bg-gradient-to-b from-emerald-50 to-white border-emerald-200 hover:border-emerald-400 shadow-sm'
              }`}
            >
              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-slate-900 font-mono">{slot.id}</span>
                  <span className="text-[10px] text-slate-600">({slot.maKhuVuc})</span>
                </div>

                <div className={`p-1.5 rounded-lg ${
                  isOccupied
                    ? 'bg-rose-500/20 text-rose-600'
                    : isMaintenance
                    ? 'bg-amber-500/20 text-amber-600'
                    : 'bg-emerald-500/20 text-emerald-600'
                }`}>
                  {slot.loaiXe === 'OTO' || slot.loaiXe === 'O to' ? (
                    <Car className="w-4 h-4" />
                  ) : slot.loaiXe === 'XE_MAY' || slot.loaiXe === 'Xe may' ? (
                    <Bike className="w-4 h-4" />
                  ) : (
                    <Truck className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Center & Bottom Information */}
              {isOccupied ? (
                <div className="mt-3 space-y-1.5">
                  <div className="font-mono font-black text-xs px-2 py-1 rounded bg-slate-50 text-rose-700 border border-rose-500/50 shadow-inner text-center tracking-wider truncate">
                    {slot.bienSoXe || '30H-892.45'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-600" />
                      {slot.thoiGianVao ? new Date(slot.thoiGianVao).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                    <span className="text-rose-600 font-bold">Đã đỗ</span>
                  </div>
                </div>
              ) : isMaintenance ? (
                <div className="mt-3 text-center py-2">
                  <span className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Bảo Trì
                  </span>
                </div>
              ) : (
                <div className="mt-3 space-y-1.5">
                  <div className="font-sans font-bold text-xs px-2 py-1 rounded bg-emerald-50/60 text-emerald-700 border border-emerald-200 text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Trống
                  </div>
                  <div className="text-[10px] text-emerald-600/80 text-center font-medium">
                    Sẵn sàng tiếp nhận
                  </div>
                </div>
              )}

              {/* Status Indicator Bar at Bottom */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                isOccupied ? 'bg-rose-500' : isMaintenance ? 'bg-amber-500' : 'bg-emerald-500'
              }`}></div>
            </div>
          );
        })}
      </div>

      {/* Modal / Drawer for Slot Details */}
      {selectedSlotDetail && (
        <div className="fixed inset-0 bg-slate-50/40 border-white/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl space-y-5 border border-slate-300 shadow-xl relative">
            <button
              onClick={() => setSelectedSlotDetail(null)}
              className="absolute top-4 right-4 text-slate-600 hover:text-slate-900 p-1 rounded-lg bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className={`p-2.5 rounded-xl ${
                selectedSlotDetail.trangThai === 'Đã đỗ' || selectedSlotDetail.trangThaiCode === 'DA_DO'
                  ? 'bg-rose-500/20 text-rose-600'
                  : 'bg-emerald-500/20 text-emerald-600'
              }`}>
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {selectedSlotDetail.tenViTri || selectedSlotDetail.id}
                </h3>
                <p className="text-xs text-slate-600">Phân khu: {selectedSlotDetail.maKhuVuc}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Trạng thái:</span>
                <span className={`font-bold ${
                  selectedSlotDetail.trangThai === 'Đã đỗ' || selectedSlotDetail.trangThaiCode === 'DA_DO'
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}>
                  {selectedSlotDetail.trangThai || 'Trống'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Loại phương tiện:</span>
                <span className="font-semibold text-slate-900">
                  {selectedSlotDetail.loaiXe === 'OTO' ? 'Xe ô tô' : 'Xe máy'}
                </span>
              </div>

              {selectedSlotDetail.bienSoXe && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Biển số đang đỗ:</span>
                    <span className="font-mono font-bold text-rose-700 text-sm">
                      {selectedSlotDetail.bienSoXe}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Thời gian vào:</span>
                    <span className="text-slate-800">
                      {selectedSlotDetail.thoiGianVao ? new Date(selectedSlotDetail.thoiGianVao).toLocaleString('vi-VN') : '--'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Quick Actions */}
            <div className="pt-2 space-y-2">
              {currentUser?.vaiTro === 'KHACH_HANG' ? (
                /* PHÂN QUYỀN: Giao diện dành riêng cho Khách Hàng / Cư Dân */
                <>
                  {selectedSlotDetail.trangThai === 'Trống' || selectedSlotDetail.trangThaiCode === 'TRONG' ? (
                    <button
                      onClick={() => {
                        if (onQuickAction) onQuickAction('book_slot', selectedSlotDetail);
                        setSelectedSlotDetail(null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" /> Đặt Giữ Chỗ Vị Trí Này
                    </button>
                  ) : selectedSlotDetail.bienSoXe && currentUser?.bienSoXe && selectedSlotDetail.bienSoXe.toUpperCase().replace(/[-. ]/g, '') === currentUser.bienSoXe.toUpperCase().replace(/[-. ]/g, '') ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs text-center font-medium">
                        ✨ Xe của bạn đang đỗ tại ô này ({selectedSlotDetail.bienSoXe}).
                      </div>
                      <button
                        onClick={() => {
                          if (onQuickAction) onQuickAction('view_my_car');
                          setSelectedSlotDetail(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <Car className="w-4 h-4" /> Xem Trạng Thái Tại Cổng Cư Dân
                      </button>
                    </div>
                  ) : selectedSlotDetail.trangThai === 'Bảo trì' || selectedSlotDetail.trangThaiCode === 'DANG_BAO_TRI' ? (
                    <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-500/30 text-amber-700 text-xs text-center font-medium">
                      ⚠️ Ô đỗ đang bảo trì kỹ thuật, tạm ngưng tiếp nhận phương tiện.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs text-center font-medium">
                      🔒 Vị trí hiện đang có phương tiện khác đỗ.
                    </div>
                  )}
                </>
              ) : (
                /* Giao diện dành cho Quản Trị Viên & Nhân Viên Bảo Vệ Trực Cổng */
                <>
                  {selectedSlotDetail.bienSoXe ? (
                    <button
                      onClick={() => {
                        if (onQuickAction) onQuickAction('checkout', selectedSlotDetail.bienSoXe);
                        setSelectedSlotDetail(null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" /> Thanh Toán & Cho Xe Ra (Cổng Ra)
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (onQuickAction) onQuickAction('checkin', selectedSlotDetail.id);
                          setSelectedSlotDetail(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <ArrowDownLeft className="w-4 h-4" /> Đặt Xe Vào Vị Trí Này (Cổng Vào)
                      </button>

                      {/* Toggle Maintenance Button (Chỉ Admin & Bảo vệ) */}
                      <button
                        onClick={async () => {
                          const isCurrentlyMaint = selectedSlotDetail.trangThai === 'Bảo trì' || selectedSlotDetail.trangThaiCode === 'DANG_BAO_TRI';
                          const newStatusCode = isCurrentlyMaint ? 'TRONG' : 'DANG_BAO_TRI';
                          try {
                            await api.updateViTriStatus(selectedSlotDetail.id, { trangThaiCode: newStatusCode });
                            if (onRefresh) onRefresh();
                            setSelectedSlotDetail(null);
                          } catch (err) {
                            alert('Lỗi cập nhật trạng thái ô đỗ!');
                          }
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          selectedSlotDetail.trangThai === 'Bảo trì' || selectedSlotDetail.trangThaiCode === 'DANG_BAO_TRI'
                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-700 hover:bg-emerald-900/60'
                            : 'bg-amber-50/60 border-amber-500/40 text-amber-700 hover:bg-amber-900/60'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>
                          {selectedSlotDetail.trangThai === 'Bảo trì' || selectedSlotDetail.trangThaiCode === 'DANG_BAO_TRI'
                            ? 'Mở Lại Ô Đỗ (Sẵn Sàng Tiếp Nhận)'
                            : 'Chuyển Sang Trạng Thái Bảo Trì'}
                        </span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
