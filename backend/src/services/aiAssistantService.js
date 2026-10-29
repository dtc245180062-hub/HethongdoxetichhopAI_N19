const { getRevenueReport } = require('./revenueService');
const { getOccupancyForecast } = require('./forecastService');
const { getStaffingRecommendation } = require('./staffingService');
const { readDb, writeDb } = require('../utils/db');

// Nạp Google GenAI SDK an toàn (nếu đã cài đặt)
let GoogleGenAI = null;
try {
  GoogleGenAI = require('@google/genai').GoogleGenAI;
} catch (e) {
  // @google/genai chưa được cài đặt, hệ thống sẽ sử dụng Local Rule-based Engine
}

/**
 * Ghi log câu hỏi và phản hồi của Trợ lý AI Quản trị
 * Lưu vào bảng admin_assistant_logs trong CSDL
 */
const logAssistantInteraction = (adminId, question, answer, intent) => {
  try {
    const db = readDb();
    if (!db.admin_assistant_logs) {
      db.admin_assistant_logs = [];
    }

    const logEntry = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      admin_id: adminId || 'ADMIN',
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
    console.error('Không thể ghi log admin_assistant_logs:', err.message);
  }
};

/**
 * Gọi Google Gemini 2.5 Flash để sinh câu trả lời tự nhiên (RAG)
 * Dựa trên số liệu Ground Truth từ hệ thống bãi xe thực tế
 */
