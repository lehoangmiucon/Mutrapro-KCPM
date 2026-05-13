// DÁN LÊN DÒNG 1 CỦA FILE auth-service/index.js
process.on('unhandledRejection', (reason, promise) => {
    console.error('!!! LỖI UNHANDLED REJECTION !!!:', reason);
    promise.catch(err => console.error('!!! LỖI TRONG PROMISE !!!:', err));
    process.exit(1); // Thoát ngay lập tức
});
process.on('uncaughtException', (error) => {
    console.error('!!! LỖI UNCAUGHT EXCEPTION !!!:', error);
    process.exit(1); // Thoát ngay lập tức
});

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' }); // Sửa path .env về 1 cấp

// ======================= SỬA LỖI PATH Ở ĐÂY =======================
const { logger } = require('./shared/logger');
const { asyncHandler, notFound, errorHandler, AppError } = require('./shared/middleware/errorHandler');
// ==================================================================

// === THÊM KẾT NỐI REDIS ===
const Redis = require('ioredis');
const redis = new Redis({
    host: 'redis_cache', // Tên service trong docker-compose
    port: 6379,
});
redis.on('connect', () => {
    logger.info('Auth-service đã kết nối với Redis Cache.');
});
redis.on('error', (err) => {
    logger.error('Auth-service không thể kết nối Redis', err);
});
// === KẾT THÚC THÊM MỚI ===

// ======================= SỬA LỖI PATH Ở ĐÂY =======================
const {
    registerValidation,
    loginValidation,
    idParamValidation,
    // === IMPORT VALIDATION MỚI ===
    adminCreateUserValidation,
    adminUpdateUserValidation
} = require('./shared/middleware/validation');
// ==================================================================

const { authMiddleware, checkRole } = require('./middleware/authMiddleware');
const app = express();
app.use(cors());
app.use(express.json());

//  🔹  Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'auth-service',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_AUTH_NAME,
    charset: 'utf8mb4',
    // collation: 'utf8mb4_unicode_ci', // <- Bạn nên xóa dòng này để hết cảnh báo MySQL
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
const pool = mysql.createPool(dbConfig);

// --- API Endpoints ---
// 1. API: Đăng ký người dùng
app.post('/register', registerValidation, asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const [result] = await pool.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'customer']
    );
    logger.info(`New user registered: ${email}`);
    res.status(201).json({ id: result.insertId, message: 'User registered successfully' });
}));

// 2. API: Đăng nhập
app.post('/login', loginValidation, asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
        throw new AppError('Email hoặc mật khẩu không đúng.', 401);
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new AppError('Email hoặc mật khẩu không đúng.', 401);
    }
    const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    delete user.password_hash;
    logger.info(`User logged in: ${email}`);
    res.json({ message: 'Login successful', token, user });
}));

// 3. API MỚI: Xác thực token
app.get('/verify', authMiddleware, (req, res) => {
    res.json({ message: 'Token is valid', user: req.user });
});

// 4. API: Lấy danh sách chuyên viên theo vai trò
app.get('/users/specialists', authMiddleware, checkRole('coordinator'), asyncHandler(async (req, res) => {
    const { role } = req.query;
    const specialistRoles = ['transcriber', 'arranger', 'artist'];
    if (!role || !specialistRoles.includes(role)) {
        throw new AppError('Vai trò chuyên viên không hợp lệ.', 400);
    }
    const [specialists] = await pool.execute(
        'SELECT id, name FROM users WHERE role = ?',
        [role]
    );
    res.json(specialists);
}));

// 5. API: Cập nhật tên người dùng
app.put('/users/:id', authMiddleware, idParamValidation, asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.id, 10);
    const { name } = req.body;
    if (req.user.id !== targetUserId) {
        throw new AppError('Bạn không có quyền thực hiện hành động này.', 403);
    }
    if (!name) {
        throw new AppError('Tên không được để trống.', 400);
    }
    const [result] = await pool.execute('UPDATE users SET name = ? WHERE id = ?', [name, targetUserId]);
    // === THÊM LỆNH XÓA CACHE ===
    if (result.affectedRows > 0) {
        const customerCacheKey = `user:${targetUserId}:name`;
        await redis.del(customerCacheKey); // Lệnh xóa key
        logger.info(`[Cache] Đã xóa key ${customerCacheKey} do user cập nhật tên.`);
    }
    // === KẾT THÚC THÊM MỚI ===
    if (result.affectedRows === 0) {
        throw new AppError('Không tìm thấy người dùng.', 404);
    }
    logger.info(`User profile updated: ${req.user.email}`);
    res.json({ message: 'Cập nhật hồ sơ thành công.' });
}));

