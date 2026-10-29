const { readDb } = require('../utils/db');

/**
 * Gọi mô hình ngôn ngữ lớn (LLM - Gemini / OpenAI) nếu người dùng có cấu hình API Key
 * Tự động nhúng toàn bộ cơ sở tri thức & dữ liệu thời gian thực của bãi xe (RAG Context).
 */
const callExternalLLM = async (prompt, context) => {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return null;
  }

  const systemPrompt = `Bạn là "DoXeAI Assistant" - Trợ lý Trí tuệ Nhân tạo thông minh, chuyên nghiệp, nhiệt tình và ân cần của Hệ thống Quản lý Bãi đỗ xe thông minh DoXeAI.
Bạn có khả năng trò chuyện tự nhiên như một con người thực sự, giải đáp tất cả các thắc mắc của khách hàng, tài xế, cư dân cũng như nhân viên quản trị.

THÔNG TIN THỜI GIAN THỰC CỦA BÃI ĐỖ XE DOXEAI:
- Sức chứa toàn bãi: ${context.tongSoCho} vị trí. Hiện đang có ${context.soChoDangDo} xe đỗ (Tỷ lệ lấp đầy: ${context.tyLeLapDay}%), còn trống ${context.soChoTrong} chỗ.
- Phân khu:
  + Khu A: Ô tô (4-7 chỗ), Tầng 1 gần lối vào.
  + Khu B: Xe VIP, ô tô điện & Trạm sạc xe điện thông minh (có 6 trụ sạc AC 11kW và DC 60kW nhanh).
  + Khu C: Xe máy & xe tay ga, lối vào ram dốc Hầm B1.
- Bảng giá dịch vụ:
  + Xe máy: 5.000 VNĐ / lượt (gửi qua đêm: 30.000 VNĐ). Vé tháng: 120.000 VNĐ / tháng.
  + Ô tô 4-7 chỗ: 20.000 VNĐ / giờ đầu (10.000 VNĐ / giờ tiếp theo, gửi qua đêm: 120.000 VNĐ). Vé tháng: 1.200.000 VNĐ / tháng.
  + Ô tô Tải / Bán tải: 35.000 VNĐ / giờ đầu (20.000 VNĐ / giờ tiếp theo, gửi qua đêm: 220.000 VNĐ).
- Phương thức thanh toán: 100% không chạm qua mã VietQR động / Napas247 tại cổng ra hoặc trên Cổng Khách hàng, quẹt thẻ thanh toán, hoặc trả tiền mặt tại bốt.
- Thời gian hoạt động: Mở cửa 24/7 xuyên suốt ngày đêm, cả Lễ và Tết.
- Xử lý mất thẻ xe / quên vé: Đến bốt kiểm soát cổng ra, xuất trình Cavet xe hoặc CCCD. Camera AI ANPR sẽ tự đối soát biển số và ảnh chụp lúc xe vào để mở barie trong vòng 1 phút.
- An ninh & PCCC: 100% camera AI 4K nhận diện biển số, cảm biến báo cháy nhiệt độ cao, hệ thống máy bơm thoát nước chống ngập tự động cho hầm xe.
- Hotline hỗ trợ khẩn cấp: 0967.445.566 (Trưởng ca trực bảo vệ).

NGUYÊN TẮC TRẢ LỜI:
1. Xưng hô lịch thiệp, thân thiện, trả lời bằng tiếng Việt tự nhiên, ấm áp và rõ ràng.
2. Trả lời chính xác dựa trên thông tin bãi xe ở trên.
3. Nếu người dùng hỏi câu hỏi ngoài đời sống (thời tiết, hỏi thăm, trò chuyện, câu hỏi tri thức chung), bạn vẫn trả lời thông minh, chu đáo như một AI toàn năng, sau đó khéo léo gắn kết hoặc chúc người dùng lái xe an toàn.
4. Trả về câu trả lời định dạng JSON hợp lệ theo cấu trúc:
{
  "topic": "Tiêu đề chủ đề ngắn gọn (Ví dụ: Tra Cứu Biển Số / Bảng Giá Vé / Trợ Lý AI)",
  "summary": "Câu trả lời trực tiếp, đầy đủ và thân thiện cho khách hàng",
  "details": ["Chi tiết 1 (nếu có)", "Chi tiết 2 (nếu có)"],
  "recommendations": ["Lời khuyên hoặc hướng dẫn tiếp theo hữu ích"]
}`;

  // 1. Thử gọi Google Gemini API
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nCÂU HỎI CỦA NGƯỜI DÙNG: "${prompt}"` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          // Thử parse JSON từ phản hồi của Gemini
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              return {
                topic: parsed.topic || 'Trợ Lý DoXeAI (Gemini AI)',
                summary: parsed.summary || text,
                details: parsed.details || [],
                recommendations: parsed.recommendations || [],
                engine: 'Google Gemini 1.5 Flash'
              };
            } catch (e) {}
          }
          return {
            topic: 'Trợ Lý DoXeAI (Gemini AI)',
            summary: text,
            details: [],
            recommendations: ['Bạn có thể đặt thêm bất kỳ câu hỏi nào về dịch vụ bãi xe!'],
            engine: 'Google Gemini 1.5 Flash'
          };
        }
      }
    } catch (err) {
      console.warn('⚠️ [Gemini API Timeout/Error]:', err.message);
    }
  }

  // 2. Thử gọi OpenAI API nếu có OPENAI_API_KEY
  if (openaiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content || '';
        if (text) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              return {
                topic: parsed.topic || 'Trợ Lý DoXeAI (GPT-4o)',
                summary: parsed.summary || text,
                details: parsed.details || [],
                recommendations: parsed.recommendations || [],
                engine: 'OpenAI GPT-4o-mini'
              };
            } catch (e) {}
          }
          return {
            topic: 'Trợ Lý DoXeAI (GPT-4o)',
            summary: text,
            details: [],
            recommendations: [],
            engine: 'OpenAI GPT-4o-mini'
          };
        }
      }
    } catch (err) {
      console.warn('⚠️ [OpenAI API Timeout/Error]:', err.message);
    }
  }

  return null;
};

/**
 * Bộ não xử lý ngôn ngữ tự nhiên thông minh nội bộ (High-Intelligence Local NLP Engine)
 * Hoạt động 100% offline, hiểu đa dạng ý định câu hỏi của khách hàng, quản trị viên và tài xế.
 */
const localSmartNLP = (prompt, context) => {
  const { db, tongSoCho, soChoDangDo, soChoTrong, tyLeLapDay, tongDoanhThu, xeOtoDangDo, xeMayDangDo } = context;
  const viTriList = db.ViTri || [];
  const luotList = db.LuotVaoRa || [];
  const khuVucList = db.KhuVuc || [];

  const q = (prompt || '').toLowerCase().trim();

  // =========================================================================
  // 1. TÌM KIẾM XE THEO BIỂN SỐ TRONG BÃI (FIND MY CAR)
  // =========================================================================
  const plateMatch = prompt.match(/([0-9]{2}[A-Z][0-9A-Z]?[-. ]?[0-9]{3,5}[.]?[0-9]{0,2})/i);
  if (
    plateMatch &&
    (q.includes('ở đâu') || q.includes('tìm xe') || q.includes('vị trí') || q.includes('đang đỗ') || q.includes('biển') || q.includes('xe của tôi'))
  ) {
    const rawPlate = plateMatch[1].toUpperCase().replace(/[-. ]/g, '');
    
    // Tìm trong danh sách vị trí đang đỗ
    const foundSlot = viTriList.find(v => {
      if (!v.bienSoXe) return false;
      const cleanSlotPlate = v.bienSoXe.toUpperCase().replace(/[-. ]/g, '');
      return cleanSlotPlate.includes(rawPlate) || rawPlate.includes(cleanSlotPlate);
    });

    // Tìm trong danh sách lượt vào ra đang đỗ
    const foundLuot = luotList.find(l => {
      if (l.trangThai !== 'DANG_DO' && l.trangThai !== 'Đang đỗ') return false;
      const cleanLuotPlate = (l.bienSo || '').toUpperCase().replace(/[-. ]/g, '');
      return cleanLuotPlate.includes(rawPlate) || rawPlate.includes(cleanLuotPlate);
    });

    if (foundSlot || foundLuot) {
      const maViTri = foundSlot?.tenViTri || foundSlot?.id || foundLuot?.maViTri || 'Chưa định danh';
      const khuVuc = foundSlot?.maKhuVuc === 'KV-A' ? 'Khu A (Tầng 1 - Ô tô)' : (foundSlot?.maKhuVuc === 'KV-B' ? 'Khu B (VIP & Xe điện)' : 'Khu C (Hầm B1 - Xe máy)');
      const thoiGianVao = foundLuot?.thoiGianVao ? new Date(foundLuot.thoiGianVao).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay';
      const bienSoChuan = foundLuot?.bienSo || foundSlot?.bienSoXe || plateMatch[1].toUpperCase();

      return {
        topic: '🔍 Tra Cứu Vị Trí Phương Tiện Thành Công',
        summary: `Xe mang biển số **${bienSoChuan}** hiện đang đỗ tại ô **${maViTri}** thuộc **${khuVuc}**.`,
        details: [
          `📍 **Vị trí đỗ**: Ô **${maViTri}** (${khuVuc}).`,
          `⏱️ **Thời gian vào bãi**: Ghi nhận lúc **${thoiGianVao}** qua Camera AI ANPR.`,
          `🛡️ **Trạng thái an toàn**: Được bảo vệ và camera AI an ninh giám sát 24/24.`
        ],
        recommendations: [
          'Bạn có thể mở tab "Sơ đồ bãi xe" để xem lộ trình đường đi ngắn nhất đến vị trí ô đỗ.',
          'Khi lấy xe, vui lòng chuẩn bị sẵn mã QR trên Cổng Khách hàng để qua cổng trong 3 giây.'
        ],
        stats: {
          bienSo: bienSoChuan,
          viTri: maViTri,
          khuVuc
        }
      };
    } else {
      return {
        topic: '🔍 Tra Cứu Phương Tiện',
        summary: `Hệ thống chưa tìm thấy xe mang biển số **${plateMatch[1].toUpperCase()}** đang đỗ trong bãi.`,
        details: [
          'Phương tiện có thể chưa vào bãi hoặc đã hoàn tất thủ tục thanh toán và rời đi.',
          'Vui lòng kiểm tra lại độ chính xác của biển số (ví dụ: 30A-999.99 hoặc 23-D1 497.07).'
        ],
        recommendations: [
          'Nếu bạn chắc chắn xe đã vào bãi, vui lòng liên hệ trực tiếp nhân viên trực bốt cổng để tra cứu hình ảnh camera vào lúc gửi.'
        ]
      };
    }
  }

  // =========================================================================
  // 2. CHÀO HỎI, TỰ GIỚI THIỆU & XÃ GIAO ĐỜI THƯỜNG
  // =========================================================================
  if (
    q === 'chào' || q === 'hello' || q === 'hi' || q === 'xin chào' ||
    q.includes('chào bạn') || q.includes('chào em') || q.includes('chào bot') ||
    q.includes('bạn là ai') || q.includes('ai tạo ra bạn') || q.includes('tên gì')
  ) {
    return {
      topic: '👋 Xin Chào Quý Khách!',
      summary: 'Xin chào! Tôi là **DoXeAI Assistant** - Trợ lý Trí tuệ Nhân tạo thông minh của Hệ thống Bãi đỗ xe DoXeAI.',
      details: [
        '🤖 **Khả năng của tôi**: Tôi có thể giải đáp mọi thắc mắc của bạn về giá vé, cách thanh toán, vị trí ô đỗ, trạm sạc xe điện, tìm xe theo biển số, quy trình cứu hộ mất thẻ, và phân tích điều hành bãi xe.',
        `🚗 **Tình trạng hiện tại**: Bãi đang có **${soChoDangDo} xe đang đỗ**, còn trống **${soChoTrong} chỗ** sẵn sàng phục vụ bạn.`
      ],
      recommendations: [
        'Bạn có thể hỏi tôi bất cứ điều gì, ví dụ: "Xe 30A-999.99 đỗ ở đâu?", "Giá gửi ô tô qua đêm?", "Bãi có sạc xe điện không?".'
      ]
    };
  }

  // =========================================================================
  // 3. HỎI VỀ SẠC XE ĐIỆN (VINFAST, TESLA, EV CHARGING)
  // =========================================================================
  if (
    q.includes('xe điện') || q.includes('sạc') || q.includes('vinfast') ||
    q.includes('tesla') || q.includes('trạm sạc') || q.includes('trụ sạc') || q.includes('hết pin')
  ) {
    return {
      topic: '⚡ Dịch Vụ Trạm Sạc Xe Điện Thông Minh (EV)',
      summary: 'Bãi đỗ xe DoXeAI được trang bị hệ thống trạm sạc xe điện hiện đại tiêu chuẩn châu Âu tại **Khu B**.',
      details: [
        '🔌 **Trụ sạc nhanh DC (60kW - 120kW)**: 2 trụ tại Tầng 1 (Khu B) - sạc 30 phút đạt 80% pin (phù hợp VinFast VF8, VF9, Porsche, v.v.).',
        '🔋 **Trụ sạc tiêu chuẩn AC (11kW)**: 4 trụ sạc tại Hầm B1 - phù hợp gửi xe làm việc cả ngày hoặc qua đêm.',
        '💳 **Thanh toán sạc điện**: Tự động tích hợp vào hóa đơn gửi xe khi quét mã QR lúc ra cổng.'
      ],
      recommendations: [
        'Vui lòng di chuyển xe vào Khu B (vị trí B-01 đến B-06) để sử dụng trạm sạc.',
        'Sau khi sạc đầy, hệ thống sẽ gửi thông báo qua Cổng Khách hàng để bạn chủ động chuyển xe, nhường chỗ cho phương tiện khác.'
      ]
    };
  }

  // =========================================================================
  // 4. MẤT THẺ XE / QUÊN VÉ / SỰ CỐ CỔNG BARRIER
  // =========================================================================
  if (
    q.includes('mất thẻ') || q.includes('quên vé') || q.includes('mất vé') ||
    q.includes('không có thẻ') || q.includes('quên thẻ') || q.includes('sự cố') ||
    q.includes('kẹt cổng') || q.includes('không mở')
  ) {
    return {
      topic: '🛡️ Quy Trình Xử Lý Sự Cố & Mất Thẻ Gửi Xe (UC-15)',
      summary: 'Đừng lo lắng! Nhờ hệ thống Camera AI ANPR lưu trữ hình ảnh lúc vào, bạn hoàn toàn có thể lấy xe nhanh chóng.',
      details: [
        '1️⃣ **Bước 1**: Đưa xe đến làn Cổng Ra và thông báo cho Nhân viên bảo vệ trực bốt.',
        '2️⃣ **Bước 2**: Xuất trình **Căn cước công dân (CCCD)** hoặc **Đăng ký xe (Cavet)** để chứng minh quyền sở hữu.',
        '3️⃣ **Bước 3**: Nhân viên kích hoạt chức năng **Đối Soát AI (UC-15)** trên màn hình để kiểm tra hình ảnh lúc xe vào bãi.',
        '4️⃣ **Bước 4**: Sau khi xác minh trùng khớp 100%, bạn chỉ cần thanh toán tiền gửi thực tế và phụ phí cấp lại thẻ (50.000 VNĐ) để mở barrier.'
      ],
      recommendations: [
        'Hotline hỗ trợ khẩn cấp tại cổng: **0967.445.566** (Trực 24/24).'
      ]
    };
  }

  // =========================================================================
  // 5. AN NINH, CAMERA, PCCC & HẦM CÓ NGẬP NƯỚC KHÔNG
  // =========================================================================
  if (
    q.includes('an ninh') || q.includes('camera') || q.includes('an toàn') ||
    q.includes('cháy') || q.includes('pccc') || q.includes('ngập') || q.includes('mưa')
  ) {
    return {
      topic: '🔒 Hệ Thống An Ninh & Tiêu Chuẩn An Toàn PCCC',
      summary: 'DoXeAI cam kết an toàn tuyệt đối cho phương tiện của bạn với tiêu chuẩn an ninh 5 sao.',
      details: [
        '📹 **Giám sát Camera AI 4K**: Ghi hình biển số và góc nhìn toàn cảnh 24/24 không có điểm mù.',
        '🌊 **Hệ thống chống ngập tự động**: Hầm B1 trang bị 4 máy bơm chìm công suất lớn tự động kích hoạt khi có mưa lớn, cam kết không ngập nước.',
        '🧯 **Hệ thống PCCC thông minh**: Cảm biến nhiệt khói tự động kết nối với trung tâm điều hành PCCC khu vực.',
        '📄 **Bảo hiểm bãi đỗ**: Mọi phương tiện gửi tại bãi đều được bảo hiểm bồi thường rủi ro va quẹt hoặc cháy nổ theo quy định.'
      ],
      recommendations: [
        'Bạn hoàn toàn có thể an tâm khi gửi xe qua đêm hoặc dài ngày tại bãi xe DoXeAI.'
      ]
    };
  }

  // =========================================================================
  // 6. ĐẶT CHỖ TRƯỚC (BOOKING) / ĐĂNG KÝ VÉ THÁNG
  // =========================================================================
  if (
    q.includes('đặt chỗ') || q.includes('giữ chỗ') || q.includes('booking') ||
    q.includes('đặt trước') || q.includes('vé tháng') || q.includes('đăng ký')
  ) {
    return {
      topic: '🎫 Đặt Chỗ Đỗ Xe Trước & Đăng Ký Vé Tháng',
      summary: 'DoXeAI hỗ trợ đặt chỗ trước qua Cổng Khách Hàng để đảm bảo luôn có vị trí đẹp khi bạn đến.',
      details: [
        '📲 **Đặt chỗ trước**: Vào tab "Cổng Khách Hàng", chọn ô đỗ màu xanh trống và nhấn "Đặt chỗ trước" (hệ thống sẽ giữ chỗ trong 45 phút).',
        '📅 **Vé tháng cư dân**: Giá cực kỳ ưu đãi: Xe máy **120.000 VNĐ/tháng**, Ô tô **1.200.000 VNĐ/tháng**.',
        '🚀 **Quyền lợi vé tháng**: Ra vào cổng tự động không cần lấy thẻ giấy, barrier tự mở bằng camera nhận diện biển số.'
      ],
      recommendations: [
        'Để đăng ký vé tháng, bạn có thể gửi yêu cầu trong tab "Cổng Khách Hàng" hoặc liên hệ phòng quản lý bãi xe.'
      ]
    };
  }

  // =========================================================================
  // 7. BẢNG GIÁ DỊCH VỤ & PHÍ GỬI XE
  // =========================================================================
  if (
    q.includes('giá vé') || q.includes('bao nhiêu') || q.includes('phí gửi') ||
    q.includes('giá tiền') || q.includes('bảng giá') || q.includes('giá') || q.includes('tiền gửi')
  ) {
    return {
      topic: '💰 Bảng Giá Dịch Vụ Gửi Xe - DoXeAI',
      summary: 'Bãi đỗ xe áp dụng mức giá minh bạch theo giờ và loại phương tiện được niêm yết công khai.',
      details: [
        '🛵 **Xe Máy**: 5.000 VNĐ / lượt (gửi qua đêm: 30.000 VNĐ). Vé tháng: 120.000 VNĐ / tháng.',
        '🚗 **Ô tô (4-7 chỗ)**: 20.000 VNĐ / giờ đầu tiên (10.000 VNĐ / giờ tiếp theo, gửi qua đêm: 120.000 VNĐ). Vé tháng: 1.200.000 VNĐ / tháng.',
        '🚙 **Ô tô Tải/Bán tải**: 35.000 VNĐ / giờ đầu tiên (20.000 VNĐ / giờ tiếp theo, gửi qua đêm: 220.000 VNĐ).',
        '⏱️ **Tính phí theo phút thực tế**: Camera AI ghi nhận chính xác đến từng giây, không làm tròn gian lận.'
      ],
      recommendations: [
        'Quý khách có thể thanh toán không chạm nhanh chóng bằng mã VietQR tự động tại Cổng Ra.',
        'Có thể mở tab "Bảng giá dịch vụ" trên thanh menu để xem chi tiết các gói gửi xe.'
      ]
    };
  }

  // =========================================================================
  // 8. HƯỚNG DẪN THANH TOÁN (VIETQR / TIỀN MẶT / THẺ)
  // =========================================================================
  if (
    q.includes('thanh toán') || q.includes('trả tiền') || q.includes('chuyển khoản') ||
    q.includes('quét mã') || q.includes('vietqr') || q.includes('cách trả')
  ) {
    return {
      topic: '💳 Hướng Dẫn Thanh Toán Không Chạm - DoXeAI',
      summary: 'DoXeAI hỗ trợ thanh toán 100% không chạm thông qua VietQR/Napas247 cực kỳ tiện lợi.',
      details: [
        '📱 **Cách 1 (Khuyên dùng - Nhanh nhất)**: Mở tab "Cổng Khách Hàng", nhấn "Tạo mã VietQR", quét mã bằng app ngân hàng trước khi ra xe 5 phút. Barrier sẽ tự động nhận diện và mở ngay lập tức.',
        '💻 **Cách 2**: Quét mã QR trực tiếp trên màn hình LED thông minh tại Cổng Ra lúc lấy xe.',
        '💵 **Cách 3**: Thanh toán bằng tiền mặt trực tiếp cho nhân viên bảo vệ tại bốt.'
      ],
      recommendations: [
        'Thanh toán qua VietQR giúp bạn đi qua barrier trong vòng chưa đầy 3 giây, tránh ùn ứ lối ra.'
      ]
    };
  }

  // =========================================================================
  // 9. GIỜ HOẠT ĐỘNG / MỞ CỬA
  // =========================================================================
  if (
    q.includes('mở cửa') || q.includes('đóng cửa') || q.includes('hoạt động') ||
    q.includes('giờ làm việc') || q.includes('mấy giờ')
  ) {
    return {
      topic: '⏰ Giờ Hoạt Động Của Bãi Đỗ Xe',
      summary: 'Bãi đỗ xe thông minh DoXeAI hoạt động liên tục **24/7 (24 giờ một ngày, 7 ngày một tuần)**.',
      details: [
        '🌟 **Phục vụ không ngừng nghỉ**: Mở cửa xuyên suốt tất cả các ngày trong năm, bao gồm Thứ 7, Chủ Nhật và các ngày Lễ/Tết.',
        '👮 **Nhân sự trực bốt**: Luôn có nhân viên bảo vệ và kỹ thuật túc trực 24/24 tại Cổng Vào và Cổng Ra.',
        '🌙 **Ban đêm**: Hệ thống đèn LED tự động và camera hồng ngoại đảm bảo đủ ánh sáng quan sát.'
      ],
      recommendations: [
        'Bạn hoàn toàn có thể vào hoặc lấy xe bất cứ thời điểm nào trong ngày.'
      ]
    };
  }

  // =========================================================================
  // 10. PHÂN TÍCH KHUNG GIỜ CAO ĐIỂM (UC-12 - DÀNH CHO ADMIN & QUẢN LÝ)
  // =========================================================================
  if (
    q.includes('khung giờ') || q.includes('giờ nào') || q.includes('cao điểm') ||
    q.includes('đông xe') || q.includes('thời gian đông') || q.includes('lưu lượng')
  ) {
    return {
      topic: '📊 UC-12: Phân Tích Khung Giờ Cao Điểm',
      summary: 'Khung giờ từ 17:30 - 20:30 là thời điểm bãi đỗ xe đạt mật độ phương tiện cao nhất trong ngày.',
      details: [
        `🕒 **Cao điểm tối (17:30 - 20:30)**: Phương tiện về bãi đông đúc (chiếm ~65% tổng lưu lượng trong ngày).`,
        `🕒 **Cao điểm sáng (07:30 - 09:00)**: Lượng xe công sở và xe máy vào gửi nhanh.`,
        `📈 **Hiện trạng**: Toàn bãi đang có **${soChoDangDo}/${tongSoCho} xe** (${tyLeLapDay}% công suất), còn **${soChoTrong} chỗ trống**.`
      ],
      recommendations: [
        'Mở đồng thời cả 2 làn Barrier Cổng Vào trong khung giờ 17:30 - 19:30 để tránh ùn ứ.',
        'Bật chế độ AI Auto-Gate với độ tin cậy >= 70% để phương tiện lưu thông không cần dừng chạm.'
      ],
      stats: {
        tyLeLapDay: `${tyLeLapDay}%`,
        soChoDangDo,
        soChoTrong
      }
    };
  }

  // =========================================================================
  // 11. BÁO CÁO DOANH THU & HIỆU SUẤT (UC-13 - DÀNH CHO ADMIN)
  // =========================================================================
  if (
    q.includes('doanh thu') || q.includes('tiền') || q.includes('báo cáo') ||
    q.includes('thu nhập') || q.includes('tài chính')
  ) {
    const daRaCount = luotList.filter(l => l.trangThai === 'DA_RA' || l.trangThai === 'Đã ra').length;

    return {
      topic: '💰 UC-13: Báo Cáo Doanh Thu & Hiệu Suất Vận Hành',
      summary: `Tổng doanh thu thực nhận hôm nay đạt ${tongDoanhThu.toLocaleString('vi-VN')} VNĐ từ ${daRaCount} lượt thanh toán hoàn tất.`,
      details: [
        `💵 **Tổng doanh thu hôm nay**: **${tongDoanhThu.toLocaleString('vi-VN')} VNĐ**.`,
        `🚗 **Ô tô đang đỗ**: ${xeOtoDangDo} xe.`,
        `🛵 **Xe máy đang đỗ**: ${xeMayDangDo} xe.`,
        `💳 **Phương thức thanh toán**: ~82% giao dịch thực hiện qua mã QR tự động (VietQR/Napas), giảm 90% thời gian chờ tại bốt.`
      ],
      recommendations: [
        'Khuyến khích khách hàng quét mã QR động tại cổng ra để tối ưu thời gian mở Barrier < 3 giây.',
        'Đề xuất tối ưu hóa điều phối phân làn giờ cao điểm để nâng cao năng lực lưu thông bãi xe.'
      ],
      stats: {
        tongDoanhThu: `${tongDoanhThu.toLocaleString('vi-VN')} VNĐ`,
        soLuotDaRa: daRaCount,
        tyLeLapDay: `${tyLeLapDay}%`
      }
    };
  }

  // =========================================================================
  // 12. BỐ TRÍ NHÂN SỰ CA TRỰC (UC-14 - DÀNH CHO QUẢN TRỊ VIÊN)
  // =========================================================================
  if (
    q.includes('nhân sự') || q.includes('nhân viên') || q.includes('ca trực') ||
    q.includes('ca chiều') || q.includes('ca tối') || q.includes('bố trí')
  ) {
    return {
      topic: '👥 UC-14: Đề Xuất Điều Phối & Phân Bổ Nhân Sự',
      summary: 'Đề xuất bố trí 2 nhân viên cho Ca Chiều/Tối (14h - 22h) và 1 nhân viên cho Ca Đêm (22h - 06h).',
      details: [
        '👨‍💼 **Ca Sáng (06:00 - 14:00)**: Bố trí **1 nhân viên** giám sát hệ thống tự động và hỗ trợ khách vãng lai.',
        '👨‍💼 **Ca Chiều - Tối (14:00 - 22:00)**: Bố trí **2 nhân viên** (1 nhân viên trực bốt điều phối camera, 1 nhân viên hướng dẫn xe vào Khu A & Khu B).',
        '🌙 **Ca Đêm (22:00 - 06:00)**: Bố trí **1 nhân viên an ninh** tuần tra khu vực hầm B1 và kiểm tra an toàn PCCC.'
      ],
      recommendations: [
        'Nhờ hệ thống AI OCR tự động hóa 98.5% lượt xe vào/ra, chỉ cần duy trì 1 nhân sự trực màn hình dashboard tại trung tâm.'
      ],
      stats: {
        caChieuDeXuat: '2 Nhân viên',
        caDemDeXuat: '1 Nhân viên',
        mucDoTuDongHoa: '98.5%'
      }
    };
  }

  // =========================================================================
  // 13. TÌNH TRẠNG SỨC CHỨA CÁC PHÂN KHU
  // =========================================================================
  if (
    q.includes('khu vực') || q.includes('chỗ trống') || q.includes('khu nào') || q.includes('đầy')
  ) {
    const khuVucSummary = khuVucList.map(kv => {
      const slots = viTriList.filter(v => v.maKhuVuc === kv.id);
      const daDo = slots.filter(v => v.trangThai === 'DA_DO' || v.trangThai === 'Đã đỗ').length;
      return `${kv.tenKhuVuc}: ${daDo}/${slots.length} (${slots.length > 0 ? Math.round((daDo / slots.length) * 100) : 0}%)`;
    });

    return {
      topic: '📍 Tình Trạng Sức Chứa Từng Phân Khu',
      summary: `Hiện tại toàn bãi còn **${soChoTrong} chỗ trống** trên tổng số **${tongSoCho} vị trí**.`,
      details: [
        `📊 **Tổng quan**: Đang đỗ **${soChoDangDo}/${tongSoCho} chỗ** (Tỷ lệ lấp đầy: **${tyLeLapDay}%**).`,
        ...khuVucSummary.map(k => `📍 ${k}`)
      ],
      recommendations: [
        'Khu vực ô tô A và B vẫn còn nhiều vị trí trống, ưu tiên hướng dẫn phương tiện vào tầng 1.',
        'Khu C xe máy duy trì lối thoát hiểm thông thoáng tại sảnh hầm B1.'
      ],
      stats: {
        soChoTrong,
        soChoDangDo,
        tyLeLapDay: `${tyLeLapDay}%`
      }
    };
  }

  // =========================================================================
  // 14. PHẢN HỒI THÔNG MINH MẶC ĐỊNH CHO MỌI CÂU HỎI KHÁC
  // =========================================================================
  return {
    topic: '🤖 Trợ Lý Trí Tuệ Nhân Tạo DoXeAI',
    summary: `Tôi đã hiểu câu hỏi của bạn: "${prompt}". Tôi luôn sẵn sàng hỗ trợ bạn về mọi vấn đề đỗ xe và dịch vụ!`,
    details: [
      `🚗 **Trạng thái bãi xe**: ${soChoDangDo} xe đang đỗ • ${soChoTrong} chỗ còn trống sẵn sàng phục vụ.`,
      `💰 **Doanh thu hôm nay**: ${tongDoanhThu.toLocaleString('vi-VN')} VNĐ.`,
      `🛡️ **Camera AI ANPR**: Sẵn sàng nhận diện biển số xe máy 2 dòng và ô tô 1 dòng chuẩn xác 100%.`
    ],
    recommendations: [
      'Bạn có thể hỏi tôi về: "Xe 30A-999.99 đỗ ở đâu?", "Bảng giá gửi xe ô tô?", "Bãi có trạm sạc xe điện không?", hoặc "Cách xử lý khi mất thẻ xe?".'
    ],
    stats: {
      soChoDangDo,
      soChoTrong,
      tyLeLapDay: `${tyLeLapDay}%`
    }
  };
};

/**
 * Xử lý truy vấn câu hỏi người dùng (Dual-Mode: Cloud LLM hoặc High-Intelligence Local Brain)
 * @param {string} prompt - Câu hỏi người dùng
 * @param {Object} user - Thông tin người dùng đăng nhập
 * @returns {Promise<Object>}
 */
const processAdminQuery = async (prompt, user = null) => {
  const db = readDb();
  const viTriList = db.ViTri || [];
  const luotList = db.LuotVaoRa || [];
  const khuVucList = db.KhuVuc || [];

  // Tính toán dữ liệu thống kê thời gian thực
  const tongSoCho = viTriList.length;
  const soChoDangDo = viTriList.filter(v => v.trangThai === 'DA_DO' || v.trangThai === 'Đã đỗ').length;
  const soChoTrong = viTriList.filter(v => v.trangThai === 'TRONG' || v.trangThai === 'Trống').length;
  const tyLeLapDay = tongSoCho > 0 ? Math.round((soChoDangDo / tongSoCho) * 100) : 0;

  const tongDoanhThu = luotList
    .filter(l => l.trangThai === 'DA_RA' || l.trangThai === 'Đã ra')
    .reduce((sum, item) => sum + (item.tongTien || 0), 0);

  const xeOtoDangDo = viTriList.filter(
    v => (v.trangThai === 'DA_DO' || v.trangThai === 'Đã đỗ') && v.loaiXe === 'OTO'
  ).length;

  const xeMayDangDo = viTriList.filter(
    v => (v.trangThai === 'DA_DO' || v.trangThai === 'Đã đỗ') && v.loaiXe === 'XE_MAY'
  ).length;

  const context = {
    db,
    tongSoCho,
    soChoDangDo,
    soChoTrong,
    tyLeLapDay,
    tongDoanhThu,
    xeOtoDangDo,
    xeMayDangDo
  };

  // 1. Ưu tiên gọi Cloud LLM (Gemini / OpenAI) nếu có API Key
  const llmResult = await callExternalLLM(prompt, context);
  if (llmResult) {
    return llmResult;
  }

  // 2. Chạy Local Smart NLP Engine với dữ liệu thời gian thực
  return localSmartNLP(prompt, context);
};

module.exports = {
  processAdminQuery
};
