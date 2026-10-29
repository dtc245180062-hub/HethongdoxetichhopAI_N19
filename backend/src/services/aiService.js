const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

/**
 * Danh sách mẫu dự phòng khi chạy test không tải ảnh
 */
const sampleCarPlates = [
  '30H-892.45',
  '51K-345.67',
  '29A-688.99',
  '30K-123.88',
  '43A-112.33',
  '14A-556.77',
  '60A-888.99',
  '99A-234.56',
  '36A-789.01',
  '88A-456.78'
];

const sampleBikePlates = [
  '12-B1 168.88',
  '23-D1 497.07',
  '29-X1 567.89',
  '59-P2 998.11',
  '29-B1 234.56',
  '59-V1 778.89',
  '75-F1 345.12',
  '18-B2 678.90',
  '37-M1 999.88'
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

/**
 * Trích xuất biển số từ tên file nếu tên file chứa định dạng biển số
 */
const extractPlateFromFilename = (filename) => {
  if (!filename) return null;
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const plateRegex = /([0-9]{2}[A-Z]{1,2}[0-9]?[-._ ]?[0-9]{3,5}[.]?[0-9]{0,2})/i;
  const match = baseName.match(plateRegex);
  if (match) {
    return match[1].toUpperCase().replace(/_/g, '-');
  }
  return null;
};

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
 * Thuật toán phân tích cú pháp biển số Việt Nam thông minh:
 * Hỗ trợ:
 * 1. Biển số xe máy 2 dòng:
 *    - Dòng 1: Mã tỉnh (2 số) + chữ cái + 1 số (VD: 12-B1, 29-X1, 36-N1, 59-P2)
 *    - Dòng 2: 5 số (VD: 168.88) hoặc 4 số (VD: 1234)
 *    - Tự động lọc bỏ nhiễu duplicate (VD: 12-B11 -> 12-B1), ký tự viền màn hình phone
 * 2. Biển số ô tô 1 dòng hoặc 2 dòng:
 *    - Ô tô 5 số: 30H-892.45, 51K-345.67, 50LD-123.45
 *    - Ô tô 4 số cũ: 29A-1234
 */
const parseVietnamesePlateFromText = (rawText) => {
  if (!rawText) return null;

  const rawLines = rawText
    .split(/[\r\n]+/)
    .map(l => l.trim().toUpperCase())
    .filter(l => l.length >= 2);

  // =========================================================================
  // CHIẾN LƯỢC 1: BIỂN XE MÁY 2 DÒNG (Chụp từ điện thoại hoặc webcam)
  // =========================================================================
  let bikeTop = null;
  let bikeBottom = null;

  for (const line of rawLines) {
    // Tìm dòng trên: tìm pattern 2 số tỉnh + chữ cái + 1 số
    // VD: "12-B11", "36-07]", "29-X1", "59P2", "12 B1"
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

    // Tìm dòng dưới: lấy 4 hoặc 5 chữ số
    // VD: "168.88)", "108.88", "49707"
    if (!bikeBottom) {
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
  // CHIẾN LƯỢC 2: BIỂN Ô TÔ HOẶC CHUỖI GỘP 1 DÒNG
  // =========================================================================
  const fullText = rawLines.join(' ');
  const cleanFull = fullText.replace(/[^A-Z0-9]/g, '');

  // Ô tô 5 số (1 chữ cái: 30H89245)
  let mCar = cleanFull.match(/([0-9]{2})([A-Z])([0-9]{3})([0-9]{2})/);
  if (mCar && VN_PROVINCE_CODES.has(mCar[1])) {
    return {
      bienSo: `${mCar[1]}${mCar[2]}-${mCar[3]}.${mCar[4]}`,
      loaiXe: 'O to',
      isExact: true
    };
  }

  // Ô tô 5 số (2 chữ cái: 50LD12345)
  let mCar2 = cleanFull.match(/([0-9]{2})([A-Z]{2})([0-9]{3})([0-9]{2})/);
  if (mCar2 && VN_PROVINCE_CODES.has(mCar2[1])) {
    return {
      bienSo: `${mCar2[1]}${mCar2[2]}-${mCar2[3]}.${mCar2[4]}`,
      loaiXe: 'O to',
      isExact: true
    };
  }

  // Ô tô 4 số cũ: 29A1234
  let mCarOld = cleanFull.match(/([0-9]{2})([A-Z]{1,2})([0-9]{4})/);
  if (mCarOld && VN_PROVINCE_CODES.has(mCarOld[1])) {
    return {
      bienSo: `${mCarOld[1]}${mCarOld[2]}-${mCarOld[3]}`,
      loaiXe: 'O to',
      isExact: true
    };
  }

  // Biển xe máy gộp 1 dòng: 29X156789
  let mBikeSingle = cleanFull.match(/([0-9]{2})([A-Z])([0-9])([0-9]{3})([0-9]{2})/);
  if (mBikeSingle && VN_PROVINCE_CODES.has(mBikeSingle[1])) {
    return {
      bienSo: `${mBikeSingle[1]}-${mBikeSingle[2]}${mBikeSingle[3]} ${mBikeSingle[4]}.${mBikeSingle[5]}`,
      loaiXe: 'Xe may',
      isExact: true
    };
  }

  // Biển xe máy 4 số gộp 1 dòng: 29X15678
  let mBikeOld = cleanFull.match(/([0-9]{2})([A-Z])([0-9])([0-9]{4})/);
  if (mBikeOld && VN_PROVINCE_CODES.has(mBikeOld[1])) {
    return {
      bienSo: `${mBikeOld[1]}-${mBikeOld[2]}${mBikeOld[3]} ${mBikeOld[4]}`,
      loaiXe: 'Xe may',
      isExact: true
    };
  }

  return null;
};

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || 'http://localhost:8000/predict-plate';

/**
 * Nhận diện biển số xe bằng YOLOv8 AI Microservice (nếu đang chạy)
 */
const detectWithYOLOv8 = async (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', blob, fileName);

    const controller = new AbortController();
    const TIMEOUT_MS = parseInt(process.env.YOLO_TIMEOUT_MS || '3000');
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
          bien_so: data.bien_so,
          do_tin_cay: data.do_tin_cay,
          loai_xe: data.loai_xe === 'XE_MAY' ? 'Xe may' : (data.loai_xe === 'XE_TAI' ? 'Xe tai' : 'O to'),
          box: data.box || null,
          plate_crop_base64: data.plate_crop_base64 || null,
          engine: data.engine || 'YOLOv8 AI'
        };
      }
    }
  } catch (err) {
    // YOLOv8 offline, tự động dùng OCR nội bộ
  }
  return null;
};

