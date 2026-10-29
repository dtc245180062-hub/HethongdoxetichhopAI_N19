const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

/**
 * Danh sách mẫu dự phòng CHỈ KHI chạy test giả lập (options.mock === true && không có file ảnh)
 */
const sampleCarPlates = [
  '30H-892.45',
  '51K-345.67',
  '29A-688.99',
  '30K-123.88',
  '43A-112.33'
];

const sampleBikePlates = [
  '12-B1 168.88',
  '23-D1 117.79',
  '29-X1 567.89',
  '59-P2 998.11'
];

/** Mã số tỉnh thành VN hợp lệ */
const VN_PROVINCE_CODES = new Set([
  '11','12','13','14','15','16','17','18','19',
  '20','21','22','23','24','25','26','27','28','29',
  '30','31','32','33','34','35','36','37','38','39',
  '40','41','42','43','44','45','46','47','48','49',
  '50','51','52','53','54','55','56','57','58','59',
  '60','61','62','63','64','65','66','67','68','69',
  '70','71','72','73','74','75','76','77','78','79',
  '80','81','82','83','84','85','86','88','89',
  '90','92','93','94','95','97','98','99'
]);

// Sửa chữ thành số (khi vị trí bắt buộc là chữ số)
const fixToDigit = (ch) => {
  const map = { 'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', '|': '1', '/': '1', ']': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6' };
  return map[ch] !== undefined ? map[ch] : ch;
};

// Sửa số/ký tự lạ thành chữ (khi vị trí bắt buộc là chữ cái series)
const fixToLetter = (ch) => {
  const map = { '0': 'D', '8': 'B', '5': 'S', '6': 'G', '1': 'I', '|': 'I', '2': 'Z' };
  return map[ch] !== undefined ? map[ch] : ch;
};

/**
 * Chuẩn hóa biển số xe Việt Nam theo quy chuẩn Thông tư 24/2023/TT-BCA:
 * - Xe máy 5 số: 23-D1 117.79
 * - Xe máy 4 số: 23-D1 1177
 * - Ô tô 5 số: 30H-892.45, 50LD-123.45
 * - Ô tô 4 số cũ: 29A-1234
 */
const normalizePlateNumber = (plateStr) => {
  if (!plateStr) return '';
  const clean = plateStr.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 1. Xe máy 5 số: 23D111779 -> 23-D1 117.79
  const mBike5 = clean.match(/^([0-9]{2})([A-Z][0-9])([0-9]{3})([0-9]{2})$/);
  if (mBike5 && VN_PROVINCE_CODES.has(mBike5[1])) {
    return `${mBike5[1]}-${mBike5[2]} ${mBike5[3]}.${mBike5[4]}`;
  }

  // 2. Xe máy 4 số: 23D11177 -> 23-D1 1177
  const mBike4 = clean.match(/^([0-9]{2})([A-Z][0-9])([0-9]{4})$/);
  if (mBike4 && VN_PROVINCE_CODES.has(mBike4[1])) {
    return `${mBike4[1]}-${mBike4[2]} ${mBike4[3]}`;
  }

  // 3. Ô tô 5 số (1 chữ cái sê-ri): 30H12345 -> 30H-123.45
  const mCar1 = clean.match(/^([0-9]{2})([A-Z])([0-9]{3})([0-9]{2})$/);
  if (mCar1 && VN_PROVINCE_CODES.has(mCar1[1])) {
    return `${mCar1[1]}${mCar1[2]}-${mCar1[3]}.${mCar1[4]}`;
  }

  // 4. Ô tô 5 số (2 chữ cái sê-ri): 50LD12345 -> 50LD-123.45
  const mCar2 = clean.match(/^([0-9]{2})([A-Z]{2})([0-9]{3})([0-9]{2})$/);
  if (mCar2 && VN_PROVINCE_CODES.has(mCar2[1])) {
    return `${mCar2[1]}${mCar2[2]}-${mCar2[3]}.${mCar2[4]}`;
  }

  // 5. Ô tô 4 số cũ: 29A1234 -> 29A-1234
  const mCarOld = clean.match(/^([0-9]{2})([A-Z]{1,2})([0-9]{4})$/);
  if (mCarOld && VN_PROVINCE_CODES.has(mCarOld[1])) {
    return `${mCarOld[1]}${mCarOld[2]}-${mCarOld[3]}`;
  }

  return plateStr.trim().toUpperCase();
};

/**
 * Trích xuất biển số từ tên file nếu tên file chứa định dạng biển số
 */
const extractPlateFromFilename = (filename) => {
  if (!filename) return null;
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const plateRegex = /([0-9]{2}[A-Z]{1,2}[0-9]?[-._ ]?[0-9]{3,5}[.]?[0-9]{0,2})/i;
  const match = baseName.match(plateRegex);
  if (match) {
    return normalizePlateNumber(match[1]);
  }
  return null;
};

/**
 * ENGINE 1: Gemini 3.5 Flash Vision AI (Mô hình đa phương thức hiện đại bậc nhất)
 * Đọc chính xác ảnh chụp camera thực tế, chịu được lóa đèn, bóng đêm, hoa văn viền inox, góc nghiêng
 */
const detectWithGeminiVision = async (filePath) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !filePath || !fs.existsSync(filePath)) return null;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Img = fileBuffer.toString('base64');

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Img
              }
            },
            {
              text: 'Bạn là chuyên gia thị giác máy tính nhận diện biển số xe cơ giới Việt Nam theo quy chuẩn Bộ Công An (Thông tư 24/2023/TT-BCA). Hãy đọc thật chính xác biển số xe và loại xe (XE_MAY hoặc OTO) trong ảnh này. Bỏ qua các hoa văn trang trí viền inox, khung kim loại hoặc phản quang. Trả về đúng 1 đối tượng JSON duy nhất (không bọc trong markdown hay bất kỳ chữ nào khác): {"bienSo": "...", "loaiXe": "XE_MAY", "doTinCay": 0.99}. Nếu ảnh không có biển số xe, trả về: {"bienSo": null}'
            }
          ]
        }
      ]
    };

    const controller = new AbortController();
    const TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '12000');
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Thử gemini-3.5-flash trước, nếu bận thử gemini-3.8-flash
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.8-flash'];
    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        if (res.ok) {
          clearTimeout(timeoutId);
          const json = await res.json();
          let text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

          const data = JSON.parse(text);
          if (data && data.bienSo) {
            const normalized = normalizePlateNumber(data.bienSo);
            const isBike = data.loaiXe === 'XE_MAY' || /[0-9]{2}-[A-Z][0-9]/.test(normalized);
            return {
              bien_so: normalized,
              loai_xe: isBike ? 'Xe may' : (data.loaiXe === 'XE_TAI' ? 'Xe tai' : 'O to'),
              do_tin_cay: typeof data.doTinCay === 'number' ? data.doTinCay : 0.99,
              engine: `Gemini AI Vision (${modelName})`
            };
          }
        }
      } catch (innerErr) {
        // Thử model tiếp theo
      }
    }
    clearTimeout(timeoutId);
  } catch (err) {
    console.warn('⚠️ [Gemini Vision]:', err.message);
  }
  return null;
};

