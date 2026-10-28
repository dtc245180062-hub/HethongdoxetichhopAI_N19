const http = require('http');

const ask = (prompt) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ message: prompt });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/ai-assistant',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

async function test() {
  console.log('=== KIỂM THỬ AI ASSISTANT API ===\n');

  console.log('1. Test UC-12 (Khung giờ cao điểm):');
  const r1 = await ask('Khung giờ nào đông xe nhất trong ngày?');
  console.log('Topic:', r1.data?.data?.topic);
  console.log('Summary:', r1.data?.data?.summary);

  console.log('\n2. Test UC-13 (Báo cáo doanh thu):');
  const r2 = await ask('Hãy báo cáo doanh thu hôm nay');
  console.log('Topic:', r2.data?.data?.topic);
  console.log('Summary:', r2.data?.data?.summary);

  console.log('\n3. Test UC-14 (Bố trí nhân sự):');
  const r3 = await ask('Nên bố trí bao nhiêu nhân sự ca chiều?');
  console.log('Topic:', r3.data?.data?.topic);
  console.log('Summary:', r3.data?.data?.summary);

  console.log('\n=== HOÀN TẤT KIỂM THỬ AI ASSISTANT ===');
}

test();
