const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const parkingRoutes = require('./src/routes/parkingRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ tĩnh ảnh đã upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'DoXeAI Backend API'
  });
});

// Main API Routes
app.use('/api', parkingRoutes);
app.use('/admin', parkingRoutes); // Hỗ trợ endpoint trực tiếp /admin/assistant/ask

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Lỗi Server:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi hệ thống nội bộ'
  });
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`🚀 DoXeAI Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log(`📊 API Overview: http://localhost:${PORT}/api/overview`);
  console.log(`================================================`);
});
