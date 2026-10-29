import React, { useState } from 'react';
import {
  BadgePercent,
  DollarSign,
  Check,
  Sparkles,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Save
} from 'lucide-react';
import { api } from '../services/api';

export default function PricingTable({ pricing = [], onRefresh, currentUser }) {
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    giaGioDau: 0,
    giaGioTiepTheo: 0,
    giaNgay: 0,
    giaDem: 0
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const canEdit = currentUser?.vaiTro === 'ADMIN' || (currentUser?.vaiTro !== 'KHACH_HANG' && Boolean(currentUser?.permissions?.canManagePricing));

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      giaGioDau: item.giaGioDau || 0,
      giaGioTiepTheo: item.giaGioTiepTheo || 0,
      giaNgay: item.giaNgay || 0,
      giaDem: item.giaDem || 0
    });
    setMessage(null);
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        giaGioDau: Number(editForm.giaGioDau) || 0,
        giaGioTiepTheo: Number(editForm.giaGioTiepTheo) || 0,
        giaNgay: Number(editForm.giaNgay) || 0,
        giaDem: Number(editForm.giaDem) || 0
      };

      const res = await api.updateBangGia(editingItem.id, payload);
      if (res && res.success) {
        setMessage({ type: 'success', text: `Cập nhật biểu phí [${editingItem.tenLoai}] thành công!` });
        if (onRefresh) onRefresh();
        setTimeout(() => {
          setEditingItem(null);
        }, 1000);
      } else {
        setMessage({ type: 'error', text: res?.message || 'Cập nhật thất bại!' });
      }
    } catch (err) {
      console.error('Lỗi cập nhật biểu phí:', err);
      setMessage({ type: 'error', text: err?.message || 'Lỗi kết nối máy chủ!' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-blue-600" />
            Bảng Định Mức Giá Dịch Vụ Gửi Xe
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Quy định mức thu phí gửi xe theo giờ, theo lượt, theo ngày và qua đêm tại hệ thống DoXeAI
          </p>
        </div>

        {canEdit && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chế độ Quản trị: Có thể chỉnh sửa giá</span>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricing.map((p) => (
          <div
            key={p.id}
            className="glass-panel p-6 rounded-3xl space-y-5 border border-slate-200 hover:border-blue-500/40 transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 font-mono font-bold">
                  {p.loaiXe}
                </span>
                {canEdit && (
                  <button
                    onClick={() => handleOpenEdit(p)}
                    title="Chỉnh sửa mức giá này"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Sửa giá</span>
                  </button>
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900">{p.tenLoai}</h3>

              <div className="pt-2 pb-1 border-y border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Giờ đầu tiên / Lượt:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {p.giaGioDau?.toLocaleString('vi-VN')} VND
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Giờ tiếp theo:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    +{p.giaGioTiepTheo?.toLocaleString('vi-VN')} VND/h
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Vé ngày (Block):</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {p.giaNgay?.toLocaleString('vi-VN')} VND
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Gửi qua đêm:</span>
                  <span className="font-bold text-amber-600 font-mono">
                    {p.giaDem?.toLocaleString('vi-VN')} VND
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Pricing Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-200/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <BadgePercent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chỉnh Sửa Biểu Phí</h3>
                  <p className="text-xs text-slate-600">{editingItem.tenLoai} ({editingItem.loaiXe})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-600 hover:text-slate-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                  message.type === 'success'
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-700'
                    : 'bg-rose-50/60 border-rose-500/40 text-rose-700'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSavePrice} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Giá giờ đầu tiên / Lượt (VNĐ) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={editForm.giaGioDau}
                  onChange={(e) => setEditForm({ ...editForm, giaGioDau: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Giá mỗi giờ tiếp theo (VNĐ) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={editForm.giaGioTiepTheo}
                  onChange={(e) => setEditForm({ ...editForm, giaGioTiepTheo: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Giá ngày (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    required
                    value={editForm.giaNgay}
                    onChange={(e) => setEditForm({ ...editForm, giaNgay: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Giá qua đêm (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    required
                    value={editForm.giaDem}
                    onChange={(e) => setEditForm({ ...editForm, giaDem: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-white shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
