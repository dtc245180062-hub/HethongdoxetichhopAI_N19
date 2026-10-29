const { getRevenueReport } = require('./revenueService');
const { getOccupancyForecast } = require('./forecastService');
const { getStaffingRecommendation } = require('./staffingService');
const { readDb, writeDb } = require('../utils/db');

// Nạp Google GenAI SDK an toàn
let GoogleGenAI = null;
try {
  GoogleGenAI = require('@google/genai').GoogleGenAI;
} catch (e) {
  // @google/genai chưa được cài đặt, hệ thống sẽ sử dụng Local Rule-based Engine
}

/**
 * Ghi log câu hỏi và phản hồi của Trợ lý AI
 * Lưu vào bảng admin_assistant_logs trong CSDL
 */
const logAssistantInteraction = (userId, userRole, question, answer, intent) => {
  try {
    const db = readDb();
    if (!db.admin_assistant_logs) {
      db.admin_assistant_logs = [];
    }

    const logEntry = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: userId || 'USER',
      role: userRole || 'CUSTOMER',
      question: question || '',
      answer: typeof answer === 'string' ? answer : (answer?.summary || ''),
      intent: intent || 'GENERAL',
      created_at: new Date().toISOString()
    };

    db.admin_assistant_logs.push(logEntry);
    if (db.admin_assistant_logs.length > 500) {
      db.admin_assistant_logs = db.admin_assistant_logs.slice(-500);
    }
    writeDb(db);
  } catch (err) {
    console.error('Không thể ghi log:', err.message);
  }
};

/**
 * Xử lý yêu cầu dành riêng cho KHÁCH HÀNG (Customer)
 * - Tra cứu chỗ trống theo thời gian thực
 * - Tra cứu bảng giá dịch vụ
 * - Hướng dẫn đặt chỗ, lịch sử và quản lý phương tiện
 * - TUYỆT ĐỐI CHẶN các thông tin nhạy cảm (doanh thu, tài chính, nhân sự, tài khoản)
 */