// 6. API: Đổi mật khẩu
app.put('/users/:id/password', authMiddleware, idParamValidation, asyncHandler(async (req, res) => {
    const targetUserId = parseInt(req.params.id, 10);
    const { oldPassword, newPassword } = req.body;
    if (req.user.id !== targetUserId) {
        throw new AppError('Bạn không có quyền thực hiện hành động này.', 403);
    }
    if (!oldPassword || !newPassword || newPassword.length < 6) {
        throw new AppError('Vui lòng cung cấp mật khẩu cũ và mật khẩu mới (ít nhất 6 ký tự).', 400);
    }
    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [targetUserId]);
    if (rows.length === 0) {
        throw new AppError('Không tìm thấy người dùng.', 404);
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
        throw new AppError('Mật khẩu cũ không đúng.', 401);
    }
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedNewPassword, targetUserId]);
    logger.info(`User password changed: ${req.user.email}`);
    res.json({ message: 'Đổi mật khẩu thành công.' });
}));

// 7. API: Lấy thông tin cơ bản của một user (dùng nội bộ giữa các service)
app.get('/users/:id', idParamValidation, asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT id, name, email, role FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
        throw new AppError('Không tìm thấy người dùng.', 404);
    }
    res.json(rows[0]);
}));

// 8. API MỚI: Lấy IDs theo vai trò (dùng nội bộ)
app.get('/users/by-role/:role', asyncHandler(async (req, res) => {
    const { role } = req.params;
    // Lấy chỉ ID
    const [users] = await pool.execute('SELECT id FROM users WHERE role = ?', [role]);
    res.json(users); // Sẽ trả về [ {id: 2}, {id: 4}, ... ]
}));

// === START: API MỚI CHO ADMIN CRUD USERS ===
// 9. API (Admin): Lấy tất cả người dùng
app.get('/admin/users', authMiddleware, checkRole('admin'), asyncHandler(async (req, res) => {
    // Lấy tất cả user, loại bỏ password_hash
    const [users] = await pool.execute('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
}));

// 10. API (Admin): Tạo người dùng mới
app.post('/admin/users', authMiddleware, checkRole('admin'), adminCreateUserValidation, asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const [result] = await pool.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role]
    );
    logger.info(`Admin created new user: ${email} (Role: ${role})`);
    res.status(201).json({ id: result.insertId, message: 'Tạo người dùng thành công' });
}));

// 11. API (Admin): Cập nhật người dùng
app.put('/admin/users/:id', authMiddleware, checkRole('admin'), idParamValidation, adminUpdateUserValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    // Admin không được phép sửa tài khoản của chính mình qua API này để tránh tự khóa
    if (parseInt(id, 10) === req.user.id) {
        throw new AppError('Không thể tự sửa vai trò của chính mình. Vui lòng sửa trong CSDL.', 400);
    }
    const [result] = await pool.execute(
        'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
        [name, email, role, id]
    );
    // === THÊM LỆNH XÓA CACHE ===
    if (result.affectedRows > 0) {
        const customerCacheKey = `user:${id}:name`;
        await redis.del(customerCacheKey); // Lệnh xóa key
        logger.info(`[Cache] Admin đã xóa key ${customerCacheKey} do user cập nhật.`);
    }
    // === KẾT THÚC THÊM MỚI ===
    if (result.affectedRows === 0) {
        throw new AppError('Không tìm thấy người dùng.', 404);
    }
    logger.info(`Admin updated user ID: ${id}`);
    res.json({ message: 'Cập nhật người dùng thành công' });
}));

// 12. API (Admin): Xóa người dùng
app.delete('/admin/users/:id', authMiddleware, checkRole('admin'), idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Ngăn admin tự xóa mình
    if (parseInt(id, 10) === req.user.id) {
        throw new AppError('Bạn không thể tự xóa chính mình.', 400);
    }
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
        throw new AppError('Không tìm thấy người dùng.', 404);
    }
    logger.info(`Admin deleted user ID: ${id}`);
    res.json({ message: 'Xóa người dùng thành công' });
}));
// === END: API MỚI CHO ADMIN CRUD USERS ===

// --- Middleware xử lý cuối cùng ---
app.use(notFound);
app.use(errorHandler);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    logger.info(`Auth Service is running on port ${PORT}`);
});
