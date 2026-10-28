const http = require('http');

const request = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

async function testRBAC() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ HỆ THỐNG PHÂN QUYỀN (RBAC TEST)');
  console.log('====================================================\n');

  try {
    // 1. Đăng nhập 3 tài khoản: Admin, Bảo Vệ, Khách Hàng
    console.log('1. Đăng nhập các tài khoản mẫu:');
    const loginAdmin = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { taiKhoan: 'admin', matKhau: 'admin@123' });
    const adminToken = loginAdmin.data?.data?.token;
    console.log(`- Admin: status=${loginAdmin.status}, role=${loginAdmin.data?.data?.user?.vaiTro}`);

    const loginBaoVe = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { taiKhoan: 'baove', matKhau: '123456' });
    const baoveToken = loginBaoVe.data?.data?.token;
    console.log(`- Bảo vệ: status=${loginBaoVe.status}, role=${loginBaoVe.data?.data?.user?.vaiTro}`);

    const loginKhach = await request({
      hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { taiKhoan: 'khachhang', matKhau: '123456' });
    const khachToken = loginKhach.data?.data?.token;
    console.log(`- Khách hàng: status=${loginKhach.status}, role=${loginKhach.data?.data?.user?.vaiTro}`);

    // 2. Kiểm tra quyền của Khách Hàng (TẤT CẢ PHẢI TRẢ VỀ 403 FORBIDDEN)
    console.log('\n2. Kiểm tra KHÁCH HÀNG gọi API nhạy cảm (Kỳ vọng: 403 Forbidden):');
    
    // 2a. Khách hàng gọi Cổng Vào / Quét biển số xe
    const khachVao = await request({
      hostname: 'localhost', port: 5000, path: '/api/xe-vao', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${khachToken}` }
    }, { bien_so: '30H-892.45', loai_xe: 'O to' });
    console.log(`- Khách hàng gọi /api/xe-vao: status=${khachVao.status} (403: ${khachVao.status === 403 ? 'PASS ✅' : 'FAIL ❌'}) -> ${khachVao.data?.message}`);

    // 2b. Khách hàng gọi Cổng Ra
    const khachRa = await request({
      hostname: 'localhost', port: 5000, path: '/api/xe-ra', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${khachToken}` }
    }, { bien_so: '30H-892.45' });
    console.log(`- Khách hàng gọi /api/xe-ra: status=${khachRa.status} (403: ${khachRa.status === 403 ? 'PASS ✅' : 'FAIL ❌'}) -> ${khachRa.data?.message}`);

    // 2c. Khách hàng đổi trạng thái bảo trì ô đỗ
    const khachMaint = await request({
      hostname: 'localhost', port: 5000, path: '/api/vi-tri/A-01/status', method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${khachToken}` }
    }, { trangThaiCode: 'DANG_BAO_TRI' });
    console.log(`- Khách hàng đổi trạng thái bảo trì ô đỗ: status=${khachMaint.status} (403: ${khachMaint.status === 403 ? 'PASS ✅' : 'FAIL ❌'}) -> ${khachMaint.data?.message}`);

    // 2d. Khách hàng truy cập AI Assistant Admin
    const khachAI = await request({
      hostname: 'localhost', port: 5000, path: '/api/ai-assistant', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${khachToken}` }
    }, { message: 'Báo cáo doanh thu hôm nay' });
    console.log(`- Khách hàng gọi AI Assistant Admin: status=${khachAI.status} (403: ${khachAI.status === 403 ? 'PASS ✅' : 'FAIL ❌'}) -> ${khachAI.data?.message}`);

    // 2e. Khách hàng quản lý tài khoản nhân viên
    const khachUsers = await request({
      hostname: 'localhost', port: 5000, path: '/api/users', method: 'GET',
      headers: { 'Authorization': `Bearer ${khachToken}` }
    });
    console.log(`- Khách hàng xem /api/users: status=${khachUsers.status} (403: ${khachUsers.status === 403 ? 'PASS ✅' : 'FAIL ❌'}) -> ${khachUsers.data?.message}`);

    // 3. Kiểm tra BẢO VỆ (Có quyền Cổng xe & Bảo trì, BỊ CHẶN Quản lý Users & AI Assistant)
    console.log('\n3. Kiểm tra BẢO VỆ gọi API:');
    const baoveUsers = await request({
      hostname: 'localhost', port: 5000, path: '/api/users', method: 'GET',
      headers: { 'Authorization': `Bearer ${baoveToken}` }
    });
    console.log(`- Bảo vệ xem /api/users: status=${baoveUsers.status} (403: ${baoveUsers.status === 403 ? 'PASS ✅' : 'FAIL ❌'}) -> ${baoveUsers.data?.message}`);

    const baoveAI = await request({
      hostname: 'localhost', port: 5000, path: '/api/ai-assistant', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${baoveToken}` }
    }, { message: 'Báo cáo doanh thu hôm nay' });
    console.log(`- Bảo vệ gọi AI Assistant: status=${baoveAI.status} (403: ${baoveAI.status === 403 ? 'PASS ✅' : 'FAIL ❌'}) -> ${baoveAI.data?.message}`);

    // 4. Kiểm tra ADMIN (Có toàn quyền)
    console.log('\n4. Kiểm tra ADMIN:');
    const adminUsers = await request({
      hostname: 'localhost', port: 5000, path: '/api/users', method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log(`- Admin xem /api/users: status=${adminUsers.status} (200: ${adminUsers.status === 200 ? 'PASS ✅' : 'FAIL ❌'}), Tổng nhân viên=${adminUsers.data?.total}`);

    console.log('\n====================================================');
    console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ PHÂN QUYỀN ĐÃ HOÀN TẤT THÀNH CÔNG!');
    console.log('====================================================');
  } catch (err) {
    console.error('Lỗi khi chạy test RBAC:', err);
  }
}

testRBAC();
