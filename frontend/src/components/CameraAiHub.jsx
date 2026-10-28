import React, { useState, useMemo } from 'react';
import {
  Camera,
  ScanLine,
  Sparkles,
  Navigation,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Car,
  Cpu,
  Layers,
  Zap,
  ShieldCheck,
  BarChart3,
  Calendar,
  Compass
} from 'lucide-react';

export default function CameraAiHub({ slots = [], zones = [], onSelectSlot }) {
  const [activeSubTab, setActiveSubTab] = useState('ANPR'); // 'ANPR' | 'OPTIMAL_SLOT' | 'FORECASTING'

  // =========================================================================
  // 1. ANPR STUDIO (NHẬN DIỆN BIỂN SỐ XE AI)
  // =========================================================================
  const [testImage, setTestImage] = useState('/smart_parking_bg.jpg');
  const [isScanning, setIsScanning] = useState(false);
  const [anprResult, setAnprResult] = useState({
    plate: '30A-999.99',
    type: 'OTO',
    confidence: 0.96,
    processTimeMs: 84,
    engine: 'YOLOv8n + EasyOCR (PyTorch Engine)',
    box: [180, 240, 480, 310]
  });

  const SAMPLE_PLATES = [
    { plate: '30A-999.99', type: 'OTO', conf: 0.96, title: 'Ô tô Mercedes C300 (Rõ nét)' },
    { plate: '51K-892.45', type: 'OTO', conf: 0.92, title: 'Ô tô VinFast VF8 (Biển dài)' },
    { plate: '29-B1 123.45', type: 'XE_MAY', conf: 0.89, title: 'Xe máy Honda SH (2 dòng)' },
    { plate: '14-A2 555.66', type: 'OTO', conf: 0.65, title: 'Biển số góc xiên / Mờ (Low conf < 70%)' }
  ];

  const handleSimulateScan = (sample) => {
    setIsScanning(true);
    setTimeout(() => {
      setAnprResult({
        plate: sample.plate,
        type: sample.type,
        confidence: sample.conf,
        processTimeMs: Math.floor(Math.random() * 40 + 70),
        engine: 'YOLOv8n + EasyOCR (FastAPI Port 8000)',
        box: [160, 220, 460, 300]
      });
      setIsScanning(false);
    }, 700);
  };

  // =========================================================================
  // 2. GỢI Ý VỊ TRÍ ĐỖ XE TỐI ƯU (OPTIMAL SLOT RECOMMENDATION)
  // =========================================================================
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('OTO');
  const [preferFeature, setPreferFeature] = useState('NEAR_EXIT'); // 'NEAR_EXIT' | 'NEAR_CHARGER' | 'SPACIOUS'

  const recommendedSlots = useMemo(() => {
    const available = slots.filter((s) => s.trangThai === 'Trống');
    
    // Thuật toán chấm điểm vị trí tối ưu
    const scored = available.map((slot) => {
      let score = 100;
      let reasons = [];

      // Khớp loại xe
      if (slot.loaiXe === vehicleTypeFilter) {
        score += 30;
        reasons.push(`Đúng chuẩn loại xe ${vehicleTypeFilter === 'OTO' ? 'Ô tô' : 'Xe máy'}`);
      } else {
        score -= 20;
      }

      // Vị trí theo phân khu
      if (slot.maKhuVuc === 'KV-A') {
        score += 25;
        reasons.push('Tầng 1 - Ngay cạnh lối vào và thang máy trung tâm');
      } else if (slot.maKhuVuc === 'KV-B') {
        score += preferFeature === 'NEAR_CHARGER' ? 35 : 15;
        reasons.push('Trang bị trạm sạc xe điện siêu nhanh DC');
      } else if (slot.maKhuVuc === 'KV-C') {
        score += 20;
        reasons.push('Làn xe máy tự động hóa có mái che');
      }

      // Khoảng cách di chuyển ước tính
      const slotNum = parseInt(slot.id?.replace(/\D/g, '') || '10');
      const distanceMeters = slotNum * 6 + 15;
      score -= Math.min(distanceMeters * 0.2, 25);

      return {
        ...slot,
        score: Math.round(score),
        distanceMeters,
        reasons
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 4);
  }, [slots, vehicleTypeFilter, preferFeature]);

  // =========================================================================
  // 3. DỰ BÁO MẬT ĐỘ LẤP ĐẦY THEO KHUNG GIỜ (OCCUPANCY FORECASTING)
  // =========================================================================
  // 24 khung giờ trong ngày
  const HOURLY_FORECAST = [
    { hour: '00:00', rate: 22, status: 'Vắng' },
    { hour: '02:00', rate: 18, status: 'Vắng' },
    { hour: '04:00', rate: 15, status: 'Vắng' },
    { hour: '06:00', rate: 35, status: 'Bình thường' },
    { hour: '07:30', rate: 88, status: 'Cao điểm sáng', isPeak: true },
    { hour: '08:30', rate: 95, status: 'Cao điểm sáng', isPeak: true },
    { hour: '10:00', rate: 75, status: 'Ổn định' },
    { hour: '11:30', rate: 82, status: 'Giờ ăn trưa' },
    { hour: '13:30', rate: 70, status: 'Ổn định' },
    { hour: '15:30', rate: 68, status: 'Bình thường' },
    { hour: '17:30', rate: 96, status: 'Cao điểm chiều', isPeak: true },
    { hour: '18:30', rate: 98, status: 'Cao điểm chiều', isPeak: true },
    { hour: '20:00', rate: 78, status: 'Bình thường' },
    { hour: '22:00', rate: 45, status: 'Vắng dần' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
                <Cpu className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Trung Tâm Điều Hành Camera AI & ANPR
              </h1>
            </div>
            <p className="text-xs text-slate-300">
              Bộ ba chức năng thị giác máy tính: Nhận diện biển số (ANPR), Gợi ý vị trí đỗ tối ưu & Dự báo mật độ 24h
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveSubTab('ANPR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'ANPR'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>1. Nhận diện biển số</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('OPTIMAL_SLOT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'OPTIMAL_SLOT'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>2. Gợi ý ô đỗ tối ưu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('FORECASTING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'FORECASTING'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>3. Dự báo mật độ 24h</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NHẬN DIỆN BIỂN SỐ XE AI (ANPR STUDIO) */}
      {/* ========================================================================= */}
      {activeSubTab === 'ANPR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Khung xem trực tiếp Camera & Scanner */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-bold text-slate-900">Luồng Camera Nhận Diện Trực Tiếp (Cổng Vào)</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border">
                FPS: 28.5 | 1080p
              </span>
            </div>

            {/* Video / Photo Preview Container with AI Bounding Box */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
              <img
                src={testImage}
                alt="Camera Stream"
                className="w-full h-full object-cover opacity-85"
              />

              {/* Laser Scanning Line Animation */}
              {isScanning && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent h-16 w-full animate-pulse top-1/3" />
              )}

              {/* YOLO Bounding Box Overlay */}
              <div
                className={`absolute border-2 rounded transition-all duration-300 ${
                  anprResult.confidence >= 0.70 ? 'border-emerald-400 bg-emerald-400/10' : 'border-rose-400 bg-rose-400/10'
                }`}
                style={{
                  top: '35%',
                  left: '30%',
                  width: '40%',
                  height: '32%'
                }}
              >
                <div className="absolute -top-7 left-0 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-white flex items-center gap-1.5 border border-white/20">
                  <span className={`w-1.5 h-1.5 rounded-full ${anprResult.confidence >= 0.7 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span>{anprResult.plate}</span>
                  <span className="text-cyan-300">{(anprResult.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Camera Target Crosshairs */}
              <div className="absolute top-3 left-3 text-[10px] font-mono text-cyan-400/80 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                CAM_01: IN_GATE_AI_LANE
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-300 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                LATENCY: {anprResult.processTimeMs} ms
              </div>
            </div>

            {/* Thử nghiệm với các ảnh biển số mẫu */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-700 block">Chọn biển số mẫu kiểm thử AI:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_PLATES.map((sample) => (
                  <button
                    key={sample.plate}
                    type="button"
                    onClick={() => handleSimulateScan(sample)}
                    disabled={isScanning}
                    className="p-2 rounded-xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50 text-left transition cursor-pointer disabled:opacity-50"
                  >
                    <div className="text-[11px] font-mono font-bold text-slate-900">{sample.plate}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{sample.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cột phải: Thẻ kết quả phân tích AI chi tiết */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>Kết Quả Nhận Diện Biển Số (ANPR Payload)</span>
              </h3>

              {/* Biển số hiển thị dạng dập nổi thực tế */}
              <div className="p-4 rounded-xl bg-slate-100 border-2 border-slate-300 text-center shadow-inner">
                <span className="text-2xl font-black font-mono tracking-widest text-slate-900">
                  {anprResult.plate}
                </span>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">
                  Biển Số Xe Việt Nam Chuẩn Hóa
                </div>
              </div>

              {/* Bảng chỉ số kỹ thuật */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Độ tin cậy AI:</span>
                  <span className={`font-mono font-bold ${anprResult.confidence >= 0.7 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(anprResult.confidence * 100).toFixed(1)}% {anprResult.confidence >= 0.7 ? '(Đạt chuẩn)' : '(Ngoại lệ UC-15)'}
                  </span>
                </div>

                <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Loại phương tiện:</span>
                  <span className="font-bold text-slate-900">
                    {anprResult.type === 'OTO' ? '🚗 Xe Ô Tô (4 - 7 chỗ)' : '🛵 Xe Máy / Xe Tay Ga'}
                  </span>
                </div>

                <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Thời gian suy luận:</span>
                  <span className="font-mono font-bold text-indigo-600">{anprResult.processTimeMs} ms</span>
                </div>

                <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Mô hình AI:</span>
                  <span className="font-mono text-slate-700 text-[11px] font-semibold">{anprResult.engine}</span>
                </div>
              </div>

              {/* Đánh giá điều kiện vào bãi */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                anprResult.confidence >= 0.70
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {anprResult.confidence >= 0.70 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Đủ điều kiện Check-in tự động</strong>
                      <span>Độ tin cậy vượt ngưỡng 70%, hệ thống tự động gán vị trí đỗ và cho phép mở barie.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Kích hoạt Quy trình Ngoại lệ UC-15</strong>
                      <span>Biển số bị mờ hoặc độ tin cậy &lt; 70%. Yêu cầu nhân viên bảo vệ xác nhận thủ công trước khi mở barie.</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GỢI Ý VỊ TRÍ ĐỖ XE TỐI ƯU (OPTIMAL SLOT ENGINE) */}
      {/* ========================================================================= */}
      {activeSubTab === 'OPTIMAL_SLOT' && (
        <div className="space-y-6">
          {/* Bộ lọc điều kiện gợi ý */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Thuật Toán Gợi Ý Vị Trí Ô Đỗ Thông Minh</h3>
              <p className="text-xs text-slate-500">
                Tự động tính toán điểm tối ưu dựa trên loại xe, khoảng cách cổng vào và tiện ích kèm theo
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Chọn loại xe */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setVehicleTypeFilter('OTO')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    vehicleTypeFilter === 'OTO' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  🚗 Xe Ô tô
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleTypeFilter('XE_MAY')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    vehicleTypeFilter === 'XE_MAY' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  🛵 Xe máy
                </button>
              </div>

              {/* Chọn ưu tiên tiện ích */}
              <select
                value={preferFeature}
                onChange={(e) => setPreferFeature(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-indigo-500"
              >
                <option value="NEAR_EXIT">⚡ Gần lối ra / Thang máy</option>
                <option value="NEAR_CHARGER">🔋 Ưu tiên có trạm sạc điện</option>
                <option value="SPACIOUS">📐 Ô đỗ rộng rãi cho xe lớn</option>
              </select>
            </div>
          </div>

          {/* Danh sách các vị trí đỗ tối ưu nhất được AI đề xuất */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedSlots.map((slot, index) => (
              <div
                key={slot.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition space-y-3 relative overflow-hidden"
              >
                {/* Ranking Badge Top 1-4 */}
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {index === 0 ? '⭐ Khuyến nghị số 1' : `Đề xuất #${index + 1}`}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-600">
                    Điểm AI: {slot.score}/100
                  </span>
                </div>

                {/* Slot ID */}
                <div>
                  <div className="text-2xl font-black text-slate-900">{slot.tenViTri || slot.id}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Khu vực: <strong className="text-slate-800">{slot.maKhuVuc}</strong>
                  </div>
                </div>

                {/* Khoảng cách di chuyển */}
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Khoảng cách di chuyển: <strong>~{slot.distanceMeters} mét</strong></span>
                </div>

                {/* Lý do AI đề xuất */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  {slot.reasons.map((r, i) => (
                    <div key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={() => onSelectSlot && onSelectSlot(slot.id)}
                  className="w-full mt-2 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs transition cursor-pointer"
                >
                  Chọn ô đỗ {slot.id}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DỰ BÁO MẬT ĐỘ LẤP ĐẦY THEO KHUNG GIỜ (OCCUPANCY FORECASTING) */}
      {/* ========================================================================= */}
      {activeSubTab === 'FORECASTING' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Biểu Đồ Dự Báo Mật Độ Lấp Đầy Bãi Xe 24 Giờ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mô hình hồi quy dự báo lưu lượng xe vào/ra dựa trên dữ liệu lịch sử 30 ngày gần nhất
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Khung giờ cao điểm (&gt; 85%)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Khung giờ bình thường
                </span>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="pt-6 pb-2">
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-56 px-2">
                {HOURLY_FORECAST.map((item) => {
                  const isHighPeak = item.rate >= 85;
                  return (
                    <div key={item.hour} className="flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity text-slate-700">
                        {item.rate}%
                      </div>
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 relative ${
                          isHighPeak
                            ? 'bg-gradient-to-t from-rose-500 to-rose-400 shadow-md shadow-rose-500/20'
                            : 'bg-gradient-to-t from-indigo-500 to-cyan-400'
                        }`}
                        style={{ height: `${item.rate}%` }}
                      >
                        {isHighPeak && (
                          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold mt-1">
                        {item.hour}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Actionable Recommendations */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Đề xuất điều hành từ mô hình AI:
              </span>
              <ul className="space-y-1 text-slate-600 pl-5 list-disc text-[11px]">
                <li>
                  <strong>Khung giờ sáng (07:30 - 09:00):</strong> Tỷ lệ lấp đầy đạt 95%. Khuyến cáo mở cả 2 làn cổng vào và bố trí 2 nhân viên trực quét mã VietQR để tránh ùn tắc đường Nguyễn Trãi.
                </li>
                <li>
                  <strong>Khung giờ chiều tối (17:30 - 19:30):</strong> Lượng xe ra về đạt đỉnh 98%. Ưu tiên kích hoạt làn tự động nhận diện biển số xe tháng cho cư dân.
                </li>
                <li>
                  <strong>Đề xuất doanh thu:</strong> Áp dụng bảng giá linh hoạt theo giờ cao điểm để tối ưu hóa công suất khai thác tầng hầm.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