/**
 * Nhận diện biển số xe thực tế
 * @param {Object} file - File upload từ Multer (req.file)
 * @param {Object} options - Tùy chọn bổ sung (force_low_conf, manual plate, ...)
 * @returns {Promise<Object>} { bien_so, do_tin_cay, loai_xe, box, plate_crop_base64, engine, thoi_gian_xu_ly_ms }
 */
const nhanDienBienSo = async (file = null, options = {}) => {
  const startTime = Date.now();
  let bienSo = null;
  let loaiXe = null;
  let doTinCay = null;
  let box = null;
  let plateCropBase64 = null;
  let engine = 'Tesseract.js OCR AI';

  // 1. Nhập tay hoặc ghi đè từ options/body
  if (options.bien_so || options.bienSo) {
    bienSo = (options.bien_so || options.bienSo).trim().toUpperCase();
  }

  // 2. Thử YOLOv8 nếu service đang chạy
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

  // 3. Tesseract.js OCR với thuật toán lọc biển số 2 dòng thông minh
  if (!bienSo && file && file.path && fs.existsSync(file.path)) {
    try {
      console.log(`🔍 [AI OCR Engine] Bắt đầu quét ảnh: ${file.path}`);
      const ocrRes = await Tesseract.recognize(file.path, 'eng', {
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.- '
      });
      const rawText = ocrRes?.data?.text || '';
      console.log(`📄 [AI OCR Raw Text]: "${rawText.replace(/\n/g, ' ')}"`);

      const parsed = parseVietnamesePlateFromText(rawText);
      if (parsed && parsed.bienSo) {
        bienSo = parsed.bienSo;
        loaiXe = parsed.loaiXe;
        doTinCay = parsed.isExact ? 0.98 : 0.88;
        engine = 'Tesseract.js OCR (Camera Trực Tiếp)';
      }
    } catch (e) {
      console.warn('Tesseract OCR error:', e.message);
    }
  }

  // 4. Lấy từ tên file (nếu có)
  if (!bienSo && file && file.originalname) {
    bienSo = extractPlateFromFilename(file.originalname);
    if (bienSo) {
      loaiXe = /[0-9]{2}[A-Z][0-9]/.test(bienSo.replace(/[-. ]/g, '')) ? 'Xe may' : 'O to';
      doTinCay = 0.98;
      engine = 'Tên File Gốc';
    }
  }

  // 5. Mẫu dự phòng khi test không tải ảnh
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

  // 6. Xử lý trường hợp không tìm thấy biển
  if (!bienSo) {
    bienSo = '';
    doTinCay = 0.0;
    loaiXe = options.loai_xe || 'O to';
    engine = 'Không tìm thấy biển số hợp lệ';
  } else {
    if (!loaiXe) {
      const isBikePlate = /[0-9]{2}[A-Z][0-9]/.test(bienSo.replace(/[-. ]/g, ''));
      loaiXe = options.loai_xe || (isBikePlate ? 'Xe may' : 'O to');
    }

    if (options.force_low_conf === true || options.force_low_conf === 'true') {
      doTinCay = 0.62;
    } else if (!doTinCay) {
      doTinCay = 0.92;
    }
  }

  const thoiGianXuLyMs = Date.now() - startTime;
  console.log(`✅ [AI OCR Result]: Biển số="${bienSo}", Loại xe="${loaiXe}", Độ tin cậy=${(doTinCay * 100).toFixed(1)}%, Engine=${engine}`);

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
  parseVietnamesePlateFromText
};
