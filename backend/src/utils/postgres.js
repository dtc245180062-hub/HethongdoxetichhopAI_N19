const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'doxeai_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Khởi tạo các bảng CSDL quan hệ chuẩn PostgreSQL
async function initPostgresDb() {
  try {
    const client = await pool.connect();
    console.log('✅ Đã kết nối thành công tới CSDL PostgreSQL (doxeai_db)!');

    // 1. Tạo bảng Khu Vực
    await client.query(`
      CREATE TABLE IF NOT EXISTS "KhuVuc" (
        "id" VARCHAR(50) PRIMARY KEY,
        "tenKhuVuc" VARCHAR(255) NOT NULL,
        "loaiXe" VARCHAR(50),
        "sucChua" INT DEFAULT 0,
        "moTa" TEXT
      );
    `);

    // 2. Tạo bảng Vị Trí Ô Đỗ
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ViTri" (
        "id" VARCHAR(50) PRIMARY KEY,
        "maKhuVuc" VARCHAR(50) REFERENCES "KhuVuc"("id") ON DELETE CASCADE,
        "tenViTri" VARCHAR(255) NOT NULL,
        "trangThai" VARCHAR(50) DEFAULT 'Trống',
        "loaiXe" VARCHAR(50),
        "bienSoXe" VARCHAR(50),
        "thoiGianVao" TIMESTAMP
      );
    `);

    // 3. Tạo bảng Bảng Giá Dịch Vụ
    await client.query(`
      CREATE TABLE IF NOT EXISTS "BangGia" (
        "id" VARCHAR(50) PRIMARY KEY,
        "loaiXe" VARCHAR(50) NOT NULL,
        "tenLoai" VARCHAR(255),
        "giaGioDau" NUMERIC(15, 2) DEFAULT 0,
        "giaGioTiepTheo" NUMERIC(15, 2) DEFAULT 0,
        "giaNgay" NUMERIC(15, 2) DEFAULT 0,
        "giaDem" NUMERIC(15, 2) DEFAULT 0,
        "giaThang" NUMERIC(15, 2) DEFAULT 0,
        "donVi" VARCHAR(50) DEFAULT 'VND'
      );
    `);

    // 4. Tạo bảng Phương Tiện & Vé Tháng
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Xe" (
        "id" VARCHAR(50) PRIMARY KEY,
        "bienSo" VARCHAR(50) UNIQUE NOT NULL,
        "loaiXe" VARCHAR(50),
        "chuXe" VARCHAR(255),
        "loaiVe" VARCHAR(50),
        "ngayDangKy" TIMESTAMP,
        "ngayHetHan" TIMESTAMP,
        "trangThai" VARCHAR(50) DEFAULT 'HOAT_DONG'
      );
    `);

    // 5. Tạo bảng Lượt Vào / Ra (Check-in & Check-out)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "LuotVaoRa" (
        "id" VARCHAR(50) PRIMARY KEY,
        "bienSo" VARCHAR(50) NOT NULL,
        "loaiXe" VARCHAR(50),
        "maViTri" VARCHAR(50),
        "thoiGianVao" TIMESTAMP NOT NULL,
        "thoiGianRa" TIMESTAMP,
        "anhVao" TEXT,
        "anhRa" TEXT,
        "trangThai" VARCHAR(50) DEFAULT 'Đang đỗ',
        "tongTien" NUMERIC(15, 2) DEFAULT 0,
        "phuongThucThanhToan" VARCHAR(50),
        "doTinCayAI" NUMERIC(5, 2),
        "soGioGui" INT DEFAULT 0,
        "loaiVe" VARCHAR(50)
      );
    `);

    // 6. Tạo bảng Người Dùng & Phân Quyền
    await client.query(`
      CREATE TABLE IF NOT EXISTS "NguoiDung" (
        "id" VARCHAR(50) PRIMARY KEY,
        "taiKhoan" VARCHAR(100) UNIQUE NOT NULL,
        "matKhau" VARCHAR(255) NOT NULL,
        "hoTen" VARCHAR(255) NOT NULL,
        "vaiTro" VARCHAR(50) NOT NULL,
        "chucVu" VARCHAR(255),
        "soDienThoai" VARCHAR(50),
        "email" VARCHAR(255),
        "trangThai" VARCHAR(50) DEFAULT 'HOAT_DONG',
        "ngayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Tạo bảng Danh Sách Đen (Blacklist)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Blacklist" (
        "id" VARCHAR(50) PRIMARY KEY,
        "bienSo" VARCHAR(50) NOT NULL,
        "loaiXe" VARCHAR(50),
        "lyDo" TEXT NOT NULL,
        "mucDo" VARCHAR(50) DEFAULT 'CANH_BAO',
        "ngayThem" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "ghiChu" TEXT
      );
    `);

    client.release();
    console.log('✅ Khởi tạo và đồng bộ các bảng quan hệ PostgreSQL hoàn tất!');
  } catch (err) {
    console.warn('⚠️ Chưa kết nối được PostgreSQL (sẽ dùng db.json fallback):', err.message);
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initPostgresDb,
};
