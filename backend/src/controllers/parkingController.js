const { readDb, writeDb, getTable } = require('../utils/db');
const { nhanDienBienSo } = require('../services/aiService');

/**
 * Chuẩn hóa trạng thái vị trí đỗ
 */
const normalizeTrangThai = (status) => {
  if (!status) return 'Trống';
  const s = status.toUpperCase();
  if (s === 'DA_DO' || s === 'ĐÃ ĐỖ' || s === 'DA DO') return 'Đã đỗ';
  if (s === 'DANG_BAO_TRI' || s === 'BẢO TRÌ' || s === 'BAO TRI') return 'Bảo trì';
  return 'Trống';
};

const normalizeTrangThaiCode = (status) => {
  if (!status) return 'TRONG';
  const s = status.toUpperCase();
  if (s === 'DA_DO' || s === 'ĐÃ ĐỖ' || s === 'DA DO') return 'DA_DO';
  if (s === 'DANG_BAO_TRI' || s === 'BẢO TRÌ' || s === 'BAO TRI') return 'DANG_BAO_TRI';
  return 'TRONG';
};

// ==========================================
// 1. POST /api/xe-vao
// ==========================================
const xeVao = async (req, res) => {
  try {
    const db = readDb();
    const { override, bien_so_thu_cong, force_low_conf } = req.body;
    let maViTri = req.body.ma_vi_tri || req.body.maViTri;

    // Gọi AI OCR nhận diện từ ảnh hoặc body
    const aiResult = await nhanDienBienSo(req.file, {
      bien_so: bien_so_thu_cong || req.body.bien_so || req.body.bienSo,
      loai_xe: req.body.loai_xe || req.body.loaiXe,
      force_low_conf
    });

    let bienSo = aiResult.bien_so;
    let loaiXe = aiResult.loai_xe;
    const doTinCay = aiResult.do_tin_cay;
    const anhVao = req.file ? `/uploads/${req.file.filename}` : (req.body.anhVao || '/uploads/default_in.jpg');

    // Kiểm tra độ tin cậy AI < 0.70 và chưa có xác nhận thủ công (override)
    const isOverride = override === true || override === 'true' || Boolean(bien_so_thu_cong);
    if (doTinCay < 0.70 && !isOverride) {
      return res.status(200).json({
        success: false,
        warning: true,
        can_override: true,
        message: `Độ tin cậy AI nhận diện thấp (${(doTinCay * 100).toFixed(1)}% < 70%). Vui lòng kiểm tra lại hình ảnh hoặc xác nhận nhập tay!`,
        data: {
          bien_so: bienSo,
          do_tin_cay: doTinCay,
          loai_xe: loaiXe,
          anh_vao: anhVao
        }
      });
    }

    if (!bienSo) {
      return res.status(400).json({
        success: false,
        message: 'Không thể nhận diện biển số xe. Vui lòng tải ảnh rõ nét hoặc nhập biển số thủ công.'
      });
    }

    bienSo = bienSo.trim().toUpperCase();

    // Kiểm tra xe có nằm trong Danh Sách Đen (Blacklist) hay không
    const blacklisted = (db.DanhSachDen || []).find(b => b.bienSo.toUpperCase() === bienSo);

    // Kiểm tra xe có đang đỗ trong bãi hay không
    const xeDangDo = (db.LuotVaoRa || []).find(
      l => l.bienSo === bienSo && (l.trangThai === 'DANG_DO' || l.trangThai === 'Đang đỗ')
    );
    if (xeDangDo) {
      return res.status(400).json({
        success: false,
        message: `Xe ${bienSo} hiện đang có lượt đỗ tại vị trí ${xeDangDo.maViTri}. Không thể check-in tiếp!`
      });
    }

    // Tìm vị trí đỗ còn trống
    const viTriList = db.ViTri || [];
    let targetSlot = null;

    if (maViTri) {
      targetSlot = viTriList.find(
        v => v.id === maViTri && (normalizeTrangThaiCode(v.trangThai) === 'TRONG')
      );
      if (!targetSlot) {
        return res.status(400).json({
          success: false,
          message: `Vị trí chỉ định ${maViTri} không còn trống hoặc không tồn tại!`
        });
      }
    } else {
      // Tự động tìm vị trí trống theo loại xe
      const targetLoaiXeCode = (loaiXe === 'Xe may' || loaiXe === 'XE_MAY') ? 'XE_MAY' : 'OTO';
      targetSlot = viTriList.find(
        v => normalizeTrangThaiCode(v.trangThai) === 'TRONG' && v.loaiXe === targetLoaiXeCode
      );

      // Nếu không tìm thấy slot khớp loại xe, lấy bất kỳ slot trống nào
      if (!targetSlot) {
        targetSlot = viTriList.find(v => normalizeTrangThaiCode(v.trangThai) === 'TRONG');
      }
    }

    if (!targetSlot) {
      return res.status(400).json({
        success: false,
        message: 'Bãi đỗ xe đã đầy! Không còn vị trí đỗ trống.'
      });
    }

    const nowIso = new Date().toISOString();
    const assignedSlotId = targetSlot.id;

    // Tạo bản ghi lượt vào ra
    const newLuot = {
      id: `LVR-${Date.now()}`,
      bienSo,
      loaiXe: (loaiXe === 'Xe may' || loaiXe === 'XE_MAY') ? 'Xe may' : 'O to',
      maViTri: assignedSlotId,
      thoiGianVao: nowIso,
      thoiGianRa: null,
      anhVao,
      anhRa: null,
      trangThai: 'Đang đỗ',
      tongTien: 0,
      phuongThucThanhToan: null,
      doTinCayAI: doTinCay
    };

    if (!db.LuotVaoRa) db.LuotVaoRa = [];
    db.LuotVaoRa.unshift(newLuot);

    // Cập nhật trạng thái vị trí đỗ thành 'Đã đỗ'
    targetSlot.trangThai = 'Đã đỗ';
    targetSlot.bienSoXe = bienSo;
    targetSlot.thoiGianVao = nowIso;

    // Lưu thông tin xe nếu chưa có trong danh mục Xe
    if (!db.Xe) db.Xe = [];
    const existedXe = db.Xe.find(x => x.bienSo === bienSo);
    if (!existedXe) {
      db.Xe.push({
        id: `XE-${Date.now()}`,
        bienSo,
        loaiXe: (loaiXe === 'Xe may' || loaiXe === 'XE_MAY') ? 'XE_MAY' : 'OTO',
        chuXe: 'Khách vãng lai',
        soDienThoai: '',
        loaiDangKy: 'VANG_LAI',
        maTheRFID: `RFID-${Math.floor(100000 + Math.random() * 900000)}`,
        ngayDangKy: nowIso.slice(0, 10)
      });
    }

    writeDb(db);

    res.json({
      success: true,
      message: `Xe ${bienSo} (${newLuot.loaiXe}) đã vào bãi thành công. Vị trí đỗ: ${assignedSlotId}`,
      data: {
        luot_vao: newLuot,
        vi_tri: {
          id: targetSlot.id,
          tenViTri: targetSlot.tenViTri,
          trangThai: targetSlot.trangThai
        },
        canh_bao_blacklist: Boolean(blacklisted),
        thong_tin_blacklist: blacklisted || null,
        ai_info: {
          do_tin_cay: doTinCay,
          thoi_gian_xu_ly_ms: aiResult.thoi_gian_xu_ly_ms,
          box: aiResult.box,
          plateCropBase64: aiResult.plate_crop_base64,
          engine: aiResult.engine
        }
      }
    });
  } catch (error) {
    console.error('Lỗi API /api/xe-vao:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. POST /api/xe-ra
// ==========================================
const xeRa = async (req, res) => {
  try {
    const db = readDb();
    let bienSo = req.body.bien_so || req.body.bienSo;
    const maLuot = req.body.ma_luot || req.body.maLuot;
    const phuongThucThanhToan = req.body.phuong_thuc_thanh_toan || req.body.phuongThucThanhToan || 'TIEN_MAT';

    // Nếu có file ảnh tải lên mà không truyền biển số, dùng AI để nhận diện biển số xe ra
    if (!bienSo && !maLuot && req.file) {
      const aiResult = await nhanDienBienSo(req.file, {});
      bienSo = aiResult.bien_so;
    }

    const anhRa = req.file ? `/uploads/${req.file.filename}` : (req.body.anhRa || '/uploads/default_out.jpg');

    if (!bienSo && !maLuot) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp biển số xe hoặc mã lượt để thực hiện xe ra.'
      });
    }

    if (bienSo) bienSo = bienSo.trim().toUpperCase();

    // Tìm lượt vào ra đang mở (Đang đỗ)
    const luot = (db.LuotVaoRa || []).find(l => {
      const isMatching = maLuot ? l.id === maLuot : l.bienSo === bienSo;
      const isStillIn = l.trangThai === 'DANG_DO' || l.trangThai === 'Đang đỗ';
      return isMatching && isStillIn;
    });

    if (!luot) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lượt gửi xe đang hoạt động cho ${bienSo ? `biển số ${bienSo}` : `mã lượt ${maLuot}`}.`
      });
    }

    const thoiGianVao = new Date(luot.thoiGianVao);
    const thoiGianRa = new Date();
    const diffMs = Math.max(0, thoiGianRa - thoiGianVao);
    
    // Tính số giờ gửi (làm tròn lên tối thiểu 1 giờ)
    const soGioGui = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));

    // Kiểm tra xe có đăng ký vé tháng / thường trú hay không
    const xeInfo = (db.Xe || []).find(x => x.bienSo === luot.bienSo);
    const isVeThang = xeInfo && (xeInfo.loaiDangKy === 'THUONG_TRU' || xeInfo.loaiDangKy === 'VE_THANG');

    // Tính phí tự động theo bảng giá:
    // - Xe vé tháng: 0 VNĐ
    // - Xe máy: 5.000 VNĐ / lượt
    // - Ô tô: 20.000 VNĐ / giờ
    const isXeMay = luot.loaiXe === 'Xe may' || luot.loaiXe === 'XE_MAY';
    let tongTien = 0;
    let loaiVeText = 'Vé vãng lai';

    if (isVeThang) {
      tongTien = 0;
      loaiVeText = `Vé tháng (${xeInfo.chuXe || 'Thường trú'})`;
    } else if (isXeMay) {
      tongTien = 5000; // 5k / lượt
    } else {
      tongTien = soGioGui * 20000; // 20k / giờ
    }

    // Cập nhật lượt vào ra
    luot.thoiGianRa = thoiGianRa.toISOString();
    luot.anhRa = anhRa;
    luot.trangThai = 'Đã ra';
    luot.tongTien = tongTien;
    luot.phuongThucThanhToan = isVeThang ? 'VE_THANG' : phuongThucThanhToan;
    luot.soGioGui = soGioGui;
    luot.loaiVe = isVeThang ? 'VE_THANG' : 'VANG_LAI';

    // Giải phóng vị trí đỗ trong ViTri thành 'Trống'
    if (luot.maViTri) {
      const slot = (db.ViTri || []).find(
        v => v.id === luot.maViTri || v.bienSoXe === luot.bienSo
      );
      if (slot) {
        slot.trangThai = 'Trống';
        slot.bienSoXe = null;
        slot.thoiGianVao = null;
      }
    }

    writeDb(db);

    res.json({
      success: true,
      message: isVeThang 
        ? `Xe ${luot.bienSo} (${loaiVeText}) đã check-out thành công. Phí gửi xe: 0 VND (Đã đăng ký vé tháng)` 
        : `Xe ${luot.bienSo} đã check-out thành công. Tổng tiền: ${tongTien.toLocaleString('vi-VN')} VND (${soGioGui} giờ)`,
      data: {
        id: luot.id,
        bienSo: luot.bienSo,
        loaiXe: luot.loaiXe,
        maViTri: luot.maViTri,
        thoiGianVao: luot.thoiGianVao,
        thoiGianRa: luot.thoiGianRa,
        soGioGui,
        loaiVe: isVeThang ? 'VE_THANG' : 'VANG_LAI',
        loaiVeText,
        donGia: isVeThang ? '0đ (Vé tháng)' : (isXeMay ? '5.000đ / lượt' : '20.000đ / giờ'),
        tongTien,
        phuongThucThanhToan: isVeThang ? 'VE_THANG' : phuongThucThanhToan,
        trangThai: 'Đã ra'
      }
    });
  } catch (error) {
    console.error('Lỗi API /api/xe-ra:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. GET /api/vi-tri (và /api/vitri)
// ==========================================
const getViTriList = (req, res) => {
  try {
    const db = readDb();
    const { khu_vuc, khuVuc, trang_thai, trangThai, loai_xe, loaiXe } = req.query;
    let list = db.ViTri || [];

    const targetKhuVuc = khu_vuc || khuVuc;
    const targetTrangThai = trang_thai || trangThai;
    const targetLoaiXe = loai_xe || loaiXe;

    if (targetKhuVuc) {
      list = list.filter(v => v.maKhuVuc === targetKhuVuc);
    }

    if (targetTrangThai) {
      list = list.filter(v => {
        const normalized = normalizeTrangThai(v.trangThai);
        const code = normalizeTrangThaiCode(v.trangThai);
        return normalized.toLowerCase() === targetTrangThai.toLowerCase() ||
               code.toLowerCase() === targetTrangThai.toLowerCase();
      });
    }

    if (targetLoaiXe) {
      list = list.filter(v => v.loaiXe === targetLoaiXe);
    }

    // Định dạng dữ liệu trả về thân thiện
    const result = list.map(slot => ({
      id: slot.id,
      maKhuVuc: slot.maKhuVuc,
      tenViTri: slot.tenViTri,
      trangThai: normalizeTrangThai(slot.trangThai),
      trangThaiCode: normalizeTrangThaiCode(slot.trangThai),
      loaiXe: slot.loaiXe,
      bienSoXe: slot.bienSoXe || null,
      thoiGianVao: slot.thoiGianVao || null
    }));

    res.json({
      success: true,
      total: result.length,
      data: result
    });
  } catch (error) {
    console.error('Lỗi API /api/vi-tri:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. GET /api/dashboard (và /api/overview)
// ==========================================
const getDashboard = (req, res) => {
  try {
    const db = readDb();
    const viTriList = db.ViTri || [];
    const luotList = db.LuotVaoRa || [];
    const khuVucList = db.KhuVuc || [];

    const tongSoCho = viTriList.length;
    const soXeDangDo = viTriList.filter(v => normalizeTrangThaiCode(v.trangThai) === 'DA_DO').length;
    const soChoTrong = viTriList.filter(v => normalizeTrangThaiCode(v.trangThai) === 'TRONG').length;
    const soChoBaoTri = viTriList.filter(v => normalizeTrangThaiCode(v.trangThai) === 'DANG_BAO_TRI').length;
    const tyLeLapDay = tongSoCho > 0 ? Math.round((soXeDangDo / tongSoCho) * 100) : 0;

    // Doanh thu trong ngày từ các lượt đã hoàn tất
    const doanhThuNgay = luotList
      .filter(l => l.trangThai === 'DA_RA' || l.trangThai === 'Đã ra')
      .reduce((sum, item) => sum + (item.tongTien || 0), 0);

    const luotVaoRaGanNhat = [...luotList]
      .sort((a, b) => new Date(b.thoiGianVao) - new Date(a.thoiGianVao))
      .slice(0, 10);

    const khuVucSummary = khuVucList.map(kv => {
      const slots = viTriList.filter(v => v.maKhuVuc === kv.id);
      const daDo = slots.filter(v => normalizeTrangThaiCode(v.trangThai) === 'DA_DO').length;
      const trong = slots.filter(v => normalizeTrangThaiCode(v.trangThai) === 'TRONG').length;
      return {
        id: kv.id,
        tenKhuVuc: kv.tenKhuVuc,
        loaiXe: kv.loaiXe,
        sucChua: slots.length,
        soChoDaDo: daDo,
        soChoTrong: trong,
        tyLe: slots.length > 0 ? Math.round((daDo / slots.length) * 100) : 0
      };
    });

    res.json({
      success: true,
      data: {
        tongSoCho,
        soXeDangDo,
        soChoTrong,
        soChoBaoTri,
        tyLeLapDay,
        doanhThuNgay,
        tongDoanhThu: doanhThuNgay,
        soKhuVuc: khuVucList.length,
        khuVucSummary,
        luotVaoRaGanNhat
      }
    });
  } catch (error) {
    console.error('Lỗi API /api/dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// Các API bổ sung khác
// ==========================================
const getKhuVucList = (req, res) => {
  try {
    const db = readDb();
    const khuVucList = db.KhuVuc || [];
    const viTriList = db.ViTri || [];

    const result = khuVucList.map(kv => {
      const slots = viTriList.filter(vt => vt.maKhuVuc === kv.id);
      const daDo = slots.filter(s => normalizeTrangThaiCode(s.trangThai) === 'DA_DO').length;
      const trong = slots.filter(s => normalizeTrangThaiCode(s.trangThai) === 'TRONG').length;
      return {
        ...kv,
        soChoHienCo: slots.length,
        soChoDaDo: daDo,
        soChoTrong: trong,
        danhSachViTri: slots
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getXeList = (req, res) => {
  try {
    const { search } = req.query;
    let list = getTable('Xe');

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(x =>
        x.bienSo.toLowerCase().includes(q) ||
        x.chuXe.toLowerCase().includes(q) ||
        (x.soDienThoai && x.soDienThoai.includes(q))
      );
    }

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLuotVaoRaList = (req, res) => {
  try {
    const { trangThai, trang_thai, limit = 50 } = req.query;
    let list = getTable('LuotVaoRa');

    const targetStatus = trangThai || trang_thai;
    if (targetStatus) {
      list = list.filter(l => l.trangThai === targetStatus);
    }

    list = list
      .sort((a, b) => new Date(b.thoiGianVao) - new Date(a.thoiGianVao))
      .slice(0, parseInt(limit));

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBangGiaList = (req, res) => {
  try {
    const bangGia = getTable('BangGia');
    res.json({ success: true, data: bangGia });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const mockAiDetectEndpoint = async (req, res) => {
  try {
    const result = await nhanDienBienSo(req.file, req.body);
    res.json({
      success: true,
      data: {
        bienSoNhanDien: result.bien_so,
        doTinCay: parseFloat((result.do_tin_cay * 100).toFixed(1)),
        loaiPhuongTien: result.loai_xe === 'Xe may' ? 'XE_MAY' : 'OTO',
        thoiGianXuLyMs: result.thoi_gian_xu_ly_ms,
        box: result.box,
        plateCropBase64: result.plate_crop_base64,
        engine: result.engine
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const { processAdminQuery } = require('../services/aiAssistantService');

const handleAiAssistant = async (req, res) => {
  try {
    const { message, prompt } = req.body;
    const userQuery = message || prompt || '';
    if (!userQuery) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp nội dung câu hỏi cho AI Assistant!'
      });
    }

    const result = await processAdminQuery(userQuery, req.body.user);

    res.json({
      success: true,
      query: userQuery,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Lỗi Assistant API:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. CRUD Quản lý Phương tiện & Vé tháng (Xe)
// ==========================================
const createXe = (req, res) => {
  try {
    const db = readDb();
    if (!db.Xe) db.Xe = [];

    const { bienSo, loaiXe, chuXe, soDienThoai, loaiDangKy, hanVeThang, maTheRFID } = req.body;

    if (!bienSo) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp biển số xe!'
      });
    }

    const cleanBienSo = bienSo.trim().toUpperCase();
    const existed = db.Xe.find(x => x.bienSo === cleanBienSo);
    if (existed) {
      return res.status(400).json({
        success: false,
        message: `Biển số ${cleanBienSo} đã tồn tại trong hệ thống!`
      });
    }

    const now = new Date();
    // Nếu là vé tháng mà không truyền hạn thì mặc định +30 ngày
    const defaultExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const newXe = {
      id: `XE-${Date.now()}`,
      bienSo: cleanBienSo,
      loaiXe: loaiXe || 'OTO',
      chuXe: (chuXe || 'Khách vãng lai').trim(),
      soDienThoai: (soDienThoai || '').trim(),
      loaiDangKy: loaiDangKy || 'VANG_LAI',
      hanVeThang: loaiDangKy === 'THUONG_TRU' ? (hanVeThang || defaultExpiry) : null,
      maTheRFID: maTheRFID || `RFID-${Math.floor(100000 + Math.random() * 900000)}`,
      ngayDangKy: now.toISOString().slice(0, 10)
    };

    db.Xe.push(newXe);
    writeDb(db);

    res.status(201).json({
      success: true,
      message: `Đăng ký phương tiện ${cleanBienSo} (${newXe.chuXe}) thành công!`,
      data: newXe
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateXe = (req, res) => {
  try {
    const db = readDb();
    const { id } = req.params;
    const { bienSo, loaiXe, chuXe, soDienThoai, loaiDangKy, hanVeThang, maTheRFID } = req.body;

    const xe = (db.Xe || []).find(x => x.id === id || x.bienSo === id);
    if (!xe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin phương tiện cần cập nhật!'
      });
    }

    if (bienSo) xe.bienSo = bienSo.trim().toUpperCase();
    if (loaiXe) xe.loaiXe = loaiXe;
    if (chuXe !== undefined) xe.chuXe = chuXe.trim();
    if (soDienThoai !== undefined) xe.soDienThoai = soDienThoai.trim();
    if (loaiDangKy) xe.loaiDangKy = loaiDangKy;
    if (hanVeThang !== undefined) xe.hanVeThang = hanVeThang;
    if (maTheRFID !== undefined) xe.maTheRFID = maTheRFID;

    writeDb(db);

    res.json({
      success: true,
      message: `Cập nhật thông tin xe ${xe.bienSo} thành công!`,
      data: xe
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteXe = (req, res) => {
  try {
    const db = readDb();
    const { id } = req.params;

    const xe = (db.Xe || []).find(x => x.id === id || x.bienSo === id);
    if (!xe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phương tiện cần xóa!'
      });
    }

    db.Xe = db.Xe.filter(x => x.id !== xe.id && x.bienSo !== xe.bienSo);
    writeDb(db);

    res.json({
      success: true,
      message: `Đã xóa thông tin xe ${xe.bienSo} (${xe.chuXe}) khỏi danh mục!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 6. Cập nhật Bảng giá dịch vụ (BangGia)
// ==========================================
const updateBangGia = (req, res) => {
  try {
    const db = readDb();
    const { id } = req.params;
    const { giaGioDau, giaGioTiepTheo, giaNgay, giaDem, giaThang, tenLoai } = req.body;

    const item = (db.BangGia || []).find(b => b.id === id || b.loaiXe === id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cấu hình bảng giá tương ứng!'
      });
    }

    if (giaGioDau !== undefined) item.giaGioDau = Number(giaGioDau);
    if (giaGioTiepTheo !== undefined) item.giaGioTiepTheo = Number(giaGioTiepTheo);
    if (giaNgay !== undefined) item.giaNgay = Number(giaNgay);
    if (giaDem !== undefined) item.giaDem = Number(giaDem);
    if (giaThang !== undefined) item.giaThang = Number(giaThang);
    if (tenLoai !== undefined) item.tenLoai = tenLoai;

    writeDb(db);

    res.json({
      success: true,
      message: `Cập nhật biểu phí [${item.tenLoai}] thành công!`,
      data: item
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 7. Cập nhật Trạng thái Ô đỗ xe (ViTri)
// ==========================================
const updateViTriStatus = (req, res) => {
  try {
    const db = readDb();
    const { id } = req.params;
    const { trangThai, trangThaiCode } = req.body;

    const slot = (db.ViTri || []).find(v => v.id === id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy vị trí đỗ '${id}'!`
      });
    }

    if (trangThaiCode === 'DANG_BAO_TRI' || trangThai === 'Bảo trì') {
      slot.trangThai = 'Bảo trì';
      slot.bienSoXe = null;
      slot.thoiGianVao = null;
    } else if (trangThaiCode === 'TRONG' || trangThai === 'Trống') {
      slot.trangThai = 'Trống';
      slot.bienSoXe = null;
      slot.thoiGianVao = null;
    } else if (trangThaiCode === 'DA_DO' || trangThai === 'Đã đỗ') {
      slot.trangThai = 'Đã đỗ';
      if (req.body.bienSoXe) slot.bienSoXe = req.body.bienSoXe;
      if (req.body.thoiGianVao) slot.thoiGianVao = req.body.thoiGianVao;
    }

    writeDb(db);

    res.json({
      success: true,
      message: `Cập nhật trạng thái ô ${slot.id} thành '${slot.trangThai}' thành công!`,
      data: slot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 8. CÁC TÍNH NĂNG DÀNH CHO CỔNG KHÁCH HÀNG
// ==========================================

// GET /api/khach-hang/lich-su: Lịch sử đỗ xe của khách hàng theo biển số
const customerGetHistory = (req, res) => {
  try {
    const { bienSo, search } = req.query;
    const targetPlate = (bienSo || search || '').trim().toUpperCase();
    const list = getTable('LuotVaoRa') || [];

    if (!targetPlate) {
      return res.json({ success: true, data: [] });
    }

    const filtered = list
      .filter(l => l.bienSo && l.bienSo.toUpperCase() === targetPlate)
      .sort((a, b) => new Date(b.thoiGianVao) - new Date(a.thoiGianVao));

    res.json({
      success: true,
      total: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/khach-hang/dat-cho: Đặt trước chỗ đỗ xe (Slot Reservation)
const customerBookSlot = (req, res) => {
  try {
    const db = readDb();
    if (!db.DatCho) db.DatCho = [];

    const { bienSo, loaiXe, maKhuVuc, thoiGianDen, ghiChu, hoTen, soDienThoai } = req.body;
    const khuVucTarget = (maKhuVuc || req.body.khuVuc || '').trim();

    if (!bienSo || !khuVucTarget) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ biển số xe và phân khu mong muốn!'
      });
    }

    const cleanPlate = bienSo.trim().toUpperCase();
    const now = new Date();
    const bookingCode = `BK-${Date.now().toString().slice(-6)}`;

    // Kiểm tra còn chỗ trống trong khu vực không
    const viTriList = db.ViTri || [];
    const availableSlot = viTriList.find(
      v => (v.maKhuVuc === khuVucTarget || v.maKhuVuc === `KV-${khuVucTarget}` || v.id.startsWith(khuVucTarget)) &&
           (v.trangThai === 'Trống' || v.trangThaiCode === 'TRONG')
    );

    if (!availableSlot) {
      return res.status(400).json({
        success: false,
        message: `Phân khu [${khuVucTarget}] hiện không còn vị trí trống để giữ chỗ!`
      });
    }

    const newBooking = {
      id: bookingCode,
      bienSo: cleanPlate,
      loaiXe: loaiXe || 'OTO',
      maKhuVuc: availableSlot.maKhuVuc || khuVucTarget,
      maViTriGiuCho: availableSlot.id,
      hoTen: (hoTen || 'Khách hàng').trim(),
      soDienThoai: (soDienThoai || '').trim(),
      thoiGianDat: now.toISOString(),
      thoiGianDen: thoiGianDen || new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      hanGiuCho: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
      trangThai: 'DA_XAC_NHAN',
      ghiChu: ghiChu || 'Giữ chỗ trực tuyến qua Cổng Khách Hàng'
    };

    db.DatCho.unshift(newBooking);
    writeDb(db);

    res.status(201).json({
      success: true,
      message: `Đặt chỗ thành công! Mã giữ chỗ: ${bookingCode}. Vị trí ưu tiên: ${availableSlot.id} (${maKhuVuc}). Hiệu lực trong 45 phút.`,
      data: newBooking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/khach-hang/ho-tro: Gửi yêu cầu hỗ trợ / báo cáo sự cố (Support Ticket)
const customerSendSupport = (req, res) => {
  try {
    const db = readDb();
    if (!db.YeuCauHoTro) db.YeuCauHoTro = [];

    const { tieuDe, noiDung, bienSo, loaiSuCo, hoTen, soDienThoai } = req.body;

    if (!tieuDe || !noiDung) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tiêu đề và nội dung yêu cầu hỗ trợ!'
      });
    }

    const ticketId = `SUP-${Date.now().toString().slice(-6)}`;
    const newTicket = {
      id: ticketId,
      tieuDe: tieuDe.trim(),
      noiDung: noiDung.trim(),
      bienSo: (bienSo || '').trim().toUpperCase(),
      loaiSuCo: loaiSuCo || 'HO_TRO_CHUNG',
      hoTen: (hoTen || 'Khách hàng').trim(),
      soDienThoai: (soDienThoai || '').trim(),
      thoiGianGui: new Date().toISOString(),
      trangThai: 'DANG_TIEP_NHAN', // DANG_TIEP_NHAN, DANG_XU_LY, DA_GIAI_QUYET
      phanHoi: 'Ban Quản lý đã tiếp nhận yêu cầu và nhân viên an ninh sẽ hỗ trợ bạn trong ít phút.'
    };

    db.YeuCauHoTro.unshift(newTicket);
    writeDb(db);

    res.status(201).json({
      success: true,
      message: `Gửi yêu cầu hỗ trợ #${ticketId} thành công! Đội ngũ an ninh bãi xe sẽ hỗ trợ quý khách ngay.`,
      data: newTicket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/khach-hang/ho-tro: Danh sách phiếu hỗ trợ của khách hàng
const customerGetSupportList = (req, res) => {
  try {
    const { soDienThoai, bienSo } = req.query;
    const list = getTable('YeuCauHoTro') || [];

    let filtered = list;
    if (soDienThoai) {
      filtered = filtered.filter(t => t.soDienThoai === soDienThoai);
    }
    if (bienSo) {
      filtered = filtered.filter(t => t.bienSo && t.bienSo.toUpperCase() === bienSo.toUpperCase());
    }

    res.json({
      success: true,
      total: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/blacklist
 */
const getBlacklist = (req, res) => {
  try {
    const list = getTable('DanhSachDen') || [];
    res.json({
      success: true,
      total: list.length,
      data: list
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/blacklist
 */
const addBlacklist = (req, res) => {
  try {
    const db = readDb();
    if (!db.DanhSachDen) db.DanhSachDen = [];

    const { bienSo, loaiXe, lyDo, mucDo, ghiChu } = req.body;
    if (!bienSo || !lyDo) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Biển số xe và Lý do đưa vào danh sách đen!'
      });
    }

    const cleanPlate = bienSo.trim().toUpperCase();
    const existed = db.DanhSachDen.find(b => b.bienSo.toUpperCase() === cleanPlate);
    if (existed) {
      return res.status(400).json({
        success: false,
        message: `Biển số ${cleanPlate} đã có trong Danh sách đen!`
      });
    }

    const newRecord = {
      id: `BL-${Date.now()}`,
      bienSo: cleanPlate,
      loaiXe: loaiXe || 'OTO',
      lyDo: lyDo.trim(),
      mucDo: mucDo || 'CANH_BAO',
      nguoiTao: req.user?.taiKhoan || 'admin',
      ngayTao: new Date().toISOString().slice(0, 10),
      ghiChu: ghiChu || ''
    };

    db.DanhSachDen.unshift(newRecord);
    writeDb(db);

    res.status(201).json({
      success: true,
      message: `Đã thêm biển số ${cleanPlate} vào danh sách đen thành công!`,
      data: newRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/blacklist/:id
 */
const deleteBlacklist = (req, res) => {
  try {
    const db = readDb();
    const { id } = req.params;

    const before = (db.DanhSachDen || []).length;
    db.DanhSachDen = (db.DanhSachDen || []).filter(b => b.id !== id && b.bienSo !== id);

    if (db.DanhSachDen.length === before) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản ghi trong danh sách đen!'
      });
    }

    writeDb(db);
    res.json({
      success: true,
      message: 'Đã gỡ phương tiện khỏi danh sách đen thành công!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  xeVao,
  xeRa,
  getViTriList,
  updateViTriStatus,
  getDashboard,
  getKhuVucList,
  getXeList,
  createXe,
  updateXe,
  deleteXe,
  getLuotVaoRaList,
  getBangGiaList,
  updateBangGia,
  mockAiDetectEndpoint,
  handleAiAssistant,
  customerGetHistory,
  customerBookSlot,
  customerSendSupport,
  customerGetSupportList,
  getBlacklist,
  addBlacklist,
  deleteBlacklist
};

