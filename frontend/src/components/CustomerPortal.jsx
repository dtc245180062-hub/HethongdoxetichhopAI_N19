import React, { useState, useEffect, useMemo } from 'react';
import {
  Car,
  CreditCard,
  QrCode,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Calendar,
  Phone,
  User,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Fuel,
  Zap,
  Info,
  RefreshCw,
  Receipt,
  Download,
  History,
  LifeBuoy,
  MessageSquare,
  Send,
  Check,
  Compass,
  FileText,
  Printer,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export default function CustomerPortal({
  currentUser,
  slots = [],
  zones = [],
  pricing = [],
  onRefresh,
  loading = false,
  onNavigate,
  preSelectedSlot = null,
  onClearPreSelectedSlot
}) {
  // Sub-tabs trong cổng khách hàng
  // 'status' (Tình trạng xe), 'booking' (Đặt chỗ trước), 'history' (Lịch sử & Hóa đơn), 'support' (Hỗ trợ & Báo sự cố)
  const [activeCustomerTab, setActiveCustomerTab] = useState('status');

  // Quản lý xe đang chọn
  const [selectedPlate, setSelectedPlate] = useState(currentUser?.bienSoXe || '30A-999.99');
  const [searchPlateInput, setSearchPlateInput] = useState(currentUser?.bienSoXe || '30A-999.99');

  // Lịch sử gửi xe cá nhân
  const [customerHistory, setCustomerHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Danh sách phiếu hỗ trợ
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);

  // Modal Thanh toán VietQR
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  // Modal Xem & In Hóa đơn điện tử
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Form Đặt chỗ trước (Pre-booking)
  const [bookingForm, setBookingForm] = useState({
    maKhuVuc: 'KV-A',
    loaiXe: 'OTO',
    thoiGianDen: '',
    ghiChu: ''
  });
  const [bookingMsg, setBookingMsg] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // Form Gửi yêu cầu hỗ trợ (Support)
  const [supportForm, setSupportForm] = useState({
    tieuDe: '',
    noiDung: '',
    loaiSuCo: 'HO_TRO_CHUNG'
  });
  const [supportMsg, setSupportMsg] = useState(null);
  const [supportSubmitting, setSupportSubmitting] = useState(false);

  // Máy tính phí dự kiến
  const [calcVehicleType, setCalcVehicleType] = useState('OTO');
  const [calcHours, setCalcHours] = useState(3);

  // Tự động chuyển sang tab đặt chỗ và điền thông tin khi nhận preSelectedSlot từ Sơ đồ
  useEffect(() => {
    if (preSelectedSlot) {
      setActiveCustomerTab('booking');
      setBookingForm((prev) => ({
        ...prev,
        maKhuVuc: preSelectedSlot.maKhuVuc || prev.maKhuVuc,
        loaiXe: preSelectedSlot.loaiXe || prev.loaiXe,
        ghiChu: `Đặt giữ chỗ trước ô ${preSelectedSlot.tenViTri || preSelectedSlot.id}`
      }));
      if (onClearPreSelectedSlot) {
        onClearPreSelectedSlot();
      }
    }
  }, [preSelectedSlot]);

  // Tải lịch sử đỗ xe cá nhân khi đổi biển số hoặc tab
  const fetchCustomerHistory = async (plate) => {
    const target = plate || selectedPlate;
    if (!target) return;
    try {
      setHistoryLoading(true);
      const res = await api.getCustomerHistory(target);
      if (res.success && res.data) {
        setCustomerHistory(res.data);
      }
    } catch (e) {
      console.error('Lỗi tải lịch sử xe cá nhân:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Tải danh sách yêu cầu hỗ trợ
  const fetchSupportTickets = async () => {
    try {
      setSupportLoading(true);
      const res = await api.getSupportTickets({
        bienSo: selectedPlate,
        soDienThoai: currentUser?.soDienThoai
      });
      if (res.success && res.data) {
        setSupportTickets(res.data);
      }
    } catch (e) {
      console.error('Lỗi tải phiếu hỗ trợ:', e);
    } finally {
      setSupportLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPlate) {
      fetchCustomerHistory(selectedPlate);
    }
    fetchSupportTickets();
  }, [selectedPlate]);

  // Kiểm tra xe đang chọn có đang đỗ trong bãi hay không
  const activeVehicleInSlot = useMemo(() => {
    if (!selectedPlate || !selectedPlate.trim()) return null;
    const cleanPlate = selectedPlate.trim().toUpperCase();
    return slots.find(
      (s) => (s.trangThai === 'Đã đỗ' || s.trangThaiCode === 'DA_DO') &&
             s.bienSoXe &&
             s.bienSoXe.toUpperCase() === cleanPlate
    );
  }, [selectedPlate, slots]);

  // Chi tiết lượt đỗ hiện tại
  const parkingDetail = useMemo(() => {
    if (!activeVehicleInSlot || !activeVehicleInSlot.thoiGianVao) return null;

    const timeIn = new Date(activeVehicleInSlot.thoiGianVao);
    const now = new Date();
    const diffMs = Math.max(0, now - timeIn);
    const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    const isXeMay = activeVehicleInSlot.loaiXe === 'XE_MAY' || activeVehicleInSlot.loaiXe === 'Xe may';
    const isResident = currentUser?.bienSoXe && currentUser.bienSoXe.toUpperCase() === activeVehicleInSlot.bienSoXe?.toUpperCase();

    let estimatedFee = 0;
    if (isResident && currentUser?.vaiTro === 'KHACH_HANG') {
      estimatedFee = 0; // Cư dân miễn phí gửi xe cố định
    } else if (isXeMay) {
      estimatedFee = 5000;
    } else {
      estimatedFee = diffHours * 20000;
    }

    return {
      timeInStr: timeIn.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' • ' + timeIn.toLocaleDateString('vi-VN'),
      diffHours,
      diffMinutes,
      estimatedFee,
      isResident,
      slotName: activeVehicleInSlot.tenViTri || activeVehicleInSlot.id,
      zoneId: activeVehicleInSlot.maKhuVuc
    };
  }, [activeVehicleInSlot, currentUser]);

  // Tính phí dự kiến
  const calculatedEstimate = useMemo(() => {
    const hours = parseInt(calcHours) || 1;
    if (calcVehicleType === 'XE_MAY') {
      return {
        unit: '5.000đ / lượt',
        total: 5000,
        monthly: '150.000đ / tháng'
      };
    } else if (calcVehicleType === 'XE_TAI') {
      return {
        unit: '35.000đ giờ đầu, 20.000đ tiếp theo',
        total: 35000 + Math.max(0, hours - 1) * 20000,
        monthly: '2.500.000đ / tháng'
      };
    } else {
      return {
        unit: '20.000đ / giờ',
        total: hours * 20000,
        monthly: '1.500.000đ / tháng'
      };
    }
  }, [calcVehicleType, calcHours]);

  // Xử lý mở Modal Thanh toán QR
  const handleOpenPayment = (amount, plate, note) => {
    setPaymentData({
      amount: amount || 20000,
      plate: plate || selectedPlate || '30A-999.99',
      note: note || `THANH TOAN DOXEAI ${plate || selectedPlate}`
    });
    setShowPaymentModal(true);
  };

  // Xử lý xem biên lai / hóa đơn điện tử
  const handleViewReceipt = (item) => {
    setSelectedReceipt(item);
    setShowReceiptModal(true);
  };

  // Xử lý gửi Form Đặt chỗ trước
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      setBookingLoading(true);
      setBookingMsg(null);
      setBookingResult(null);

      const payload = {
        bienSo: selectedPlate,
        loaiXe: bookingForm.loaiXe,
        maKhuVuc: bookingForm.maKhuVuc,
        thoiGianDen: bookingForm.thoiGianDen,
        ghiChu: bookingForm.ghiChu,
        hoTen: currentUser?.hoTen || 'Khách hàng',
        soDienThoai: currentUser?.soDienThoai || ''
      };

      const res = await api.bookSlot(payload);
      if (res.success && res.data) {
        setBookingResult(res.data);
        setBookingMsg({ type: 'success', text: res.message });
      } else {
        setBookingMsg({ type: 'error', text: res.message || 'Đặt chỗ thất bại!' });
      }
    } catch (err) {
      setBookingMsg({ type: 'error', text: 'Lỗi kết nối máy chủ đặt chỗ!' });
    } finally {
      setBookingLoading(false);
    }
  };

  // Xử lý gửi phiếu yêu cầu hỗ trợ
  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportForm.tieuDe.trim() || !supportForm.noiDung.trim()) {
      setSupportMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung!' });
      return;
    }

    try {
      setSupportSubmitting(true);
      setSupportMsg(null);

      const payload = {
        tieuDe: supportForm.tieuDe.trim(),
        noiDung: supportForm.noiDung.trim(),
        loaiSuCo: supportForm.loaiSuCo,
        bienSo: selectedPlate,
        hoTen: currentUser?.hoTen || 'Khách hàng',
        soDienThoai: currentUser?.soDienThoai || ''
      };

      const res = await api.sendSupportTicket(payload);
      if (res.success && res.data) {
        setSupportMsg({ type: 'success', text: res.message });
        setSupportForm({ tieuDe: '', noiDung: '', loaiSuCo: 'HO_TRO_CHUNG' });
        fetchSupportTickets();
      } else {
        setSupportMsg({ type: 'error', text: res.message || 'Gửi yêu cầu thất bại!' });
      }
    } catch (err) {
      setSupportMsg({ type: 'error', text: 'Lỗi gửi yêu cầu hỗ trợ!' });
    } finally {
      setSupportSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner & Quick Vehicle Switcher */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-500/30 p-6 shadow-xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Cổng Trải Nghiệm Khách Hàng DoXeAI v2.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-normal">
              Xin chào, {currentUser?.hoTen || 'Quý Khách'}! 👋
            </h1>
            <p className="text-sm text-slate-700 max-w-2xl">
              Hệ thống tự động đồng bộ biển số xe, định vị ô đỗ thời gian thực, đặt chỗ trước và thanh toán không chạm VietQR.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-100/40 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
              title="Đồng bộ dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Plate Quick Selector Bar */}
        <div className="mt-5 pt-4 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <Car className="w-4 h-4 text-purple-400" />
              <span>Phương tiện đang chọn:</span>
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-400/40 text-amber-700 font-bold tracking-wider">
                {selectedPlate}
              </span>
              <span className="text-[11px] text-slate-600">
                ({currentUser?.hoTen})
              </span>
            </div>
          </div>

          {/* Search other vehicle */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSelectedPlate(searchPlateInput.trim().toUpperCase());
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={searchPlateInput}
              onChange={(e) => setSearchPlateInput(e.target.value)}
              placeholder="Tra cứu biển số khác..."
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs uppercase outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Xem
            </button>
          </form>
        </div>
      </div>

      {/* 2. Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          onClick={() => setActiveCustomerTab('status')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCustomerTab === 'status'
              ? 'bg-purple-600 text-slate-900 shadow-lg shadow-purple-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Trạng Thái Đỗ Xe</span>
          {activeVehicleInSlot && (
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveCustomerTab('booking')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCustomerTab === 'booking'
              ? 'bg-purple-600 text-slate-900 shadow-lg shadow-purple-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Đặt Chỗ Trước (Giữ Chỗ)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 border border-amber-500/30 font-mono">
            Ưu Tiên
          </span>
        </button>

        <button
          onClick={() => setActiveCustomerTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCustomerTab === 'history'
              ? 'bg-purple-600 text-slate-900 shadow-lg shadow-purple-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch Sử & Hóa Đơn Điện Tử</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono">
            {customerHistory.length}
          </span>
        </button>

        <button
          onClick={() => setActiveCustomerTab('support')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCustomerTab === 'support'
              ? 'bg-purple-600 text-slate-900 shadow-lg shadow-purple-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <LifeBuoy className="w-4 h-4 text-cyan-600" />
          <span>Báo Cáo Sự Cố & Hỗ Trợ</span>
          {supportTickets.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-700 border border-cyan-200 font-mono">
              {supportTickets.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. TAB CONTENT 1: TRẠNG THÁI ĐỖ XE & TÌNH TRẠNG CHỖ TRỐNG */}
      {activeCustomerTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái (2 Cols): Live Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Parking Status Card */}
            <div className="bg-white/40 border-white/60 border border-slate-200 rounded-2xl p-6 space-y-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Trạng Thái Phương Tiện [{selectedPlate}]
                    </h3>
                    <p className="text-xs text-slate-600">Kiểm tra trực tiếp từ hệ thống Camera AI OCR</p>
                  </div>
                </div>

                {activeVehicleInSlot ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-300 text-emerald-700 text-xs font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                    ĐANG ĐỖ TRONG BÃI
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-300">
                    CHƯA VÀO BÃI
                  </span>
                )}
              </div>

              {activeVehicleInSlot ? (
                /* Card khi xe ĐANG ĐỖ */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Vị trí ô đỗ */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
                      <span className="text-[11px] text-slate-600 font-medium">Vị Trí Ô Đỗ</span>
                      <div className="font-mono font-black text-xl text-blue-600 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        <span>{parkingDetail?.slotName}</span>
                      </div>
                      <span className="text-[10px] text-slate-600">Phân khu: {parkingDetail?.zoneId}</span>
                    </div>

                    {/* Thời gian vào */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
                      <span className="text-[11px] text-slate-600 font-medium">Thời Điểm Check-in</span>
                      <div className="font-mono font-bold text-sm text-slate-800">
                        {parkingDetail?.timeInStr}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        Đã gửi: {parkingDetail?.diffHours} giờ ({parkingDetail?.diffMinutes} phút)
                      </span>
                    </div>

                    {/* Phí tạm tính */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
                      <span className="text-[11px] text-slate-600 font-medium">Phí Tạm Tính</span>
                      <div className="font-mono font-black text-xl text-emerald-600">
                        {parkingDetail?.isResident
                          ? '0 VNĐ'
                          : `${parkingDetail?.estimatedFee.toLocaleString('vi-VN')} VNĐ`}
                      </div>
                      <span className="text-[10px] text-purple-400 font-medium">
                        {parkingDetail?.isResident ? '✨ Cư Dân Thường Trú' : 'Vé Khách Vãng Lai'}
                      </span>
                    </div>
                  </div>

                  {/* Thanh hướng dẫn thanh toán & mở barrier */}
                  <div className="flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-blue-50 via-purple-50 to-white border border-blue-500/30 rounded-xl p-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">Thanh Toán Trực Tuyến VietQR</div>
                        <div className="text-slate-600">Quét mã trước khi ra bốt để Barrier tự động mở siêu tốc</div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleOpenPayment(
                          parkingDetail?.estimatedFee || 20000,
                          selectedPlate,
                          `PHI GUI XE ${selectedPlate}`
                        )
                      }
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-900 font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Tạo Mã VietQR</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Card khi xe CHƯA ĐỖ */
                <div className="rounded-xl bg-slate-50/40 border-white/60 border border-slate-200 p-6 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-white text-slate-600 border border-slate-200">
                    <Compass className="w-6 h-6 text-purple-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Phương tiện [{selectedPlate}] hiện không có lượt gửi tại bãi
                  </h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Khi bạn điều khiển xe đến cổng, Camera AI OCR sẽ tự động nhận diện biển số và mở Barrier trong vòng 0.5s.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveCustomerTab('booking')}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-900 font-bold text-xs shadow-lg cursor-pointer transition-all"
                    >
                      Đặt Giữ Chỗ Trước Ngay
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sơ đồ chỗ trống phân khu */}
            <div className="bg-white/40 border-white/60 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Chỗ Trống Các Phân Khu Thời Gian Thực</h3>
                    <p className="text-xs text-slate-600">Xem mật độ từng khu vực để chọn hướng đỗ thuận tiện</p>
                  </div>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('map')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Sơ đồ tổng thể</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {zones.map((zone) => {
                  const zoneSlots = slots.filter((s) => s.maKhuVuc === zone.id);
                  const emptySlots = zoneSlots.filter(
                    (s) => s.trangThai === 'Trống' || s.trangThaiCode === 'TRONG'
                  ).length;
                  const total = zoneSlots.length || zone.sucChua || 1;
                  const occupied = zoneSlots.filter(
                    (s) => s.trangThai === 'Đã đỗ' || s.trangThaiCode === 'DA_DO'
                  ).length;
                  const percent = Math.round((occupied / total) * 100);

                  return (
                    <div
                      key={zone.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-slate-900">{zone.tenKhuVuc}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white text-slate-700 border-slate-300 font-mono">
                          {zone.loaiXe === 'XE_MAY' ? '🛵 Xe Máy' : '🚗 Ô Tô'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-emerald-600">Còn trống: {emptySlots} chỗ</span>
                          <span className="text-slate-600 font-mono">{percent}% lấp đầy</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent > 85 ? 'bg-rose-500' : percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cột phải (1 Col): Resident Card & Calculator */}
          <div className="space-y-6">
            {/* Card: Thẻ Cư Dân 3D */}
            <div className="bg-gradient-to-br from-white via-purple-50 to-white border border-purple-500/30 rounded-2xl p-6 space-y-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Thẻ Cư Dân Điện Tử
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-200 font-bold">
                  HIỆU LỰC
                </span>
              </div>

              {/* RFID Card Simulation */}
              <div className="rounded-2xl bg-gradient-to-tr from-purple-800 via-indigo-700 to-blue-600 p-5 text-slate-900 shadow-xl space-y-4 relative overflow-hidden ring-1 ring-white/20">
                <div className="flex justify-between items-center text-xs font-mono opacity-85">
                  <span className="font-bold tracking-wider">DoXeAI RESIDENT PASS</span>
                  <Sparkles className="w-4 h-4 text-cyan-700" />
                </div>

                <div>
                  <div className="text-[10px] opacity-75 uppercase">Chủ phương tiện</div>
                  <div className="text-base font-black tracking-wide">{currentUser?.hoTen || 'Nguyễn Văn An'}</div>
                </div>

                <div className="flex justify-between items-end border-t border-white/20 pt-3">
                  <div>
                    <div className="text-[10px] opacity-75">Biển Số Đăng Ký</div>
                    <div className="font-mono font-black text-lg text-amber-700 tracking-wider">
                      {selectedPlate}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-[10px] opacity-75">Mã Thẻ RFID</div>
                    <div className="text-xs font-bold">RFID-10001</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Hạn thẻ cư dân:</span>
                  <span className="text-emerald-600 font-bold font-mono">Đến 31/12/2026</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Số điện thoại:</span>
                  <span className="text-slate-800 font-mono">{currentUser?.soDienThoai || '0933777888'}</span>
                </div>
              </div>
            </div>

            {/* Card: Bộ Tính Phí Tạm Tính */}
            <div className="bg-white/40 border-white/60 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Tính Phí Dự Kiến & VietQR</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">Loại phương tiện</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCalcVehicleType('OTO')}
                      className={`py-2 px-1 rounded-xl font-semibold border text-center transition-all cursor-pointer ${
                        calcVehicleType === 'OTO'
                          ? 'bg-purple-600 border-purple-500 text-slate-900'
                          : 'bg-slate-50 border-slate-300 text-slate-600'
                      }`}
                    >
                      🚗 Ô Tô
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcVehicleType('XE_MAY')}
                      className={`py-2 px-1 rounded-xl font-semibold border text-center transition-all cursor-pointer ${
                        calcVehicleType === 'XE_MAY'
                          ? 'bg-purple-600 border-purple-500 text-slate-900'
                          : 'bg-slate-50 border-slate-300 text-slate-600'
                      }`}
                    >
                      🛵 Xe Máy
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcVehicleType('XE_TAI')}
                      className={`py-2 px-1 rounded-xl font-semibold border text-center transition-all cursor-pointer ${
                        calcVehicleType === 'XE_TAI'
                          ? 'bg-purple-600 border-purple-500 text-slate-900'
                          : 'bg-slate-50 border-slate-300 text-slate-600'
                      }`}
                    >
                      🚚 Bán Tải
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-semibold mb-1">
                    <span>Thời gian gửi dự kiến:</span>
                    <span className="text-purple-400 font-mono font-bold">{calcHours} Giờ</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={calcHours}
                    onChange={(e) => setCalcHours(e.target.value)}
                    className="w-full accent-purple-500 bg-slate-100 rounded-lg h-1.5 cursor-pointer"
                  />
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Đơn giá niêm yết:</span>
                    <span className="text-slate-800">{calculatedEstimate.unit}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-1">
                    <span className="font-bold text-slate-900">Tổng tiền tạm tính:</span>
                    <span className="font-mono font-black text-emerald-600 text-base">
                      {calculatedEstimate.total.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleOpenPayment(
                      calculatedEstimate.total,
                      selectedPlate,
                      `NAP TIEN DO XE ${calculatedEstimate.total}`
                    )
                  }
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-slate-900 shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Tạo Mã QR VietQR Thanh Toán</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT 2: ĐẶT CHỖ TRƯỚC (SLOT RESERVATION) */}
      {activeCustomerTab === 'booking' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/40 border-white/60 border border-slate-200 rounded-2xl p-6 space-y-5 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đặt Chỗ Giữ Vị Trí Đỗ Xe Trực Tuyến</h3>
                <p className="text-xs text-slate-600">Giữ chỗ trước 45 phút, làn Barrier sẽ tự động nhận diện ưu tiên</p>
              </div>
            </div>

            {bookingMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                  bookingMsg.type === 'success'
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-700'
                    : 'bg-rose-50/60 border-rose-500/40 text-rose-700'
                }`}
              >
                {bookingMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{bookingMsg.text}</span>
              </div>
            )}

            {bookingResult ? (
              /* Kết quả đặt chỗ */
              <div className="rounded-xl bg-gradient-to-br from-white to-purple-50 border border-purple-500/40 p-5 space-y-4 text-center">
                <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  ĐẶT CHỖ THÀNH CÔNG!
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] text-slate-600">Mã Đặt Chỗ</span>
                    <div className="font-mono font-bold text-purple-400 text-sm mt-0.5">
                      {bookingResult.id}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] text-slate-600">Biển Số Xe</span>
                    <div className="font-mono font-bold text-amber-700 text-sm mt-0.5">
                      {bookingResult.bienSo}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] text-slate-600">Vị Trí Giữ Ô</span>
                    <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5">
                      {bookingResult.maViTriGiuCho} ({bookingResult.maKhuVuc})
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] text-slate-600">Thời Gian Giữ Chỗ</span>
                    <div className="font-mono font-bold text-cyan-600 text-sm mt-0.5">
                      45 Phút
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => {
                      setBookingResult(null);
                      setBookingMsg(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Đặt Chỗ Thêm Lượt Khác
                  </button>
                </div>
              </div>
            ) : (
              /* Form Đặt chỗ */
              <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">Biển số xe đặt chỗ *</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedPlate}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-amber-700 font-mono font-bold uppercase outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">Phân khu đỗ xe mong muốn *</label>
                    <select
                      value={bookingForm.maKhuVuc}
                      onChange={(e) => setBookingForm({ ...bookingForm, maKhuVuc: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-purple-500"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.tenKhuVuc} ({z.loaiXe === 'XE_MAY' ? 'Xe máy' : 'Ô tô'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">Loại phương tiện</label>
                    <select
                      value={bookingForm.loaiXe}
                      onChange={(e) => setBookingForm({ ...bookingForm, loaiXe: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-purple-500"
                    >
                      <option value="OTO">🚗 Xe Ô Tô (4 - 7 chỗ)</option>
                      <option value="XE_MAY">🛵 Xe Máy / Xe Tay Ga</option>
                      <option value="XE_TAI">🚚 Bán Tải / Xe Tải Nhỏ</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">Thời gian dự kiến đến</label>
                    <input
                      type="time"
                      value={bookingForm.thoiGianDen}
                      onChange={(e) => setBookingForm({ ...bookingForm, thoiGianDen: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Ghi chú đặc biệt (Tùy chọn)</label>
                  <textarea
                    rows={2}
                    value={bookingForm.ghiChu}
                    onChange={(e) => setBookingForm({ ...bookingForm, ghiChu: e.target.value })}
                    placeholder="VD: Cần vị trí gần trạm sạc điện hoặc thang máy..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3 rounded-xl font-bold text-xs text-slate-900 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {bookingLoading ? 'Đang kiểm tra ô đỗ trống...' : 'Xác Nhận Giữ Chỗ Trực Tuyến'}
                </button>
              </form>
            )}
          </div>

          {/* Hướng dẫn quyền lợi đặt chỗ */}
          <div className="bg-white/40 border-white/60 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Quyền Lợi Giữ Chỗ Online</h3>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Đảm bảo 100% có chỗ:</strong> Vị trí ô đỗ sẽ được khóa riêng cho biển số của bạn trong 45 phút.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Làn ưu tiên mở tự động:</strong> Camera AI nhận diện ngay từ xa, không cần chờ đợi.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Không phụ thu phí giữ chỗ:</strong> Miễn phí hoàn toàn cho cư dân & khách hàng thân thiết.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT 3: LỊCH SỬ & HÓA ĐƠN ĐIỆN TỬ */}
      {activeCustomerTab === 'history' && (
        <div className="bg-white/40 border-white/60 border border-slate-200 rounded-2xl p-6 space-y-5 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Lịch Sử Gửi Xe & Hóa Đơn Điện Tử</h3>
                <p className="text-xs text-slate-600">Danh sách các lượt vào/ra của phương tiện [{selectedPlate}]</p>
              </div>
            </div>

            <button
              onClick={() => fetchCustomerHistory(selectedPlate)}
              disabled={historyLoading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
              title="Làm mới lịch sử"
            >
              <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>

          {customerHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 uppercase font-mono text-[10px]">
                    <th className="py-3 px-3">Mã Lượt</th>
                    <th className="py-3 px-3">Thời Gian Vào</th>
                    <th className="py-3 px-3">Thời Gian Ra</th>
                    <th className="py-3 px-3">Vị Trí Đỗ</th>
                    <th className="py-3 px-3">Tổng Phí</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3 text-right">Hóa Đơn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {customerHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-100/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-purple-400">{item.id}</td>
                      <td className="py-3 px-3 text-slate-700">
                        {item.thoiGianVao ? new Date(item.thoiGianVao).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {item.thoiGianRa ? new Date(item.thoiGianRa).toLocaleString('vi-VN') : 'Đang gửi trong bãi'}
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-600">{item.maViTri || '—'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                        {item.tongTien ? `${item.tongTien.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ (Cư dân)'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.trangThai === 'Đã ra' || item.trangThai === 'DA_RA'
                              ? 'bg-emerald-50/60 text-emerald-600 border-emerald-200'
                              : 'bg-blue-50/60 text-blue-600 border-blue-500/30'
                          }`}
                        >
                          {item.trangThai}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleViewReceipt(item)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          <span>Xem Hóa Đơn</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-600 space-y-1">
              <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div>Chưa có dữ liệu lịch sử vào/ra cho xe [{selectedPlate}].</div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB CONTENT 4: BÁO CÁO SỰ CỐ & HỖ TRỢ */}
      {activeCustomerTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Gửi hỗ trợ */}
          <div className="bg-white/40 border-white/60 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Gửi Yêu Cầu Hỗ Trợ / Báo Sự Cố</h3>
                <p className="text-xs text-slate-600">Ban quản lý và bảo vệ sẽ phản hồi trực tiếp trong ít phút</p>
              </div>
            </div>

            {supportMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                  supportMsg.type === 'success'
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-700'
                    : 'bg-rose-50/60 border-rose-500/40 text-rose-700'
                }`}
              >
                {supportMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{supportMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSupportSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Loại vấn đề cần hỗ trợ</label>
                <select
                  value={supportForm.loaiSuCo}
                  onChange={(e) => setSupportForm({ ...supportForm, loaiSuCo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-cyan-500"
                >
                  <option value="HO_TRO_CHUNG">💬 Hỗ trợ thông tin chung / Tìm xe</option>
                  <option value="SU_CO_BARRIER">🚧 Sự cố mở Barrier / Nhận diện thẻ RFID</option>
                  <option value="QUEN_DO">🎒 Quên đồ đạc / Hành lý trong bãi xe</option>
                  <option value="VA_QUET">🚗 Báo cáo va chạm / Trầy xước phương tiện</option>
                  <option value="KHIEU_NAI_PHI">💰 Thắc mắc & Khiếu nại cước phí gửi xe</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Tiêu đề yêu cầu *</label>
                <input
                  type="text"
                  required
                  value={supportForm.tieuDe}
                  onChange={(e) => setSupportForm({ ...supportForm, tieuDe: e.target.value })}
                  placeholder="VD: Cần hỗ trợ tìm vị trí đỗ xe ô tô..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Nội dung chi tiết *</label>
                <textarea
                  rows={4}
                  required
                  value={supportForm.noiDung}
                  onChange={(e) => setSupportForm({ ...supportForm, noiDung: e.target.value })}
                  placeholder="Mô tả cụ thể vị trí đỗ, biển số hoặc thời gian xảy ra sự việc..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={supportSubmitting}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-900 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{supportSubmitting ? 'Đang gửi...' : 'Gửi Phiếu Hỗ Trợ Tới Ban Quản Lý'}</span>
              </button>
            </form>
          </div>

          {/* Danh sách các phiếu đã gửi */}
          <div className="bg-white/40 border-white/60 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Yêu Cầu Hỗ Trợ Của Bạn</h3>
              <span className="text-xs text-slate-600 font-mono">{supportTickets.length} phiếu</span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {supportTickets.length > 0 ? (
                supportTickets.map((t) => (
                  <div key={t.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-600">#{t.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.trangThai === 'DA_GIAI_QUYET'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-amber-50 text-amber-600 border-amber-500/30'
                        }`}
                      >
                        {t.trangThai === 'DA_GIAI_QUYET' ? 'Đã Giải Quyết' : 'Đang Xử Lý'}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 text-sm">{t.tieuDe}</div>
                    <p className="text-slate-600 line-clamp-2">{t.noiDung}</p>

                    {t.phanHoi && (
                      <div className="p-2.5 rounded-lg bg-blue-50/40 border border-blue-500/20 text-blue-700 text-[11px] space-y-0.5">
                        <span className="font-bold">Phản hồi từ BQL:</span>
                        <p>{t.phanHoi}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-600">
                  Bạn chưa có yêu cầu hỗ trợ nào đang mở.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: THANH TOÁN VIETQR */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 z-50 bg-slate-200/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-xl animate-scaleUp text-center">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-slate-900">Thanh Toán VietQR</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-600 hover:text-slate-900 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* QR code box */}
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-lg border-4 border-purple-500/30">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `2|99|0988111222|${paymentData.amount}|${paymentData.note}|0|0`
                )}`}
                alt="VietQR"
                className="w-44 h-44 mx-auto"
              />
              <div className="mt-2 text-[10px] text-slate-800 font-bold flex items-center justify-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> VietQR Napas247
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-slate-600">Số tiền chuyển khoản:</div>
              <div className="text-xl font-mono font-black text-emerald-600">
                {paymentData.amount.toLocaleString('vi-VN')} VNĐ
              </div>
              <div className="text-[11px] text-slate-600 font-mono">Nội dung: {paymentData.note}</div>
            </div>

            <button
              onClick={() => {
                alert('Hệ thống đã xác nhận thanh toán thành công qua cổng liên ngân hàng!');
                setShowPaymentModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-slate-900 transition-all cursor-pointer"
            >
              Xác Nhận Đã Hoàn Tất Chuyển Khoản
            </button>
          </div>
        </div>
      )}

      {/* 9. MODAL: XEM & IN HÓA ĐƠN ĐIỆN TỬ */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-200/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Biên Lai / Hóa Đơn Điện Tử</h3>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-slate-600 hover:text-slate-900 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt Body */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 font-mono text-xs text-slate-700">
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <div className="font-bold text-sm text-slate-900">HỆ THỐNG QUẢN LÝ BÃI XE DOXEAI</div>
                <div className="text-[10px] text-slate-600">Mã số thuế: 0109988776 • Hotline: 1900 6868</div>
                <div className="text-[11px] text-purple-400 font-bold">PHIẾU THU TIỀN GỬI XE ĐIỆN TỬ</div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Mã giao dịch:</span>
                  <span className="text-slate-900 font-bold">{selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Biển số xe:</span>
                  <span className="text-amber-700 font-bold">{selectedReceipt.bienSo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Vị trí ô đỗ:</span>
                  <span className="text-slate-900">{selectedReceipt.maViTri || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Thời gian vào:</span>
                  <span className="text-slate-700">{selectedReceipt.thoiGianVao ? new Date(selectedReceipt.thoiGianVao).toLocaleString('vi-VN') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Thời gian ra:</span>
                  <span className="text-slate-700">{selectedReceipt.thoiGianRa ? new Date(selectedReceipt.thoiGianRa).toLocaleString('vi-VN') : 'Đang đỗ'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-3 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">TỔNG TIỀN THANH TOÁN:</span>
                <span className="font-bold text-emerald-600 text-base">
                  {selectedReceipt.tongTien ? `${selectedReceipt.tongTien.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ (Cư dân)'}
                </span>
              </div>

              <div className="text-center text-[10px] text-slate-600 border-t border-slate-200 pt-2">
                Cảm ơn Quý khách đã sử dụng dịch vụ bãi đỗ xe thông minh DoXeAI!
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Biên Lai</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-900 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
