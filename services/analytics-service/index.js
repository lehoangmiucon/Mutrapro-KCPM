const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config({ path: '../.env' }); // Sửa path .env về 1 cấp

// Sửa đường dẫn require cho đúng
const  { logger } = require('./shared/logger');
const  { asyncHandler, notFound, errorHandler, AppError } = require('./shared/middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'analytics-service',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Kết nối CSDL MỚI (analytics)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_ANALYTICS_NAME, // <-- Đọc từ CSDL báo cáo
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
const pool = mysql.createPool(dbConfig);

// API duy nhất: Lấy báo cáo đã được NiFi chuẩn bị
// API này SIÊU NHẸ, chỉ là 1 câu SELECT đơn giản
app.get('/stats', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT json_value FROM report_dashboard WHERE report_name = 'dashboard_stats'"
  );

  if (rows.length === 0) {
    // Trả về dữ liệu rỗng nếu NiFi chưa chạy
    return res.json({"totalRevenue": 0, "totalOrders": 0, "orderStats": []});
  }

  // Trả về JSON đã được NiFi tính toán và lưu trữ
  res.json(rows[0].json_value);
}));

// --- Middleware xử lý cuối cùng ---
app.use(notFound);
app.use(errorHandler);

const PORT = 3008; // (Port mới)
app.listen(PORT, () => {
  logger.info(`🚀 Analytics Service is running on port ${PORT}`);
});
