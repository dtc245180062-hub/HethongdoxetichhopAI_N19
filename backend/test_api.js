const http = require('http');

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ BACKEND API DOXEAI ===\n');

  try {
    // 1. Test GET /api/health
    console.log('1. Kiểm tra GET /api/health:');
    const health = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    console.log(`Status: ${health.status}`, health.data);

    // 2. Test GET /api/dashboard
    console.log('\n2. Kiểm tra GET /api/dashboard:');
    const dashboard = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard',
      method: 'GET'
    });
    console.log(`Status: ${dashboard.status}`, dashboard.data?.data);

    // 3. Test GET /api/vi-tri
    console.log('\n3. Kiểm tra GET /api/vi-tri:');
    const viTri = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/vi-tri',
      method: 'GET'
    });
    console.log(`Status: ${viTri.status}, Tổng số vị trí: ${viTri.data?.total}`);
    if (viTri.data?.data) {
      console.log('Mẫu 3 vị trí đầu tiên:', viTri.data.data.slice(0, 3));
    }

    // 4. Test POST /api/xe-vao với Cảnh báo độ tin cậy AI thấp (< 0.70)
    console.log('\n4. Kiểm tra POST /api/xe-vao (Cảnh báo độ tin cậy thấp force_low_conf):');
    const testLowConf = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/xe-vao',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        bien_so: '99A-999.99',
        loai_xe: 'O to',
        force_low_conf: true
      }
    );
    console.log(`Status: ${testLowConf.status}`, testLowConf.data);

    // 5. Test POST /api/xe-vao thành công (Xe vào bãi + gán vị trí)
    console.log('\n5. Kiểm tra POST /api/xe-vao thành công (Override hoặc độ tin cậy cao):');
    const testVaoOto = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/xe-vao',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        bien_so: '30K-999.88',
        loai_xe: 'O to',
        override: true
      }
    );
    console.log(`Status: ${testVaoOto.status}`, testVaoOto.data);

    // 6. Test POST /api/xe-vao cho Xe máy (5k/lượt)
    console.log('\n6. Kiểm tra POST /api/xe-vao cho Xe máy:');
    const testVaoXeMay = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/xe-vao',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        bien_so: '29B1-888.88',
        loai_xe: 'Xe may',
        override: true
      }
    );
    console.log(`Status: ${testVaoXeMay.status}`, testVaoXeMay.data);

    // 7. Test POST /api/xe-ra (Tính phí ô tô & giải phóng chỗ)
    console.log('\n7. Kiểm tra POST /api/xe-ra cho ô tô:');
    const testRaOto = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/xe-ra',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        bien_so: '30K-999.88',
        phuongThucThanhToan: 'QR_CODE'
      }
    );
    console.log(`Status: ${testRaOto.status}`, testRaOto.data);

    // 8. Test POST /api/xe-ra (Tính phí xe máy 5k & giải phóng chỗ)
    console.log('\n8. Kiểm tra POST /api/xe-ra cho xe máy:');
    const testRaXeMay = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/xe-ra',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        bien_so: '29B1-888.88',
        phuongThucThanhToan: 'TIEN_MAT'
      }
    );
    console.log(`Status: ${testRaXeMay.status}`, testRaXeMay.data);

    console.log('\n=== TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐÃ HOÀN TẤT THÀNH CÔNG ===');
  } catch (err) {
    console.error('Lỗi khi chạy test:', err);
  }
}

// Khởi chạy test
runTests();