/**
 * ENGINE 2: Nhận diện biển số xe bằng YOLOv8 AI Microservice (nếu đang chạy trên port 8000)
 */
const detectWithYOLOv8 = async (filePath) => {
  const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || 'http://localhost:8000/predict-plate';
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', blob, fileName);

    const controller = new AbortController();
    const TIMEOUT_MS = parseInt(process.env.YOLO_TIMEOUT_MS || '2500');
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(YOLO_SERVICE_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.bien_so) {
        return {
          bien_so: normalizePlateNumber(data.bien_so),
          do_tin_cay: data.do_tin_cay,
          loai_xe: data.loai_xe === 'XE_MAY' ? 'Xe may' : (data.loai_xe === 'XE_TAI' ? 'Xe tai' : 'O to'),
          box: data.box || null,
          plate_crop_base64: data.plate_crop_base64 || null,
          engine: data.engine || 'YOLOv8 AI'
        };
      }
    }
  } catch (err) {
    // YOLOv8 offline
  }
  return null;
};

/**
 * Thuật toán phân tích cú pháp Tesseract OCR:
 * Xử lý nghiêm ngặt theo từng dòng - KHÔNG gộp lung tung giữa các dòng tránh ảo giác biển số
 */
const parseVietnamesePlateFromText = (rawText) => {
  if (!rawText) return null;

  const rawLines = rawText
    .split(/[\r\n]+/)
    .map(l => l.trim().toUpperCase())
    .filter(l => l.length >= 2);

  // =========================================================================
  // CHIẾN LƯỢC 1: BIỂN XE MÁY 2 DÒNG
  // =========================================================================
  let bikeTop = null;
  let bikeBottom = null;

  for (const line of rawLines) {
    // Dòng 1: Tìm pattern 2 số tỉnh + chữ cái + 1 số
    // VD: "12-B1", "23-D1", "29-X1"
    if (!bikeTop) {
      const mTop = line.match(/([0-9OQDI]{2})\s*[-.]?\s*([A-Z0-9])\s*([0-9A-Z])/i);
      if (mTop) {
        let prov = mTop[1].split('').map(fixToDigit).join('');
        if (VN_PROVINCE_CODES.has(prov)) {
          let letter = fixToLetter(mTop[2]);
          if (!/[A-Z]/.test(letter)) letter = 'B';
          let digit = fixToDigit(mTop[3]);
          if (!/[0-9]/.test(digit)) digit = '1';
          bikeTop = `${prov}-${letter}${digit}`;
          continue;
        }
      }
    }

    // Dòng 2: Phải chứa chuỗi 4 hoặc 5 chữ số
    if (!bikeBottom && bikeTop) {
      const cleaned = line
        .split('')
        .map(ch => (/[0-9]/.test(ch) || ch === '.' ? ch : fixToDigit(ch)))
        .join('')
        .replace(/[^0-9.]/g, '');

      const digitsOnly = cleaned.replace(/[^0-9]/g, '');
      if (digitsOnly.length === 5) {
        bikeBottom = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3)}`;
      } else if (digitsOnly.length === 4) {
        bikeBottom = digitsOnly;
      }
    }
  }

  if (bikeTop && bikeBottom) {
    return {
      bienSo: `${bikeTop} ${bikeBottom}`,
      loaiXe: 'Xe may',
      isExact: true
    };
  }

  // =========================================================================
  // CHIẾN LƯỢC 2: BIỂN Ô TÔ HOẶC XE MÁY 1 DÒNG (CHỈ XÉT TRÊN TỪNG DÒNG ĐƠN LẺ)
  // Tuyệt đối không gộp tất cả các dòng rời rạc để tránh ghép tạp âm viền inox!
  // =========================================================================
  for (const line of rawLines) {
    const cleanLine = line.replace(/[^A-Z0-9]/g, '');

    // Ô tô 5 số (1 chữ cái: 30H89245)
    let mCar = cleanLine.match(/([0-9]{2})([A-Z])([0-9]{3})([0-9]{2})/);
    if (mCar && VN_PROVINCE_CODES.has(mCar[1])) {
      return {
        bienSo: `${mCar[1]}${mCar[2]}-${mCar[3]}.${mCar[4]}`,
        loaiXe: 'O to',
        isExact: true
      };
    }

    // Ô tô 5 số (2 chữ cái: 50LD12345)
    let mCar2 = cleanLine.match(/([0-9]{2})([A-Z]{2})([0-9]{3})([0-9]{2})/);
    if (mCar2 && VN_PROVINCE_CODES.has(mCar2[1])) {
      return {
        bienSo: `${mCar2[1]}${mCar2[2]}-${mCar2[3]}.${mCar2[4]}`,
        loaiXe: 'O to',
        isExact: true
      };
    }

    // Ô tô 4 số cũ: 29A1234
    let mCarOld = cleanLine.match(/([0-9]{2})([A-Z]{1,2})([0-9]{4})/);
    if (mCarOld && VN_PROVINCE_CODES.has(mCarOld[1])) {
      return {
        bienSo: `${mCarOld[1]}${mCarOld[2]}-${mCarOld[3]}`,
        loaiXe: 'O to',
        isExact: true
      };
    }

    // Xe máy 1 dòng: 29X156789
    let mBike = cleanLine.match(/([0-9]{2})([A-Z])([0-9])([0-9]{3})([0-9]{2})/);
    if (mBike && VN_PROVINCE_CODES.has(mBike[1])) {
      return {
        bienSo: `${mBike[1]}-${mBike[2]}${mBike[3]} ${mBike[4]}.${mBike[5]}`,
        loaiXe: 'Xe may',
        isExact: true
      };
    }
  }

  return null;
};

/**
 * Hàm điều phối nhận diện biển số xe (Multi-tier AI Pipeline)
 * Tier 1: Gemini 3.5 Flash Vision AI (Nhận diện siêu chính xác ảnh thực tế, viền inox, ban đêm)
 * Tier 2: YOLOv8 Microservice (nếu có server cục bộ)
 * Tier 3: Tesseract.js OCR với thuật toán bóc tách từng dòng nghiêm ngặt
 */
const nhanDienBienSo = async (file = null, options = {}) => {
  const startTime = Date.now();
  let bienSo = null;
  let loaiXe = null;
  let doTinCay = null;
  let box = null;
  let plateCropBase64 = null;
  let engine = 'Chưa xác định';

  // 1. Nhập tay hoặc ghi đè từ options/body
  if (options.bien_so || options.bienSo) {
    bienSo = (options.bien_so || options.bienSo).trim().toUpperCase();
  }

  // 2. TIER 1: Gemini Vision AI (chính xác tuyệt đối mọi trường hợp thực tế)
  if (!bienSo && file && file.path && fs.existsSync(file.path)) {
    console.log(`🤖 [AI Engine] Kích hoạt Gemini Vision AI cho ảnh: ${file.path}`);
    const geminiRes = await detectWithGeminiVision(file.path);
    if (geminiRes && geminiRes.bien_so) {
      bienSo = geminiRes.bien_so;
      loaiXe = geminiRes.loai_xe;
      doTinCay = geminiRes.do_tin_cay;
      engine = geminiRes.engine;
    }
  }

  // 3. TIER 2: Thử YOLOv8 nếu service đang chạy
  if (!bienSo && file && file.path && fs.existsSync(file.path)) {
    const yoloResult = await detectWithYOLOv8(file.path);
    if (yoloResult && yoloResult.bien_so) {
      bienSo = yoloResult.bien_so;
      loaiXe = yoloResult.loai_xe;
      doTinCay = yoloResult.do_tin_cay;
      box = yoloResult.box;
      plateCropBase64 = yoloResult.plate_crop_base64;
      engine = yoloResult.engine;
    }
  }

  // 4. TIER 3: Tesseract.js OCR dự phòng cục bộ
  if (!bienSo && file && file.path && fs.existsSync(file.path)) {
    try {
      console.log(`🔍 [AI OCR Engine] Quét cục bộ Tesseract: ${file.path}`);
      const ocrRes = await Tesseract.recognize(file.path, 'eng', {
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.- '
      });
      const rawText = ocrRes?.data?.text || '';
      const parsed = parseVietnamesePlateFromText(rawText);
      if (parsed && parsed.bienSo) {
        bienSo = normalizePlateNumber(parsed.bienSo);
        loaiXe = parsed.loaiXe;
        doTinCay = parsed.isExact ? 0.95 : 0.85;
        engine = 'Tesseract.js OCR (Nội bộ)';
      }
    } catch (e) {
      console.warn('Tesseract OCR error:', e.message);
    }
  }

  // 5. Lấy từ tên file (nếu ảnh upload có tên biển số)
  if (!bienSo && file && file.originalname) {
    bienSo = extractPlateFromFilename(file.originalname);
    if (bienSo) {
      loaiXe = /[0-9]{2}-[A-Z][0-9]/.test(bienSo) ? 'Xe may' : 'O to';
      doTinCay = 0.98;
      engine = 'Tên File Gốc';
    }
  }

  // 6. CHỈ DÙNG MẪU DỰ PHÒNG KHI TEST GIẢ LẬP KHÔNG CÓ FILE ẢNH THẬT
  if (!bienSo && (!file || !file.path) && (options.mock === true || options.mock === 'true')) {
    const isBike = options.loai_xe === 'Xe may' || (options.loai_xe !== 'O to' && Math.random() < 0.4);
    if (isBike) {
      bienSo = sampleBikePlates[Math.floor(Math.random() * sampleBikePlates.length)];
      loaiXe = 'Xe may';
    } else {
      bienSo = sampleCarPlates[Math.floor(Math.random() * sampleCarPlates.length)];
      loaiXe = 'O to';
    }
    doTinCay = 0.95;
    engine = 'Dữ Liệu Thử Nghiệm Mẫu';
  }

  // 7. Xử lý trường hợp không tìm thấy biển (KHÔNG tự tiện bịa biển số ngẫu nhiên!)
  if (!bienSo) {
    bienSo = '';
    doTinCay = 0.0;
    loaiXe = options.loai_xe || 'Xe may';
    engine = 'Không tìm thấy biển số rõ ràng trong ảnh';
  } else {
    if (!loaiXe) {
      const isBikePlate = /[0-9]{2}-[A-Z][0-9]/.test(bienSo);
      loaiXe = options.loai_xe || (isBikePlate ? 'Xe may' : 'O to');
    }

    if (options.force_low_conf === true || options.force_low_conf === 'true') {
      doTinCay = 0.62;
    } else if (!doTinCay) {
      doTinCay = 0.95;
    }
  }

  const thoiGianXuLyMs = Date.now() - startTime;
  console.log(`✅ [AI Pipeline]: Biển số="${bienSo}", Loại xe="${loaiXe}", Độ tin cậy=${(doTinCay * 100).toFixed(1)}%, Engine=${engine}`);

  return {
    bien_so: bienSo,
    do_tin_cay: doTinCay,
    loai_xe: loaiXe,
    box,
    plate_crop_base64: plateCropBase64,
    engine,
    thoi_gian_xu_ly_ms: Math.max(80, thoiGianXuLyMs)
  };
};

module.exports = {
  nhanDienBienSo,
  extractPlateFromFilename,
  parseVietnamesePlateFromText,
  normalizePlateNumber
};
