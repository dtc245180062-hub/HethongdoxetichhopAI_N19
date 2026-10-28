import React from 'react';
import {
  Car,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  FileWarning,
  AlertCircle,
  Wrench
} from 'lucide-react';

export default function Dashboard({ overview, onNavigate, onRefresh }) {
  const data = overview || {
    tongSoCho: 16,
    soXeDangDo: 6,
    soChoTrong: 9,
    soChoBaoTri: 1,
    tyLeLapDay: 38,
    doanhThuNgay: 45000,
    soKhuVuc: 4,
    khuVucSummary: [],
    luotVaoRaGanNhat: []
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50 to-white border border-blue-500/20 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-600/30 text-blue-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-700" /> Hệ Thống Quản Lý Bãi Đỗ Xe Thông Minh
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Trung Tâm Điều Hành Bãi Xe AI
            </h2>
            <p className="text-sm text-slate-700 max-w-xl">
              Giám sát tự động luồng xe vào/ra thời gian thực, nhận diện biển số OCR với độ chính xác cao và tự động hóa tính phí gửi xe.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('gate')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-slate-900 text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <ArrowDownLeft className="w-4 h-4" /> Mở Cổng Xe Vào/Ra
            </button>
            <button
              onClick={() => onNavigate('map')}
              className="px-4 py-2.5 rounded-xl bg-slate-100/40 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-all flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-blue-600" /> Xem Sơ Đồ Ô Đỗ
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Số vị trí còn trống */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Vị Trí Còn Trống</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {data.soChoTrong} <span className="text-sm font-semibold text-slate-600">/ {data.tongSoCho} chỗ</span>
            </h3>
            <p className="text-[11px] text-emerald-600/80 mt-1 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Sẵn sàng tiếp nhận phương tiện
            </p>
          </div>
        </div>

        {/* KPI 2: Xe đang đỗ trong bãi */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Xe Đang Đỗ Trong Bãi</span>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.soXeDangDo} <span className="text-sm font-semibold text-slate-600">xe</span>
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${data.tyLeLapDay}%` }}
                ></div>
              </div>
              <span className="text-[11px] font-bold text-blue-600">{data.tyLeLapDay}%</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Doanh thu ngày */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-cyan-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Doanh Thu Tạm Tính</span>
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-extrabold text-cyan-600 tracking-tight">
              {(data.doanhThuNgay || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold text-slate-600">VNĐ</span>
            </h3>
            <p className="text-[11px] text-cyan-600/80 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              Tự động tính theo bảng định mức
            </p>
          </div>
        </div>

        {/* KPI 4: Phân khu & Bảo trì */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Trạng Thái Phân Khu</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.soKhuVuc} <span className="text-sm font-semibold text-slate-600">Khu Vực</span>
            </h3>
            <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
              <span>{data.soChoBaoTri > 0 ? `🟡 ${data.soChoBaoTri} vị trí bảo trì` : '🟢 Tất cả vị trí ổn định'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Zone Overview & Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Phân Khu Status (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" /> Tình Trạng Từng Phân Khu
              </h3>
              <p className="text-xs text-slate-600">Mức độ sử dụng theo từng khu vực phương tiện</p>
            </div>
            <button
              onClick={() => onNavigate('map')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Chi tiết <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {(data.khuVucSummary || []).map((kv) => (
              <div key={kv.id} className="p-3.5 rounded-xl bg-white/60 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    {kv.tenKhuVuc}
                  </div>
                  <span className="font-mono text-slate-600">
                    <strong className="text-emerald-600">{kv.soChoTrong}</strong>/{kv.sucChua} trống
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      kv.tyLe > 80 ? 'bg-rose-500' : kv.tyLe > 50 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${kv.tyLe}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Loại: {kv.loaiXe === 'OTO' ? 'Ô tô' : kv.loaiXe === 'XE_MAY' ? 'Xe máy' : 'Xe tải'}</span>
                  <span className="font-semibold text-slate-700">{kv.tyLe}% lấp đầy</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Nhật ký lượt vào ra gần nhất (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600" /> Hoạt Động Vào/Ra Gần Nhất
              </h3>
              <p className="text-xs text-slate-600">Ghi nhận camera & OCR tự động theo thời gian thực</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">Biển Số</th>
                  <th className="py-2.5 px-3 font-semibold">Loại Xe</th>
                  <th className="py-2.5 px-3 font-semibold">Vị Trí</th>
                  <th className="py-2.5 px-3 font-semibold">Thời Gian Vào</th>
                  <th className="py-2.5 px-3 font-semibold">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {(data.luotVaoRaGanNhat || []).slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-white/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 border border-blue-500/30 font-bold">
                        {item.bienSo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-sans">
                      {item.loaiXe === 'OTO' || item.loaiXe === 'O to' ? 'Ô tô' : 'Xe máy'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-bold">{item.maViTri || '--'}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-sans">
                      {new Date(item.thoiGianVao).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.trangThai === 'DANG_DO' || item.trangThai === 'Đang đỗ'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}
                      >
                        {item.trangThai === 'DANG_DO' || item.trangThai === 'Đang đỗ' ? 'Đang đỗ' : 'Đã ra'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TRUNG TÂM CẢNH BÁO BẤT THƯỜNG (DÀNH CHO QUẢN TRỊ VIÊN)
         ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Giám Sát & Cảnh Báo Bất Thường Hệ Thống</h3>
              <p className="text-xs text-slate-500">
                Phát hiện tự động các phương tiện đỗ quá hạn, biển số blacklist và sự cố ô đỗ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onNavigate('blacklist')}
              className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileWarning className="w-3.5 h-3.5" />
              <span>Quản lý Danh Sách Đen (3 xe)</span>
            </button>
            <button
              onClick={() => onNavigate('map')}
              className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{data.soChoBaoTri || 1} Ô đỗ bảo trì</span>
            </button>
          </div>
        </div>

        {/* Danh sách 3 cảnh báo tiêu biểu */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Cảnh báo 1: Xe đỗ quá 24h */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-amber-800">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Xe Đỗ Quá Hạn 24 Giờ
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 font-mono">1 Phương Tiện</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Xe <strong>30A-688.99</strong> đỗ tại ô <strong>A-01</strong> đã hơn 28 giờ liên tục.
            </p>
            <div className="text-[10px] text-amber-700 font-semibold pt-0.5">
              Khuyến nghị: Bảo vệ kiểm tra trực tiếp tình trạng xe.
            </div>
          </div>

          {/* Cảnh báo 2: Xe trong Danh Sách Đen */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-rose-800">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Cảnh Báo An Ninh Blacklist
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-200/60 font-mono">Đã Kích Hoạt</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Đã ghi nhận 3 biển số có tiền sử nợ cước hoặc vi phạm quy chế bãi xe.
            </p>
            <div className="text-[10px] text-rose-700 font-semibold pt-0.5">
              Hệ thống sẽ tự động khóa barie và phát còi khi phát hiện.
            </div>
          </div>

          {/* Cảnh báo 3: Tỷ lệ lấp đầy khu vực */}
          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-indigo-800">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                Dự Báo Giờ Cao Điểm Tới
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-200/60 font-mono">17:30 - 19:30</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Mật độ bãi dự báo chạm ngưỡng 98% công suất vào cuối giờ chiều nay.
            </p>
            <div className="text-[10px] text-indigo-700 font-semibold pt-0.5">
              Đề xuất: Kích hoạt thêm làn cổng phụ và phân luồng xe máy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
