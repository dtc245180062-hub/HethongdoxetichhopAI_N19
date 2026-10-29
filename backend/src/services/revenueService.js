const { readDb } = require('../utils/db');

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (GMT+7)
 */
const getVietnamDateStr = (dateInput = new Date()) => {
  if (!dateInput) return null;
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return null;
  // Chuyển sang múi giờ Việt Nam (UTC+7)
  const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
  return vnTime.toISOString().slice(0, 10);
};

/**
 * Định dạng tiền tệ VNĐ chuẩn Việt Nam
 */
const formatVND = (amount = 0) => {
  return (amount || 0).toLocaleString('vi-VN') + ' VNĐ';
};

/**
 * Service tính toán doanh thu thời gian thực và bóc tách chuẩn xác theo từng ngày
 * Phục vụ báo cáo tài chính, Dashboard và Trợ lý AI Quản trị
 */
const getRevenueReport = (targetDate = null) => {
  const db = readDb();
  const luotList = db.LuotVaoRa || [];
  const viTriList = db.ViTri || [];

  const now = new Date();
  const todayVn = getVietnamDateStr(now);
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const yesterdayVn = getVietnamDateStr(yesterday);

  // Lọc tất cả các lượt xe đã hoàn tất thanh toán và ra khỏi bãi
  const daRaList = luotList.filter(l => l.trangThai === 'DA_RA' || l.trangThai === 'Đã ra');

  // Nhóm doanh thu theo từng ngày thực tế (GMT+7)
  const byDate = {};
  let tongDoanhThuLuyKe = 0;
  let tongLuotLuyKe = daRaList.length;

  daRaList.forEach(l => {
    // Ưu tiên thời gian ra thực tế (thời điểm thanh toán hoàn tất), nếu không có dùng thời gian vào
    const dateStr = getVietnamDateStr(l.thoiGianRa || l.thoiGianVao) || 'KHONG_XAC_DINH';
    if (!byDate[dateStr]) {
      byDate[dateStr] = {
        ngay: dateStr,
        tongTien: 0,
        soLuot: 0,
        qr: { soTien: 0, soLuot: 0, tyLe: 0 },
        tienMat: { soTien: 0, soLuot: 0, tyLe: 0 },
        theThang: { soTien: 0, soLuot: 0, tyLe: 0 },
        xeMay: { soLuot: 0, soTien: 0 },
        oto: { soLuot: 0, soTien: 0 }
      };
    }

    const r = byDate[dateStr];
    const tien = l.tongTien || 0;
    r.tongTien += tien;
    r.soLuot += 1;
    tongDoanhThuLuyKe += tien;

    const pt = (l.phuongThucThanhToan || '').toUpperCase();
    if (pt.includes('QR')) {
      r.qr.soTien += tien;
      r.qr.soLuot += 1;
    } else if (pt.includes('TIEN') || pt.includes('MAT') || pt.includes('CASH')) {
      r.tienMat.soTien += tien;
      r.tienMat.soLuot += 1;
    } else {
      r.theThang.soTien += tien;
      r.theThang.soLuot += 1;
    }

    if (l.loaiXe === 'Xe may' || l.loaiXe === 'XE_MAY') {
      r.xeMay.soLuot += 1;
      r.xeMay.soTien += tien;
    } else {
      r.oto.soLuot += 1;
      r.oto.soTien += tien;
    }
  });

  // Tính tỷ lệ % phương thức thanh toán cho từng ngày
  Object.values(byDate).forEach(r => {
    if (r.tongTien > 0) {
      r.qr.tyLe = Math.round((r.qr.soTien / r.tongTien) * 100);
      r.tienMat.tyLe = Math.round((r.tienMat.soTien / r.tongTien) * 100);
      r.theThang.tyLe = Math.max(0, 100 - r.qr.tyLe - r.tienMat.tyLe);
    }
  });

  // Số liệu HÔM NAY (Thời gian thực)
  const homNay = byDate[todayVn] || {
    ngay: todayVn,
    tongTien: 0,
    soLuot: 0,
    qr: { soTien: 0, soLuot: 0, tyLe: 0 },
    tienMat: { soTien: 0, soLuot: 0, tyLe: 0 },
    theThang: { soTien: 0, soLuot: 0, tyLe: 0 },
    xeMay: { soLuot: 0, soTien: 0 },
    oto: { soLuot: 0, soTien: 0 }
  };

  // Số liệu HÔM QUA
  const homQua = byDate[yesterdayVn] || {
    ngay: yesterdayVn,
    tongTien: 0,
    soLuot: 0,
    qr: { soTien: 0, soLuot: 0, tyLe: 0 },
    tienMat: { soTien: 0, soLuot: 0, tyLe: 0 },
    theThang: { soTien: 0, soLuot: 0, tyLe: 0 },
    xeMay: { soLuot: 0, soTien: 0 },
    oto: { soLuot: 0, soTien: 0 }
  };

  // Tính tăng trưởng hôm nay so với hôm qua
  let tangTruongPhanTram = 0;
  if (homQua.tongTien > 0) {
    tangTruongPhanTram = Math.round(((homNay.tongTien - homQua.tongTien) / homQua.tongTien) * 100);
  } else if (homNay.tongTien > 0) {
    tangTruongPhanTram = 100;
  }

  // Danh sách thống kê từng ngày (sắp xếp giảm dần theo ngày)
  const danhSachNgay = Object.values(byDate)
    .sort((a, b) => b.ngay.localeCompare(a.ngay))
    .map(item => {
      const parts = item.ngay.split('-');
      const ngayFormat = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.ngay;
      let nhan = ngayFormat;
      if (item.ngay === todayVn) nhan = 'Hôm nay';
      else if (item.ngay === yesterdayVn) nhan = 'Hôm qua';

      return {
        ...item,
        ngayFormat,
        nhan,
        tongTienFormatted: formatVND(item.tongTien)
      };
    });

  // Tình trạng xe đang đỗ trong bãi (thời gian thực)
  const xeOtoDangDo = viTriList.filter(
    v => (v.trangThai === 'DA_DO' || v.trangThai === 'Đã đỗ') && v.loaiXe === 'OTO'
  ).length;

  const xeMayDangDo = viTriList.filter(
    v => (v.trangThai === 'DA_DO' || v.trangThai === 'Đã đỗ') && v.loaiXe === 'XE_MAY'
  ).length;

  const doanhThuDuKienLuyKe = (xeOtoDangDo * 20000) + (xeMayDangDo * 5000);

  // Breakdown cho hôm nay (tương thích giao diện cũ)
  const breakdownHomNay = {
    QR_CODE: {
      ten: 'Chuyển khoản QR (VietQR / Napas)',
      soLuot: homNay.qr.soLuot,
      soTien: homNay.qr.soTien,
      tyLe: homNay.qr.tyLe
    },
    TIEN_MAT: {
      ten: 'Tiền mặt tại bốt thu phí',
      soLuot: homNay.tienMat.soLuot,
      soTien: homNay.tienMat.soTien,
      tyLe: homNay.tienMat.tyLe
    },
    THE_THANG: {
      ten: 'Thẻ tháng / Thuê bao cư dân',
      soLuot: homNay.theThang.soLuot,
      soTien: homNay.theThang.soTien,
      tyLe: homNay.theThang.tyLe
    }
  };

  const tyLeKhongTienMatHomNay = homNay.tongTien > 0
    ? `${homNay.qr.tyLe + homNay.theThang.tyLe}%`
    : '100%';

  return {
    // DOANH THU HÔM NAY (THỜI GIAN THỰC)
    doanhThuHomNay: homNay.tongTien,
    soLuotHomNay: homNay.soLuot,
    breakdownHomNay,
    breakdown: breakdownHomNay, // Alias tương thích
    tongDoanhThu: homNay.tongTien, // Chuẩn hóa: doanh thu thực của ngày hôm nay
    soLuotDaRa: homNay.soLuot,     // Chuẩn hóa: số lượt ra trong ngày hôm nay
    tyLeThanhToanKhongTienMat: tyLeKhongTienMatHomNay,
    tangTruongPhanTram,

    // DOANH THU HÔM QUA
    doanhThuHomQua: homQua.tongTien,
    soLuotHomQua: homQua.soLuot,

    // DANH SÁCH CHI TIẾT THEO NGÀY
    danhSachNgay,

    // TỔNG DOANH THU LŨY KẾ TOÀN BỘ CÁC NGÀY (ALL-TIME)
    tongDoanhThuLuyKe,
    tongLuotLuyKe,

    // PHƯƠNG TIỆN ĐANG ĐỖ THỜI GIAN THỰC
    xeOtoDangDo,
    xeMayDangDo,
    doanhThuDuKienLuyKe,

    // THỜI ĐIỂM BÁO CÁO
    ngayBaoCao: todayVn,
    thoiGianCapNhat: new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  };
};

module.exports = {
  getRevenueReport,
  getVietnamDateStr,
  formatVND
};
