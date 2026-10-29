const { readDb } = require('../utils/db');

/**
 * Service thống kê doanh thu & phân bổ theo phương thức thanh toán
 * Phục vụ báo cáo tài chính và cung cấp dữ liệu cho Admin AI Assistant
 */
const getRevenueReport = () => {
  const db = readDb();
  const luotList = db.LuotVaoRa || [];
  const viTriList = db.ViTri || [];

  // Lọc các lượt xe đã hoàn tất thanh toán và ra khỏi bãi
  const daRaList = luotList.filter(l => l.trangThai === 'DA_RA' || l.trangThai === 'Đã ra');
  const tongDoanhThu = daRaList.reduce((sum, item) => sum + (item.tongTien || 0), 0);
  const soLuotDaRa = daRaList.length;

  // Phân bổ doanh thu theo phương thức thanh toán
  const breakdown = {
    QR_CODE: {
      ten: 'Chuyển khoản QR (VietQR / Napas)',
      soLuot: 0,
      soTien: 0,
      tyLe: 0
    },
    TIEN_MAT: {
      ten: 'Tiền mặt tại bốt thu phí',
      soLuot: 0,
      soTien: 0,
      tyLe: 0
    },
    THE_THANG: {
      ten: 'Thẻ tháng / Thuê bao cư dân',
      soLuot: 0,
      soTien: 0,
      tyLe: 0
    }
  };

  daRaList.forEach(l => {
    const pt = (l.phuongThucThanhToan || '').toUpperCase();
    const tien = l.tongTien || 0;

    if (pt.includes('QR')) {
      breakdown.QR_CODE.soLuot += 1;
      breakdown.QR_CODE.soTien += tien;
    } else if (pt.includes('TIEN') || pt.includes('MAT') || pt.includes('CASH')) {
      breakdown.TIEN_MAT.soLuot += 1;
      breakdown.TIEN_MAT.soTien += tien;
    } else if (pt.includes('THANG') || pt.includes('THE') || pt.includes('CARD') || pt.includes('RFID')) {
      breakdown.THE_THANG.soLuot += 1;
      breakdown.THE_THANG.soTien += tien;
    } else {
      // Mặc định quy về QR hoặc Tiền mặt nếu không xác định
      breakdown.QR_CODE.soLuot += 1;
      breakdown.QR_CODE.soTien += tien;
    }
  });

  // Tính tỷ lệ % theo số tiền
  if (tongDoanhThu > 0) {
    breakdown.QR_CODE.tyLe = Math.round((breakdown.QR_CODE.soTien / tongDoanhThu) * 100);
    breakdown.TIEN_MAT.tyLe = Math.round((breakdown.TIEN_MAT.soTien / tongDoanhThu) * 100);
    breakdown.THE_THANG.tyLe = Math.max(0, 100 - breakdown.QR_CODE.tyLe - breakdown.TIEN_MAT.tyLe);
  }

  // Tạm tính doanh thu từ các xe đang đỗ trong bãi
  const xeOtoDangDo = viTriList.filter(
    v => (v.trangThai === 'DA_DO' || v.trangThai === 'Đã đỗ') && v.loaiXe === 'OTO'
  ).length;

  const xeMayDangDo = viTriList.filter(
    v => (v.trangThai === 'DA_DO' || v.trangThai === 'Đã đỗ') && v.loaiXe === 'XE_MAY'
  ).length;

  const doanhThuDuKienLuyKe = (xeOtoDangDo * 20000) + (xeMayDangDo * 5000);

  return {
    tongDoanhThu,
    soLuotDaRa,
    breakdown,
    xeOtoDangDo,
    xeMayDangDo,
    doanhThuDuKienLuyKe,
    tyLeThanhToanKhongTienMat: `${breakdown.QR_CODE.tyLe + breakdown.THE_THANG.tyLe}%`,
    ngayBaoCao: new Date().toISOString().split('T')[0]
  };
};

module.exports = {
  getRevenueReport
};