const processCustomerQuery = (prompt, db) => {
  const q = prompt.toLowerCase();
  const viTriList = db.ViTri || [];
  const khuVucList = db.KhuVuc || [];
  const bangGiaList = db.BangGia || [];

  // 1. CHẶN THÔNG TIN NHẠY CẢM CỦA QUẢN TRỊ
  if (
    q.includes('doanh thu') ||
    q.includes('tài chính') ||
    q.includes('thu nhập') ||
    q.includes('kiếm được bao nhiêu') ||
    q.includes('nhân sự') ||
    q.includes('nhân viên') ||
    q.includes('ca trực') ||
    q.includes('lương') ||
    q.includes('báo cáo') ||
    q.includes('quản trị') ||
    q.includes('tài khoản') ||
    q.includes('mật khẩu')
  ) {
    const safeRejectAnswer = 'Xin lỗi quý khách! Đây là thông tin quản trị nội bộ nhạy cảm của bãi xe. Trợ lý AI Khách hàng chỉ hỗ trợ tra cứu: Chỗ trống bãi xe theo thời gian thực, Bảng giá gửi xe chi tiết và Hướng dẫn dịch vụ cá nhân (đặt chỗ trước, lịch sử gửi xe).';

    return {
      topic: 'Thông Báo Quyền Truy Cập - Trợ Lý Khách Hàng',
      intent: 'SECURITY_RESTRICTION',
      answer: safeRejectAnswer,
      summary: 'Thông tin quản trị nội bộ không được phép công khai cho khách hàng.',
      details: [
        '🔒 **Quy định bảo mật**: Số liệu doanh thu, dòng tiền và phân bổ ca trực nhân sự chỉ dành riêng cho Quản trị viên hệ thống.',
        '🅿️ **Dịch vụ quý khách có thể tra cứu**: Tình trạng chỗ trống, Bảng giá gửi xe và Hướng dẫn đặt chỗ trước.'
      ],
      recommendations: [
        'Bấm hỏi: "Bãi xe hiện còn bao nhiêu chỗ trống?"',
        'Bấm hỏi: "Bảng giá gửi xe chi tiết thế nào?"',
        'Bấm hỏi: "Hướng dẫn đặt chỗ trước & gửi xe"'
      ],
      stats: {
        loaiNguoiDung: 'Khách hàng / Cư dân',
        phamViTraCuu: 'Công khai & Dịch vụ cá nhân'
      },
      source: 'SmartPark Customer Guardrail Engine'
    };
  }

  // 2. TRA CỨU CHỖ TRỐNG THEO THỜI GIAN THỰC
  if (
    q.includes('chỗ trống') ||
    q.includes('còn chỗ') ||
    q.includes('vị trí') ||
    q.includes('đỗ xe ở đâu') ||
    q.includes('tìm chỗ') ||
    q.includes('sức chứa')
  ) {
    const choTrongOto = viTriList.filter(v => (v.trangThai === 'TRONG' || v.trangThai === 'Trống') && v.loaiXe === 'OTO').length;
    const choTrongXeMay = viTriList.filter(v => (v.trangThai === 'TRONG' || v.trangThai === 'Trống') && v.loaiXe === 'XE_MAY').length;
    const tongTrong = choTrongOto + choTrongXeMay;

    const answer = `Hiện tại bãi đỗ xe SmartPark đang còn ${tongTrong} vị trí trống (bao gồm ${choTrongOto} chỗ cho ô tô tại Khu A & B, ${choTrongXeMay} chỗ cho xe máy tại Khu C). Bãi xe có hệ thống camera AI dẫn đường tự động khi quý khách vào cổng.`;

    return {
      topic: 'Tình Trạng Chỗ Trống Thời Gian Thực',
      intent: 'REALTIME_PARKING_AVAILABILITY',
      answer,
      summary: `Toàn bãi hiện còn ${tongTrong} vị trí đỗ xe sẵn sàng phục vụ.`,
      details: [
        `🚗 **Ô tô (4-7 chỗ)**: Còn **${choTrongOto} vị trí trống** tại Khu A (Tiêu chuẩn) và Khu B (Có trạm sạc điện & VIP).`,
        `🛵 **Xe máy & Xe tay ga**: Còn **${choTrongXeMay} vị trí trống** tại Khu C (Tầng hầm B1, có mái che).`,
        `📍 **Cảm biến thông minh**: Đèn LED xanh phía trên vị trí đỗ sẽ phát sáng báo hiệu chỗ còn trống.`
      ],
      recommendations: [
        'Quý khách có thể sử dụng chức năng "Đặt Chỗ Trước" để giữ vị trí đẹp trước khi đến bãi.',
        'Khi vào cổng, hệ thống camera AI sẽ tự động mở Barrier trong 2 giây mà không cần bấm thẻ giấy.'
      ],
      stats: {
        trongOto: `${choTrongOto} Chỗ`,
        trongXeMay: `${choTrongXeMay} Chỗ`,
        tongKhaDung: `${tongTrong} Chỗ`
      },
      source: 'SmartPark Realtime Slot Engine'
    };
  }

  // 3. TRA CỨU BẢNG GIÁ DỊCH VỤ CHI TIẾT
  if (
    q.includes('giá') ||
    q.includes('bảng giá') ||
    q.includes('bao nhiêu tiền') ||
    q.includes('phí gửi') ||
    q.includes('vé tháng') ||
    q.includes('thuê bao')
  ) {
    const answer = 'Bảng giá gửi xe chi tiết: Xe máy 5.000 VNĐ (giờ đầu), 3.000 VNĐ (giờ tiếp theo), vé tháng 150.000 VNĐ/tháng. Xe ô tô 20.000 VNĐ (giờ đầu), 10.000 VNĐ (giờ tiếp theo), vé tháng 1.500.000 VNĐ/tháng. Hỗ trợ thanh toán VietQR không tiền mặt.';

    return {
      topic: 'Bảng Giá Gửi Xe Chi Tiết',
      intent: 'PRICING_INQUIRY',
      answer,
      summary: 'Bảng giá áp dụng công khai, minh bạch theo từng khung giờ và loại xe.',
      details: [
        '🚗 **Xe Ô tô dưới 9 chỗ**: Giờ đầu **20.000 VNĐ**, giờ tiếp theo **10.000 VNĐ/h** • Cả ngày: **100.000 VNĐ** • Qua đêm: **120.000 VNĐ** • Thuê bao tháng: **1.500.000 VNĐ/tháng**.',
        '🛵 **Xe máy / Xe tay ga**: Giờ đầu **5.000 VNĐ**, giờ tiếp theo **3.000 VNĐ/h** • Cả ngày: **25.000 VNĐ** • Qua đêm: **30.000 VNĐ** • Thuê bao tháng: **150.000 VNĐ/tháng**.',
        '🚚 **Xe tải / Bán tải**: Giờ đầu **35.000 VNĐ**, giờ tiếp theo **20.000 VNĐ/h** • Thuê bao tháng: **2.500.000 VNĐ/tháng**.'
      ],
      recommendations: [
        'Quý khách thường xuyên gửi xe nên đăng ký Gói vé tháng tại tab "Quản Lý Phương Tiện" để tiết kiệm đến 50% chi phí.',
        'Cổng thanh toán tự động hỗ trợ quét mã VietQR/Napas mở Barrier tức thì.'
      ],
      stats: {
        giaOtoGioDau: '20.000 VNĐ',
        giaXeMayGioDau: '5.000 VNĐ',
        veThangOto: '1.500.000 VNĐ/tháng'
      },
      source: 'SmartPark Pricing Service'
    };
  }

  // 4. HƯỚNG DẪN ĐẶT CHỖ, LỊCH SỬ & QUẢN LÝ PHƯƠNG TIỆN
  if (
    q.includes('đặt chỗ') ||
    q.includes('hướng dẫn') ||
    q.includes('lịch sử') ||
    q.includes('cách gửi') ||
    q.includes('thẻ') ||
    q.includes('đăng ký')
  ) {
    const answer = 'Để đặt chỗ trước, quý khách vào tab "Đặt Chỗ Trước", chọn phân khu mong muốn (Khu A, B hoặc C), nhập biển số và khung giờ đến. Khi đến cổng, camera AI sẽ tự động đối soát biển số và mở barie đón quý khách vào đúng vị trí đã đặt.';

    return {
      topic: 'Hướng Dẫn Dịch Vụ Khách Hàng',
      intent: 'CUSTOMER_SERVICE_GUIDE',
      answer,
      summary: 'Quy trình gửi xe và đặt chỗ tự động 100% bằng công nghệ AI.',
      details: [
        '1️⃣ **Đặt chỗ trước**: Chọn tab "Đặt Chỗ Trước" trên menu để xem sơ đồ 2D và giữ chỗ đẹp.',
        '2️⃣ **Vào bãi đỗ**: Tiến vào cổng, hệ thống Camera AI ANPR tự động đọc biển số và mở Barrier trong 2 giây.',
        '3️⃣ **Thanh toán & Xuất bãi**: Quét mã QR thanh toán động tại bốt ra hoặc sử dụng vé tháng tự động.',
        '4️⃣ **Tra cứu lịch sử**: Xem lại chi tiết thời gian vào/ra và hóa đơn tại tab "Lịch Sử Gửi Xe".'
      ],
      recommendations: [
        'Quý khách có thể kiểm tra danh sách phương tiện cá nhân tại phần thông tin tài khoản.',
        'Khi gặp sự cố tại cổng, quý khách bấm nút Trợ giúp tại bốt để nhân viên hỗ trợ ngay lập tức.'
      ],
      stats: {
        thoiGianMoBarrier: '< 2 Giây',
        phuongThucThanhToan: 'VietQR / Napas / Thẻ'
      },
      source: 'SmartPark Customer Assistance'
    };
  }

  // 5. PHẢN HỒI CHUNG CHO KHÁCH HÀNG
  const defaultCustomerAnswer = 'Xin chào quý khách! Tôi là Trợ lý AI Khách hàng của bãi xe SmartPark. Quý khách có thể hỏi tôi về: Bãi xe hiện còn bao nhiêu chỗ trống?, Bảng giá gửi xe chi tiết thế nào?, hoặc Hướng dẫn đặt chỗ trước & gửi xe.';

  return {
    topic: 'Trợ Lý AI Dịch Vụ Khách Hàng - SmartPark',
    intent: 'CUSTOMER_GENERAL',
    answer: defaultCustomerAnswer,
    summary: 'Trợ lý AI sẵn sàng hỗ trợ quý khách tra cứu thông tin bãi đỗ xe và dịch vụ cá nhân 24/7.',
    details: [
      '🅿️ **Tình trạng chỗ trống**: Tra cứu số chỗ trống xe ô tô và xe máy theo thời gian thực.',
      '💰 **Bảng giá gửi xe**: Tra cứu chi tiết giá vé theo giờ, theo ngày, qua đêm và thuê bao tháng.',
      '🎫 **Dịch vụ cá nhân**: Hướng dẫn thủ tục đặt chỗ trước, quản lý phương tiện và xem lịch sử gửi xe.'
    ],
    recommendations: [
      'Bấm vào các nút câu hỏi gợi ý nhanh bên trên hoặc nhập câu hỏi trực tiếp!'
    ],
    stats: {
      trangThai: 'Sẵn sàng 24/7',
      doiTuong: 'Khách hàng & Cư dân'
    },
    source: 'SmartPark Customer AI Assistant'
  };
};

