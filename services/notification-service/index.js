// services/notification-service/index.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const { logger } = require('./shared/logger');
require('dotenv').config({ path: '../.env' });

// ========== FIREBASE ADMIN SDK ==========
const admin = require("firebase-admin");

try {
  const serviceAccount = require("./firebase-admin-sdk.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  logger.info("✅ Firebase Admin SDK initialized successfully.");
} catch (error) {
  logger.error("❌ Lỗi khi khởi tạo Firebase Admin SDK!");
  logger.error("Hãy đảm bảo file 'firebase-admin-sdk.json' tồn tại trong thư mục services/notification-service/");
  logger.error(error.message);
}

// ========== EXPRESS + SOCKET.IO SETUP ==========
const app = express();
const corsOptions = {
  origin: "http://localhost:3000", // React frontend
  methods: ["GET", "POST"]
};
app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'notification-service',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

// ========== SOCKET USER MANAGEMENT ==========
let onlineUsers = {};

const addUser = (userId, socketId) => {
  onlineUsers[userId] = socketId;
  logger.info(`🔌 User ${userId} connected (socket: ${socketId}). Total online: ${Object.keys(onlineUsers).length}`);
};

const removeUser = (socketId) => {
  for (const [userId, sId] of Object.entries(onlineUsers)) {
    if (sId === socketId) {
      delete onlineUsers[userId];
      logger.info(`❎ User ${userId} disconnected (socket: ${socketId}).`);
      break;
    }
  }
};

io.on("connection", (socket) => {
  logger.info(`New client connected: ${socket.id}`);
  socket.on("addUser", (userId) => addUser(userId, socket.id));
  socket.on("disconnect", () => removeUser(socket.id));
});

// ========== MYSQL POOL ==========
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NOTIFICATION_NAME,
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
const pool = mysql.createPool(dbConfig);

// ========== FCM PUSH NOTIFICATION ==========
const sendPushNotification = async (userId, eventName, data) => {
  try {
    // 1️⃣ Lấy FCM tokens từ DB
    const [rows] = await pool.execute(
      "SELECT fcm_token FROM user_devices WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      logger.warn(`[FCM] User ${userId} không có FCM token.`);
      return;
    }

    const tokens = rows.map(r => r.fcm_token);

    // 2️⃣ Chuẩn bị nội dung thông báo
    const message = {
      notification: {
        title: "Thông báo mới từ MuTraPro",
        body: data?.message || `Bạn có cập nhật từ sự kiện: ${eventName}`
      },
      webpush: {
        fcmOptions: { link: 'http://localhost:3000/dashboard' }
      },
      tokens
    };

    // 3️⃣ Gửi thông báo (cú pháp chuẩn)
    const response = await admin.messaging().sendEachForMulticast(message);

    logger.info(`[FCM] ✅ Gửi thành công ${response.successCount}, thất bại ${response.failureCount} (User ${userId})`);
  } catch (error) {
    logger.error(`[FCM] ❌ Lỗi khi gửi notification cho User ${userId}: ${error.message}`);
  }
};

// ========== API ENDPOINTS ==========

// 📨 Lưu notification vào DB (nội bộ)
app.post('/send', async (req, res) => {
  try {
    const { user_id, title, message, channel } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, title, message, channel, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [user_id, title, message, channel || 'push']
    );
    logger.info(`📬 Notification for user #${user_id} saved.`);
    res.status(201).json({ id: result.insertId, message: 'Notification saved successfully' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 📱 Đăng ký thiết bị (FCM)
app.post('/register-device', async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'Thiếu thông tin userId hoặc fcmToken' });
    }

    await pool.execute(
      "INSERT INTO user_devices (user_id, fcm_token) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id=user_id",
      [userId, fcmToken]
    );

    logger.info(`🔑 FCM token registered for user ${userId}`);
    res.status(200).json({ message: 'Thiết bị đã được đăng ký thành công' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Lỗi đăng ký thiết bị' });
  }
});

// 📡 Gửi notification real-time
app.post('/notify', async (req, res) => {
  const { userId, eventName, data } = req.body;
  logger.info(`📢 /notify: userId=${userId}, event=${eventName}`);

  if (userId === 'broadcast') {
    io.emit(eventName, data);
    logger.info(`Broadcast event '${eventName}' tới tất cả client.`);
    return res.status(200).json({ message: 'Đã broadcast.' });
  }

  const receiverSocketId = onlineUsers[userId];
  if (receiverSocketId) {
    io.to(receiverSocketId).emit(eventName, data);
    logger.info(`📨 Gửi realtime event '${eventName}' tới user ${userId} (${receiverSocketId})`);
    return res.status(200).json({ message: 'Đã gửi realtime notification.' });
  } else {
    logger.warn(`⚠️ User ${userId} offline → gửi FCM notification...`);
    sendPushNotification(userId, eventName, data); // chạy ngầm
    return res.status(200).json({ message: 'User offline, đã gửi push notification.' });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3006;
server.listen(PORT, () => {
  logger.info(`🚀 Notification Service (HTTP + WS) đang chạy tại cổng ${PORT}`);
});