const callGeminiLLM = async (prompt, groundTruth) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || !GoogleGenAI) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = `Bạn là Trợ lý AI Quản trị (Admin AI Assistant) chuyên nghiệp của hệ thống Quản lý Bãi đỗ xe thông minh DoXeAI.
DƯỚI ĐÂY LÀ DỮ LIỆU THỰC TẾ (GROUND TRUTH) ĐƯỢC TRUY XUẤT TỪ CƠ SỞ DỮ LIỆU BÃI XE HIỆN TẠI:
- Báo cáo doanh thu: ${JSON.stringify(groundTruth.revenue || {})}
- Dự báo mật độ & Khung giờ cao điểm: ${JSON.stringify(groundTruth.forecast?.peakSummary || {})}
- Đề xuất nhân sự ca trực: ${JSON.stringify(groundTruth.staffing?.shifts || [])}
- Thời điểm hiện tại: ${new Date().toLocaleString('vi-VN')}

QUY TẮC RÀNG BUỘC NGHIÊM NGẶT:
1. Luôn sử dụng đúng các con số thực tế ở trên (doanh thu, số xe, tỷ lệ lấp đầy, khung giờ cao điểm), tuyệt đối không tự bịa đặt số liệu tài chính hay lưu lượng.
2. Trả lời bằng tiếng Việt chuyên nghiệp, súc tích, văn phong tự nhiên và đưa ra các đề xuất điều hành sắc bén cho Quản trị viên.
3. Luôn trả về định dạng JSON thuần túy (không kèm markdown code fence) theo đúng cấu trúc:
{
  "topic": "Tiêu đề ngắn gọn về Use Case",
  "intent": "PEAK_HOURS" | "REVENUE" | "STAFFING" | "GENERAL",
  "answer": "Câu trả lời tóm tắt ngắn dạng văn bản (2-3 câu)",
  "summary": "Tóm tắt điểm nhấn chính",
  "details": ["Chi tiết 1", "Chi tiết 2", ...],
  "recommendations": ["Đề xuất điều hành 1", "Đề xuất điều hành 2", ...],
  "stats": { "key": "value" }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text ? response.text.trim() : '';
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.warn('⚠️ [Gemini API Warning]:', err.message, '-> Tự động fallback sang Local Rule-based Engine.');
    return null;
  }
};

/**
 * Xử lý câu hỏi của Quản trị viên (Admin AI Assistant)
 * Kiến trúc Hybrid RAG:
 * 1. Ưu tiên Google Gemini 2.5 Flash nếu đã cấu hình GEMINI_API_KEY
 * 2. Tự động fallback 100% sang Local Service Engine nếu offline hoặc chưa có API key
 */
const processAdminQuery = async (prompt, user = null) => {
  const q = (prompt || '').toLowerCase().trim();
  const adminId = user?.id || user?.taiKhoan || 'ADMIN';

  // Lấy dữ liệu thực tế từ 3 service chuyên biệt
  const revenueReport = getRevenueReport();
  const occupancyForecast = getOccupancyForecast();
  const staffingRecommendation = getStaffingRecommendation();

  // 1. Thử gọi Gemini AI trước
  const geminiResult = await callGeminiLLM(prompt, {
    revenue: revenueReport,
    forecast: occupancyForecast,
    staffing: staffingRecommendation
  });

  if (geminiResult && geminiResult.answer) {
    logAssistantInteraction(adminId, prompt, geminiResult.answer, geminiResult.intent || 'GEMINI_AI');
    return {
      ...geminiResult,
      source: 'Google Gemini 2.5 Flash (RAG Live)'
    };
  }

  // ========================================================
  // 2. Fallback sang Local Service Engine (Zero-Latency / Offline)
  // ========================================================

  // Phân tích khung giờ cao điểm (Peak Hours Analysis)
  if (
    q.includes('khung giờ') ||
    q.includes('giờ nào') ||
    q.includes('cao điểm') ||
    q.includes('đông xe') ||
    q.includes('thời gian đông') ||
    q.includes('lưu lượng') ||
    q.includes('mật độ')
  ) {
    const forecast = occupancyForecast;
    const { peakSummary, tyLeLapDayHienTai, soChoDangDo, soChoTrong } = forecast;

    const answerText = `Khung giờ đông xe nhất trong ngày là ${peakSummary.peakHourString} (đạt mật độ ${peakSummary.peakRate}% công suất). Ngoài ra có khung giờ cao điểm sáng lúc ${peakSummary.secondaryPeakHourString} (~${peakSummary.secondaryPeakRate}%). Hiện tại bãi đang có ${soChoDangDo} xe đang đỗ (${tyLeLapDayHienTai}% công suất).`;

    const result = {
      topic: 'Phân Tích Khung Giờ Cao Điểm',
      intent: 'PEAK_HOURS',
      answer: answerText,
      summary: peakSummary.summaryText,
      details: [
        `🕒 **Khung giờ cao điểm tối (${peakSummary.peakHourString})**: Mật độ xe đạt **${peakSummary.peakRate}%**, tập trung phương tiện ô tô và xe máy về bãi (chiếm ~65% tổng lượt vào trong ngày).`,
        `🕒 **Khung giờ cao điểm sáng (${peakSummary.secondaryPeakHourString})**: Mật độ xe đạt **${peakSummary.secondaryPeakRate}%**, chủ yếu là xe công sở và học sinh/sinh viên.`,
        `📊 **Tình trạng thực tế hiện tại**: Bãi đang đỗ **${soChoDangDo} xe** (${tyLeLapDayHienTai}% công suất), còn trống **${soChoTrong} vị trí**.`
      ],
      recommendations: [
        'Mở đồng thời cả 2 làn Barrier Cổng Vào trong khung giờ 17:30 - 19:30 để tránh ùn ứ.',
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

    logAssistantInteraction(adminId, prompt, answerText, 'PEAK_HOURS');
    return result;
  }

  // Báo cáo doanh thu & Hiệu suất (Revenue & Payments)
  if (
    q.includes('doanh thu') ||
    q.includes('tiền') ||
    q.includes('báo cáo') ||
    q.includes('thu nhập') ||
    q.includes('tài chính') ||
    q.includes('thanh toán') ||
    q.includes('phương thức')
  ) {
    const revenueData = revenueReport;
    const { tongDoanhThu, soLuotDaRa, breakdown, xeOtoDangDo, xeMayDangDo, tyLeThanhToanKhongTienMat } = revenueData;

    const answerText = `Tổng doanh thu thực nhận hôm nay đạt ${tongDoanhThu.toLocaleString('vi-VN')} VNĐ từ ${soLuotDaRa} lượt thanh toán. Phân bổ phương thức thanh toán: Chuyển khoản QR đạt ${breakdown.QR_CODE.tyLe}% (${breakdown.QR_CODE.soTien.toLocaleString('vi-VN')} VNĐ), Tiền mặt chiếm ${breakdown.TIEN_MAT.tyLe}%, Thẻ tháng/cư dân chiếm ${breakdown.THE_THANG.tyLe}%. Tỷ lệ thanh toán không tiền mặt đạt ${tyLeThanhToanKhongTienMat}.`;

    const result = {
      topic: 'Báo Cáo Doanh Thu & Hiệu Suất Vận Hành',
      intent: 'REVENUE',
      answer: answerText,
      summary: `Tổng doanh thu thực nhận hôm nay đạt ${tongDoanhThu.toLocaleString('vi-VN')} VNĐ từ ${soLuotDaRa} lượt thanh toán hoàn tất.`,
      details: [
        `💰 **Tổng doanh thu hôm nay**: **${tongDoanhThu.toLocaleString('vi-VN')} VNĐ** (từ ${soLuotDaRa} lượt xe đã ra).`,
        `📱 **Thanh toán chuyển khoản QR (VietQR / Napas)**: **${breakdown.QR_CODE.soTien.toLocaleString('vi-VN')} VNĐ** (${breakdown.QR_CODE.soLuot} lượt, chiếm **${breakdown.QR_CODE.tyLe}%**).`,
        `💵 **Tiền mặt bốt thu phí**: **${breakdown.TIEN_MAT.soTien.toLocaleString('vi-VN')} VNĐ** (${breakdown.TIEN_MAT.soLuot} lượt, chiếm **${breakdown.TIEN_MAT.tyLe}%**).`,
        `🎫 **Thẻ tháng / Thuê bao cư dân**: **${breakdown.THE_THANG.soTien.toLocaleString('vi-VN')} VNĐ** (${breakdown.THE_THANG.soLuot} lượt, chiếm **${breakdown.THE_THANG.tyLe}%**).`,
        `🚗 **Xe đang đỗ trong bãi**: ${xeOtoDangDo} ô tô, ${xeMayDangDo} xe máy.`
      ],
      recommendations: [
        'Khuyến khích khách hàng quét mã VietQR động tại cổng ra để tối ưu thời gian mở Barrier < 3 giây.',
        'Đề xuất phát hành thêm gói thuê bao tháng cho cư dân Khu A và Khu C để ổn định dòng tiền định kỳ.'
      ],
      stats: {
        tongDoanhThu: `${tongDoanhThu.toLocaleString('vi-VN')} VNĐ`,
        soLuotDaRa,
        tyLeKhongTienMat: tyLeThanhToanKhongTienMat,
        doanhThuQR: `${breakdown.QR_CODE.soTien.toLocaleString('vi-VN')} VNĐ`
      },
      paymentBreakdown: breakdown,
      source: 'Local BI Analytics Engine'
    };

    logAssistantInteraction(adminId, prompt, answerText, 'REVENUE');
    return result;
  }

  // Đề xuất bố trí nhân sự (Smart Staffing)
  if (
    q.includes('nhân sự') ||
    q.includes('nhân viên') ||
    q.includes('ca trực') ||
    q.includes('ca chiều') ||
    q.includes('ca tối') ||
    q.includes('ca sáng') ||
    q.includes('ca đêm') ||
    q.includes('bố trí') ||
    q.includes('bao nhiêu người')
  ) {
    const staffing = staffingRecommendation;

    const answerText = `${staffing.summary} Tổng định mức nhân sự trong ngày là ${staffing.tongNhanSuNgay} người, nhờ hệ thống AI OCR tự động hóa 98.5% lượt xe vào/ra.`;

    const result = {
      topic: 'Đề Xuất Điều Phối & Bố Trí Nhân Sự',
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

    logAssistantInteraction(adminId, prompt, answerText, 'STAFFING');
    return result;
  }

  // Phản hồi ngoại lệ / ngoài phạm vi nghiệp vụ (Theo tài liệu đặc tả)
  const defaultAnswer = 'Câu hỏi nằm ngoài phạm vi nghiệp vụ quản lý bãi đỗ xe hoặc chưa rõ nghĩa. Quản trị viên vui lòng tra cứu các chủ đề hợp lệ: Doanh thu bãi xe, Khung giờ cao điểm, Phương thức thanh toán, hoặc Đề xuất bố trí ca trực.';

  const generalResult = {
    topic: 'Trợ Lý AI Hỗ Trợ Quản Trị - DoXeAI',
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

  logAssistantInteraction(adminId, prompt, defaultAnswer, 'GENERAL');
  return generalResult;
};

module.exports = {
  processAdminQuery,
  logAssistantInteraction,
  callGeminiLLM
};
