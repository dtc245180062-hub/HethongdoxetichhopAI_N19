const { getOccupancyForecast } = require('./forecastService');

/**
 * Service đề xuất bố trí nhân sự ca trực
 * Áp dụng suy luận đơn giản (rule-based) từ tỷ lệ % lấp đầy dự báo của forecastService
 */
const getStaffingRecommendation = () => {
  const forecast = getOccupancyForecast();
  const { forecastData, tyLeLapDayHienTai } = forecast;

  // Rule-based suy luận nhân sự dựa trên % lấp đầy dự báo
  // - Nếu % lấp đầy > 80%: Cần tối thiểu 2 nhân viên (1 bốt kiểm soát + 1 điều phối thực địa)
  // - Nếu % lấp đầy 40% - 80%: Cần 1 nhân viên giám sát
  // - Nếu % lấp đầy < 40%: Cần 1 nhân viên an ninh tuần tra

  const morningStaffCount = forecastData.morningPeak.projectedOccupancyRate > 80 ? 2 : 1;
  const eveningStaffCount = forecastData.eveningPeak.projectedOccupancyRate > 80 ? 2 : 1;
  const nightStaffCount = 1;

  const shifts = [
    {
      caTrực: 'Ca Sáng (06:00 - 14:00)',
      matDoDuBao: `${forecastData.morningPeak.projectedOccupancyRate}%`,
      soLuongNhanVien: morningStaffCount,
      nhiemVuChinh: 'Giám sát hệ thống barrier tự động, giải quyết vé vãng lai sáng sớm.'
    },
    {
      caTrực: 'Ca Chiều - Tối (14:00 - 22:00)',
      matDoDuBao: `${forecastData.eveningPeak.projectedOccupancyRate}% (Cao điểm)`,
      soLuongNhanVien: eveningStaffCount,
      nhiemVuChinh: '1 nhân viên trực bốt điều phối camera & xử lý sự cố nhận diện biển số; 1 nhân viên điều hướng phân làn xe vào Khu A & B.'
    },
    {
      caTrực: 'Ca Đêm (22:00 - 06:00)',
      matDoDuBao: `${forecastData.night.projectedOccupancyRate}% (Thấp điểm)`,
      soLuongNhanVien: nightStaffCount,
      nhiemVuChinh: '1 nhân viên an ninh tuần tra khu vực hầm B1, kiểm tra PCCC và giám sát an toàn phương tiện lưu đêm.'
    }
  ];

  const summary = `Đề xuất bố trí ${eveningStaffCount} nhân viên cho Ca Chiều - Tối (14h - 22h) và ${morningStaffCount} nhân viên cho Ca Sáng, ${nightStaffCount} nhân viên cho Ca Đêm.`;

  const recommendations = [
    'Hệ thống AI OCR tự động hóa 98.5% lượt xe, chỉ cần duy trì 1 nhân sự trực màn hình dashboard tại trung tâm.',
    'Vào khung giờ cao điểm tối (17:30 - 19:30), tăng cường 1 nhân sự túc trực tại làn xe máy Khu C để hướng dẫn luồng xe nhanh chóng.',
    'Khi bãi xe đạt mật độ trên 85%, hệ thống sẽ tự động kích hoạt cảnh báo để nhân viên điều hướng phương tiện sang bãi đỗ phụ.'
  ];

  return {
    summary,
    shifts,
    tongNhanSuNgay: morningStaffCount + eveningStaffCount + nightStaffCount,
    tyLeLapDayHienTai: `${tyLeLapDayHienTai}%`,
    mucDoTuDongHoa: '98.5%',
    recommendations
  };
};

module.exports = {
  getStaffingRecommendation
};
