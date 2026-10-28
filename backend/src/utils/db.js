const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/db.json');

// Đọc toàn bộ dữ liệu từ db.json
const readDb = () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialData = {
        KhuVuc: [],
        ViTri: [],
        Xe: [],
        LuotVaoRa: [],
        BangGia: []
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Lỗi khi đọc file db.json:', error);
    throw new Error('Không thể đọc cơ sở dữ liệu JSON');
  }
};

// Ghi dữ liệu vào db.json
const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Lỗi khi ghi file db.json:', error);
    throw new Error('Không thể cập nhật cơ sở dữ liệu JSON');
  }
};

// Lấy danh sách một bảng cụ thể
const getTable = (tableName) => {
  const db = readDb();
  return db[tableName] || [];
};

// Cập nhật dữ liệu cho một bảng cụ thể
const updateTable = (tableName, records) => {
  const db = readDb();
  db[tableName] = records;
  writeDb(db);
  return db[tableName];
};

module.exports = {
  readDb,
  writeDb,
  getTable,
  updateTable
};