/**
 * Xử lý yêu cầu dành riêng cho QUẢN TRỊ VIÊN (Admin)
 * - Thống kê doanh thu, dòng tiền, phân bổ thanh toán
 * - Dự báo mật độ lấp đầy trong 24 giờ tới, phân tích cao điểm
 * - Đánh giá hiệu suất vận hành & đề xuất phương án bố trí nhân sự ca trực
 */
const processAdminQuery = async (prompt, user = null) => {
  const db = readDb();
  const q = (prompt || '').toLowerCase().trim();
  const adminId = user?.id || user?.taiKhoan || 'ADMIN';
  const userRole = (user?.vaiTro || user?.role || 'ADMIN').toUpperCase();

  // PHÂN LUỒNG: Nếu người dùng là KHÁCH HÀNG -> Áp dụng luồng nghiệp vụ & bảo mật Khách hàng
  if (userRole === 'KHACH_HANG' || userRole === 'CUSTOMER') {
    const customerResult = processCustomerQuery(prompt, db);
    logAssistantInteraction(adminId, userRole, prompt, customerResult.answer, customerResult.intent);
    return customerResult;
  }

  // TỪ CHỐI TUYỆT ĐỐI NẾU LÀ BẢO VỆ
  if (userRole === 'BAO_VE' || userRole === 'OPERATOR') {
    return {
      topic: 'Truy Cập Bị Từ Chối',
      intent: 'FORBIDDEN_OPERATOR',
      answer: 'Nhân viên bảo vệ không được phép sử dụng Trợ lý AI để đảm bảo tập trung tối đa thao tác tại cổng vào/ra!',
      summary: 'Quyền truy cập bị giới hạn theo quy định phân quyền hệ thống.',
      details: [
        'Nhân viên bảo vệ sử dụng màn hình chuyên biệt "Giám sát Cổng Vào/Ra" để xử lý phương tiện.'
      ],
      recommendations: [],
      stats: { vaiTro: 'BAO_VE', trangThai: 'Chặn truy cập' }
    };
  }

  // ========================================================
  // QUYỀN QUẢN TRỊ VIÊN (ADMIN)
  // ========================================================
  const revenueReport = getRevenueReport();
  const occupancyForecast = getOccupancyForecast();
  const staffingRecommendation = getStaffingRecommendation();

  // Phân tích khung giờ cao điểm & Dự báo mật độ 24 giờ tới
  if (
    q.includes('khung giờ') ||
    q.includes('giờ nào') ||
    q.includes('cao điểm') ||
    q.includes('đông xe') ||
    q.includes('thời gian đông') ||
    q.includes('lưu lượng') ||
    q.includes('mật độ') ||
    q.includes('dự báo')
  ) {
    const forecast = occupancyForecast;
    const { peakSummary, tyLeLapDayHienTai, soChoDangDo, soChoTrong } = forecast;

    const answerText = `Khung giờ đông xe nhất trong ngày là ${peakSummary.peakHourString} (đạt mật độ ${peakSummary.peakRate}% công suất). Ngoài ra có khung giờ cao điểm sáng lúc ${peakSummary.secondaryPeakHourString} (~${peakSummary.secondaryPeakRate}%). Mật độ lấp đầy dự kiến trong 24 giờ tới dao động từ 25% (đêm) đến 92% (cao điểm tối). Hiện tại bãi đang có ${soChoDangDo} xe đang đỗ (${tyLeLapDayHienTai}% công suất).`;

    const result = {
      topic: 'Phân Tích Khung Giờ Cao Điểm & Dự Báo Mật Độ',
      intent: 'PEAK_HOURS',
      answer: answerText,
      summary: peakSummary.summaryText,
      details: [
        `🕒 **Khung giờ cao điểm tối (${peakSummary.peakHourString})**: Mật độ xe đạt **${peakSummary.peakRate}%**, tập trung phương tiện ô tô và xe máy về bãi (chiếm ~65% tổng lưu lượng trong ngày).`,
        `🕒 **Khung giờ cao điểm sáng (${peakSummary.secondaryPeakHourString})**: Mật độ xe đạt **${peakSummary.secondaryPeakRate}%**, chủ yếu là xe công sở và học sinh/sinh viên.`,
        `📊 **Tình trạng thực tế hiện tại**: Bãi đang đỗ **${soChoDangDo} xe** (${tyLeLapDayHienTai}% công suất), còn trống **${soChoTrong} vị trí**.`
      ],
      recommendations: [
        'Mở đồng thời cả 2 làn Barrier Cổng Vào trong khung giờ 17:30 - 19:30 để tránh ùn ứ lối rẽ.',
        'Bật chế độ AI Auto-Gate với độ tin cậy >= 70% để phương tiện lưu thông tự động không cần dừng chạm.',
        'Dành riêng luồng Khu B cho xe ô tô điện và khách VIP.'
      ],
      stats: {
        khungGioCaoDiem: peakSummary.peakHourString,
        matDoDinhDiem: `${peakSummary.peakRate}%`,
        tyLeLapDayHienTai: `${tyLeLapDayHienTai}%`,
        soChoTrong
      },
      source: 'Local BI Analytics Engine'
    };

    logAssistantInteraction(adminId, userRole, prompt, answerText, 'PEAK_HOURS');
    return result;
  }

  // Báo cáo doanh thu & Dòng tiền thời gian thực theo từng ngày
  if (
    q.includes('doanh thu') ||
    q.includes('tiền') ||
    q.includes('báo cáo') ||
    q.includes('thu nhập') ||
    q.includes('tài chính') ||
    q.includes('thanh toán') ||
    q.includes('phương thức') ||
    q.includes('thời gian thực') ||
    q.includes('theo ngày')
  ) {
    const rev = revenueReport;
    const {
      doanhThuHomNay,
      soLuotHomNay,
      breakdownHomNay,
      doanhThuHomQua,
      soLuotHomQua,
      tangTruongPhanTram,
      danhSachNgay,
      tongDoanhThuLuyKe,
      tongLuotLuyKe,
      xeOtoDangDo,
      xeMayDangDo,
      thoiGianCapNhat,
      ngayBaoCao
    } = rev;

    const [yyyy, mm, dd] = (ngayBaoCao || '').split('-');
    const ngayHienThi = dd && mm ? `${dd}/${mm}/${yyyy}` : ngayBaoCao;

    // Chuẩn bị danh sách 5 ngày gần nhất
    const topDays = (danhSachNgay || []).slice(0, 5);
    const topDaysFormatted = topDays.map(d => {
      const label = d.nhan && d.nhan !== d.ngayFormat ? `${d.nhan} (${d.ngayFormat})` : d.ngayFormat;
      return `• **${label}**: **${d.tongTien.toLocaleString('vi-VN')} VNĐ** (${d.soLuot} lượt xe)`;
    });

    const answerText = `Doanh thu thực nhận hôm nay (${ngayHienThi}) đạt ${doanhThuHomNay.toLocaleString('vi-VN')} VNĐ từ ${soLuotHomNay} lượt xe đã xuất bãi (thời gian thực lúc ${thoiGianCapNhat}). So với hôm qua (${doanhThuHomQua.toLocaleString('vi-VN')} VNĐ, ${soLuotHomQua} lượt), doanh thu ${tangTruongPhanTram >= 0 ? `tăng trưởng +${tangTruongPhanTram}%` : `giảm ${tangTruongPhanTram}%`}. Phương thức thanh toán hôm nay: Chuyển khoản QR đạt ${breakdownHomNay.QR_CODE.soTien.toLocaleString('vi-VN')} VNĐ (${breakdownHomNay.QR_CODE.tyLe}%), Tiền mặt đạt ${breakdownHomNay.TIEN_MAT.soTien.toLocaleString('vi-VN')} VNĐ (${breakdownHomNay.TIEN_MAT.tyLe}%). Tổng doanh thu tích lũy toàn hệ thống (All-time) đạt ${tongDoanhThuLuyKe.toLocaleString('vi-VN')} VNĐ từ ${tongLuotLuyKe} lượt xe.`;

    const result = {
      topic: 'BÁO CÁO DOANH THU THỜI GIAN THỰC & THEO TỪNG NGÀY',
      intent: 'REVENUE',
      answer: answerText,
      summary: `Doanh thu thực nhận hôm nay (${ngayHienThi}) đạt ${doanhThuHomNay.toLocaleString('vi-VN')} VNĐ từ ${soLuotHomNay} lượt xe hoàn tất xuất bãi (thời gian thực).`,
      details: [
        `⏱️ **Cập nhật thời gian thực**: Lúc **${thoiGianCapNhat}** — Ngày **${ngayHienThi}**.`,
        `💰 **Doanh thu hôm nay (${ngayHienThi})**: **${doanhThuHomNay.toLocaleString('vi-VN')} VNĐ** (từ **${soLuotHomNay} lượt xe** đã thanh toán xuất bãi).`,
        `📱 **Thanh toán chuyển khoản QR (VietQR / Napas) hôm nay**: **${breakdownHomNay.QR_CODE.soTien.toLocaleString('vi-VN')} VNĐ** (${breakdownHomNay.QR_CODE.soLuot} lượt, chiếm **${breakdownHomNay.QR_CODE.tyLe}%**).`,
        `💵 **Tiền mặt tại bốt thu phí hôm nay**: **${breakdownHomNay.TIEN_MAT.soTien.toLocaleString('vi-VN')} VNĐ** (${breakdownHomNay.TIEN_MAT.soLuot} lượt, chiếm **${breakdownHomNay.TIEN_MAT.tyLe}%**).`,
        `📈 **So sánh với hôm qua**: Doanh thu hôm qua đạt **${doanhThuHomQua.toLocaleString('vi-VN')} VNĐ** (${soLuotHomQua} lượt xe) — ${tangTruongPhanTram >= 0 ? `Tăng trưởng **+${tangTruongPhanTram}%**` : `Giảm **${tangTruongPhanTram}%**`}.`,
        `📅 **Thống kê doanh thu theo từng ngày gần nhất**:\n${topDaysFormatted.join('\n')}`,
        `🏛️ **Tổng doanh thu tích lũy toàn hệ thống (All-time)**: **${tongDoanhThuLuyKe.toLocaleString('vi-VN')} VNĐ** (tổng tích lũy toàn bộ **${tongLuotLuyKe} lượt xe** từ trước đến nay).`,
        `🚗 **Xe đang đỗ trong bãi (thời gian thực)**: ${xeOtoDangDo} ô tô, ${xeMayDangDo} xe máy.`
      ],
      recommendations: [
        'Hệ thống tự động đồng bộ doanh thu tức thời sau mỗi giao dịch xuất bãi thành công tại barie cổng ra.',
        'Tỷ lệ thanh toán không tiền mặt hôm nay đạt mức cao, giúp giảm thiểu thời gian xử lý thủ công tại trạm bốt.'
      ],
      stats: {
        doanhThuHomNay: `${doanhThuHomNay.toLocaleString('vi-VN')} VNĐ`,
        soLuotHomNay: `${soLuotHomNay} lượt`,
        doanhThuHomQua: `${doanhThuHomQua.toLocaleString('vi-VN')} VNĐ`,
        tongDoanhThuLuyKe: `${tongDoanhThuLuyKe.toLocaleString('vi-VN')} VNĐ`,
        thoiGianCapNhat
      },
      paymentBreakdown: breakdownHomNay,
      source: 'SmartPark Realtime Financial Engine'
    };

    logAssistantInteraction(adminId, userRole, prompt, answerText, 'REVENUE');
    return result;
  }

  // Đề xuất bố trí nhân sự ca trực & Đánh giá hiệu suất
  if (
    q.includes('nhân sự') ||
    q.includes('nhân viên') ||
    q.includes('ca trực') ||
    q.includes('ca chiều') ||
    q.includes('ca tối') ||
    q.includes('ca sáng') ||
    q.includes('ca đêm') ||
    q.includes('bố trí') ||
    q.includes('bao nhiêu người') ||
    q.includes('hiệu suất')
  ) {
    const staffing = staffingRecommendation;

    const answerText = `${staffing.summary} Tổng định mức nhân sự trong ngày là ${staffing.tongNhanSuNgay} người, nhờ hệ thống AI OCR tự động hóa 98.5% lượt xe vào/ra.`;

    const result = {
      topic: 'Đề Xuất Bố Trí Nhân Sự & Hiệu Suất Vận Hành',
      intent: 'STAFFING',
      answer: answerText,
      summary: staffing.summary,
      details: staffing.shifts.map(s => `👨‍💼 **${s.caTrực}** (${s.matDoDuBao}): Bố trí **${s.soLuongNhanVien} nhân viên** — ${s.nhiemVuChinh}`),
      recommendations: staffing.recommendations,
      stats: {
        tongNhanSu: `${staffing.tongNhanSuNgay} Nhân sự/ngày`,
        caChieuToi: '2 Nhân viên',
        mucDoTuDongHoa: staffing.mucDoTuDongHoa
      },
      shifts: staffing.shifts,
      source: 'Local BI Analytics Engine'
    };

    logAssistantInteraction(adminId, userRole, prompt, answerText, 'STAFFING');
    return result;
  }

  // Phản hồi ngoại lệ quản trị
  const defaultAnswer = 'Câu hỏi nằm ngoài phạm vi nghiệp vụ quản lý bãi đỗ xe hoặc chưa rõ nghĩa. Quản trị viên vui lòng tra cứu các chủ đề hợp lệ: Doanh thu bãi xe, Khung giờ cao điểm, Phương thức thanh toán, hoặc Đề xuất bố trí ca trực.';

  const generalResult = {
    topic: 'Trợ Lý AI Hỗ Trợ Quản Trị - SmartPark',
    intent: 'GENERAL',
    answer: defaultAnswer,
    summary: 'Hệ thống gợi ý Quản trị viên tra cứu các chủ đề hợp lệ: Doanh thu bãi xe, Khung giờ cao điểm, hoặc Bố trí ca trực.',
    details: [
      '🕒 **Dự báo giờ cao điểm**: Phân tích các khung giờ bãi xe đạt mật độ cao nhất trong ngày.',
      '💰 **Báo cáo doanh thu & dòng tiền**: Thống kê tổng tiền và phân bổ phương thức thanh toán (QR, tiền mặt, thẻ tháng).',
      '👥 **Đề xuất điều phối nhân sự**: Gợi ý định mức nhân sự ca sáng, ca chiều/tối và ca đêm theo rule-based.'
    ],
    recommendations: [
      'Chọn các nút gợi ý câu hỏi nhanh bên trên hoặc nhập nội dung câu hỏi về doanh thu, mật độ xe, ca trực!'
    ],
    stats: {
      trangThai: 'Hoạt động ổn định',
      vaiTroHoTro: 'Dành riêng cho Quản trị viên'
    },
    source: 'Local BI Analytics Engine'
  };

  logAssistantInteraction(adminId, userRole, prompt, defaultAnswer, 'GENERAL');
  return generalResult;
};

module.exports = {
  processAdminQuery,
  processCustomerQuery,
  logAssistantInteraction
};
