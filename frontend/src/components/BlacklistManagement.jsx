import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  UserX,
  Search,
  Plus,
  Trash2,
  RotateCw,
  CheckCircle2,
  X,
  Car,
  FileWarning,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function BlacklistManagement({ currentUser }) {
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const [form, setForm] = useState({
    bienSo: '',
    loaiXe: 'OTO',
    lyDo: '',
    mucDo: 'CANH_BAO',
    ghiChu: ''
  });

  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchBlacklist = async () => {
    try {
      setLoading(true);
      const res = await api.getBlacklist();
      if (res.success && Array.isArray(res.data)) {
        setBlacklist(res.data);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách đen:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.bienSo.trim() || !form.lyDo.trim()) {
      showNotice('error', 'Vui lòng nhập biển số và lý do đưa vào danh sách đen!');
      return;
    }

    try {
      const res = await api.addBlacklist({
        ...form,
        bienSo: form.bienSo.trim().toUpperCase()
      });

      if (res.success) {
        showNotice('success', `Đã thêm biển số ${form.bienSo.toUpperCase()} vào danh sách đen!`);
        setShowAddModal(false);
        setForm({
          bienSo: '',
          loaiXe: 'OTO',
          lyDo: '',
          mucDo: 'CANH_BAO',
          ghiChu: ''
        });
        fetchBlacklist();
      } else {
        showNotice('error', res.message || 'Thao tác thất bại!');
      }
    } catch (err) {
      showNotice('error', 'Lỗi kết nối máy chủ!');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Xác nhận gỡ biển số ${item.bienSo} khỏi danh sách đen?`)) return;

    try {
      const res = await api.deleteBlacklist(item.id || item.bienSo);
      if (res.success) {
        showNotice('success', `Đã gỡ phương tiện ${item.bienSo} thành công!`);
        fetchBlacklist();
      } else {
        showNotice('error', res.message || 'Không thể gỡ!');
      }
    } catch (err) {
      showNotice('error', 'Lỗi máy chủ!');
    }
  };

  const filtered = blacklist.filter((b) => {
    const term = searchTerm.toLowerCase().trim();
    return !term || b.bienSo.toLowerCase().includes(term) || (b.lyDo || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold border ${
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

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Quản Lý Danh Sách Đen (Blacklist)</h1>
              <p className="text-xs text-slate-500">
                Kiểm soát các phương tiện có nguy cơ vi phạm an ninh, nợ cước hoặc có lệnh truy vết
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchBlacklist}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm biển số cảnh báo</span>
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm & thống kê */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 stroke-[2]" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo biển số, lý do cảnh báo..."
            className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 focus:bg-white text-sm font-medium text-slate-900 outline-none focus:border-rose-500 transition shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Tổng số xe trong danh sách đen: <strong className="text-rose-600 font-bold">{blacklist.length}</strong>
        </div>
      </div>

      {/* Bảng dữ liệu Blacklist */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Biển số phương tiện</th>
                <th className="py-3.5 px-5">Mức độ cảnh báo</th>
                <th className="py-3.5 px-5">Lý do đưa vào danh sách</th>
                <th className="py-3.5 px-5">Người tạo / Ngày lập</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && blacklist.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    Đang tải danh sách đen...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold text-slate-700">Không có phương tiện nào trong danh sách đen!</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-300 text-slate-900 tracking-wider">
                          {item.bienSo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {item.loaiXe === 'OTO' ? '🚗 Ô tô' : '🛵 Xe máy'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      {item.mucDo === 'NGUY_HIEM' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Nguy hiểm an ninh
                        </span>
                      )}
                      {item.mucDo === 'CANH_BAO' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <FileWarning className="w-3 h-3 text-amber-600" />
                          Nợ cước / Cảnh báo
                        </span>
                      )}
                      {item.mucDo === 'VI_PHAM' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-300">
                          Vi phạm nội quy bãi
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-800">{item.lyDo}</div>
                      {item.ghiChu && <div className="text-[11px] text-slate-400 mt-0.5">{item.ghiChu}</div>}
                    </td>

                    <td className="py-3.5 px-5 text-slate-500 text-[11px]">
                      <div>@{item.nguoiTao || 'admin'}</div>
                      <div className="font-mono text-slate-400">{item.ngayTao || '2026-04-10'}</div>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1.5 ml-auto transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Gỡ bỏ</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm Biển Số Vào Blacklist */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Thêm Phương Tiện Vào Danh Sách Đen</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs mt-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biển số phương tiện *</label>
                <input
                  type="text"
                  required
                  value={form.bienSo}
                  onChange={(e) => setForm({ ...form, bienSo: e.target.value.toUpperCase() })}
                  placeholder="VD: 29A-999.99"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 uppercase font-mono font-bold text-sm outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại phương tiện</label>
                  <select
                    value={form.loaiXe}
                    onChange={(e) => setForm({ ...form, loaiXe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                  >
                    <option value="OTO">🚗 Xe Ô tô</option>
                    <option value="XE_MAY">🛵 Xe máy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ cảnh báo</label>
                  <select
                    value={form.mucDo}
                    onChange={(e) => setForm({ ...form, mucDo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none font-semibold text-rose-600"
                  >
                    <option value="CANH_BAO">⚠️ Cảnh báo nợ cước</option>
                    <option value="NGUY_HIEM">🚨 Nguy hiểm an ninh</option>
                    <option value="VI_PHAM">⛔ Vi phạm quy chế bãi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý do đưa vào danh sách đen *</label>
                <textarea
                  required
                  rows="2"
                  value={form.lyDo}
                  onChange={(e) => setForm({ ...form, lyDo: e.target.value })}
                  placeholder="Mô tả lý do (VD: Xe trốn phí đỗ, va chạm không bồi thường...)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú hướng dẫn cho bảo vệ</label>
                <input
                  type="text"
                  value={form.ghiChu}
                  onChange={(e) => setForm({ ...form, ghiChu: e.target.value })}
                  placeholder="VD: Giữ xe và gọi ngay tổ trưởng an ninh..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/30"
                >
                  Xác nhận đưa vào Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
