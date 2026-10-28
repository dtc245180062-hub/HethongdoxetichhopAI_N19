import React from 'react';
import {
  Car,
  QrCode,
  Printer,
  X,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

export default function TicketReceiptModal({ ticketData, onClose }) {
  if (!ticketData) return null;

  const isCheckIn = ticketData.type === 'CHECK_IN';
  const data = ticketData.data || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-200/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-xl relative animate-scaleUp">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-600 hover:text-slate-900 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 border-b border-slate-200 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs font-bold mb-1">
            <Car className="w-3.5 h-3.5" />
            <span>HỆ THỐNG QUẢN LÝ BÃI XE DOXEAI</span>
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
            {isCheckIn ? 'PHIẾU GỬI XE ĐIỆN TỬ' : 'HÓA ĐƠN THANH TOÁN GỬI XE'}
          </h2>
          <p className="text-[11px] text-slate-600">
            Mã giao dịch: <span className="font-mono font-bold text-slate-700">{data.id || data.luot_vao?.id || `DX-${Date.now()}`}</span>
          </p>
        </div>

        {/* Ticket Body (Print Area) */}
        <div className="bg-slate-50/40 border-white/60 border border-slate-200 rounded-2xl p-5 space-y-4 font-sans text-xs">
          {/* License Plate Display */}
          <div className="text-center py-2 px-4 bg-white border border-slate-300 rounded-xl space-y-0.5">
            <span className="text-[10px] text-slate-600 uppercase font-semibold">Biển Số Xe</span>
            <div className="text-2xl font-black font-mono tracking-widest text-cyan-600">
              {data.bienSo || data.luot_vao?.bienSo || '--'}
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              Loại xe: <span className="text-slate-800 font-semibold">{data.loaiXe || data.luot_vao?.loaiXe || 'Ô tô'}</span>
              {data.loaiVeText && <span className="text-purple-400 ml-1">({data.loaiVeText})</span>}
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2 text-slate-700">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Vị trí đỗ:
              </span>
              <span className="font-bold font-mono text-slate-900 text-sm bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
                {data.maViTri || data.vi_tri?.id || data.luot_vao?.maViTri || '--'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Thời gian vào:
              </span>
              <span className="font-mono text-slate-800">
                {data.thoiGianVao || data.luot_vao?.thoiGianVao ? new Date(data.thoiGianVao || data.luot_vao?.thoiGianVao).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
              </span>
            </div>

            {!isCheckIn && (
              <>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-600" /> Thời gian ra:
                  </span>
                  <span className="font-mono text-slate-800">
                    {data.thoiGianRa ? new Date(data.thoiGianRa).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Thời lượng gửi:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {data.soGioGui || 1} giờ
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Phương thức:</span>
                  <span className="font-semibold text-slate-800">
                    {data.phuongThucThanhToan === 'QR_CODE' ? 'Quét mã QR VietQR' : data.phuongThucThanhToan === 'VE_THANG' ? 'Thẻ cư dân thường trú' : 'Tiền mặt'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 bg-white/90 px-3 rounded-xl border border-slate-300">
                  <span className="text-slate-700 font-bold">Tổng thanh toán:</span>
                  <span className="font-mono font-black text-lg text-emerald-600">
                    {typeof data.tongTien === 'number' ? data.tongTien.toLocaleString('vi-VN') : 0} VNĐ
                  </span>
                </div>
              </>
            )}
          </div>

          {/* QR Code & Barcode Simulation */}
          <div className="pt-2 flex flex-col items-center justify-center space-y-2 border-t border-slate-200/80">
            <div className="p-2.5 bg-white rounded-xl shadow-md">
              <QrCode className="w-20 h-20 text-slate-950" />
            </div>
            <div className="text-[10px] text-slate-600 text-center font-mono">
              {isCheckIn ? 'Vui lòng giữ vé để đối soát khi ra bãi' : 'Cảm ơn quý khách đã sử dụng dịch vụ!'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-slate-900 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> In Phiếu / Hóa Đơn
          </button>
        </div>
      </div>
    </div>
  );
}
