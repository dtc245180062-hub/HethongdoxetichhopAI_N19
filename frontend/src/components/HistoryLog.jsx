import React, { useState } from 'react';
import {
  Clock,
  Search,
  Filter,
  RefreshCw,
  Car,
  CheckCircle2,
  DollarSign,
  Download
} from 'lucide-react';

export default function HistoryLog({ history = [], loading = false, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredHistory = history.filter((item) => {
    const matchSearch =
      !searchTerm ||
      item.bienSo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.maViTri?.toLowerCase().includes(searchTerm.toLowerCase());

    const isDangDo = item.trangThai === 'DANG_DO' || item.trangThai === 'Đang đỗ';
    const isDaRa = item.trangThai === 'DA_RA' || item.trangThai === 'Đã ra';

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DANG_DO' && isDangDo) ||
      (statusFilter === 'DA_RA' && isDaRa);

    return matchSearch && matchStatus;
  });

  const exportCSV = () => {
    if (!history || history.length === 0) {
      alert('Không có dữ liệu để xuất file!');
      return;
    }

    const headers = ['Mã Lượt', 'Biển Số Xe', 'Loại Xe', 'Vị Trí Đỗ', 'Thời Gian Vào', 'Thời Gian Ra', 'Trạng Thái', 'Tổng Tiền (VNĐ)', 'Phương Thức'];
    const rows = filteredHistory.map(item => [
      item.id,
      item.bienSo,
      item.loaiXe === 'OTO' || item.loaiXe === 'O to' ? 'Ô tô' : 'Xe máy',
      item.maViTri || '',
      item.thoiGianVao ? new Date(item.thoiGianVao).toLocaleString('vi-VN') : '',
      item.thoiGianRa ? new Date(item.thoiGianRa).toLocaleString('vi-VN') : '',
      item.trangThai || '',
      item.tongTien || 0,
      item.phuongThucThanhToan || ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `doxeai_lichsu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Nhật Ký Lịch Sử Xe Vào / Ra
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Theo dõi chi tiết thời gian, hình ảnh AI OCR và trạng thái thanh toán
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            title="Xuất dữ liệu lịch sử ra file CSV/Excel"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-slate-900 font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo CSV</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all border border-slate-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo biển số xe hoặc mã vị trí..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-slate-900 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-600 font-semibold mr-1">Bộ lọc:</span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-slate-900 shadow'
                : 'bg-white text-slate-600 hover:text-slate-800 border border-slate-200'
            }`}
          >
            Tất cả ({history.length})
          </button>
          <button
            onClick={() => setStatusFilter('DANG_DO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'DANG_DO'
                ? 'bg-amber-600 text-slate-900 shadow'
                : 'bg-white text-amber-600 hover:bg-amber-50/40 border border-slate-200'
            }`}
          >
            Đang đỗ
          </button>
          <button
            onClick={() => setStatusFilter('DA_RA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'DA_RA'
                ? 'bg-emerald-600 text-slate-900 shadow'
                : 'bg-white text-emerald-600 hover:bg-emerald-50/40 border border-slate-200'
            }`}
          >
            Đã ra
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Mã Lượt</th>
                <th className="py-3 px-4 font-semibold">Biển Số Xe</th>
                <th className="py-3 px-4 font-semibold">Loại Phương Tiện</th>
                <th className="py-3 px-4 font-semibold">Vị Trí Đỗ</th>
                <th className="py-3 px-4 font-semibold">Thời Gian Vào</th>
                <th className="py-3 px-4 font-semibold">Thời Gian Ra</th>
                <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                <th className="py-3 px-4 font-semibold">Thành Tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => {
                  const isDangDo = item.trangThai === 'DANG_DO' || item.trangThai === 'Đang đỗ';

                  return (
                    <tr key={item.id} className="hover:bg-white/50 transition-colors">
                      <td className="py-3 px-4 text-slate-600">{item.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold px-2 py-0.5 rounded bg-white text-blue-700 border border-slate-300">
                          {item.bienSo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-sans">
                        {item.loaiXe === 'OTO' || item.loaiXe === 'O to' ? 'Ô tô' : 'Xe máy'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.maViTri || '--'}</td>
                      <td className="py-3 px-4 text-slate-700 font-sans">
                        {new Date(item.thoiGianVao).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-sans">
                        {item.thoiGianRa ? new Date(item.thoiGianRa).toLocaleString('vi-VN') : '--'}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDangDo
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}
                        >
                          {isDangDo ? 'Đang đỗ' : 'Đã ra'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-600 font-sans">
                        {item.tongTien ? `${item.tongTien.toLocaleString('vi-VN')} đ` : '0 đ'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-600 font-sans">
                    Không tìm thấy dữ liệu lượt gửi xe phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
