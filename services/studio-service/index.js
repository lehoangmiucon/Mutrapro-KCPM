// services/studio-service/index.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config({ path: '../.env', quiet: true });

// ======================= Sá»¬A Lá»–I PATH á» ÄĂ‚Y =======================
const { logger } = require('./shared/logger');
const { asyncHandler, notFound, errorHandler, AppError } = require('./shared/middleware/errorHandler');
const { responseHandler } = require('./shared/middleware/responseHandler');
const { idParamValidation } = require('./shared/middleware/validation');
const { authMiddleware, checkRole } = require('./shared/middleware/auth');
// ==================================================================

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(responseHandler);

//  đŸ”¹  Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'studio-service',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_STUDIO_NAME,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
const pool = mysql.createPool(dbConfig);

const notify = async (userId, eventName, data) => {
    try {
        await axios.post('http://notification-service:3006/notify', { userId, eventName, data });
    } catch (err) {
        logger.error(`Failed to send notification '${eventName}'.`, { error: err.message });
    }
};

// --- API Endpoints ---
// API: Láº¥y danh sĂ¡ch táº¥t cáº£ phĂ²ng thu (cĂ´ng khai)
app.get('/studios', asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM studios ORDER BY name ASC');
    res.json(rows);
}));

// API: Äáº·t lá»‹ch phĂ²ng thu (yĂªu cáº§u vai trĂ² 'artist')
app.post('/bookings', authMiddleware, checkRole('artist'), asyncHandler(async (req, res) => {
    const { studio_id, order_id, start_time, end_time, studioAdminId } = req.body;
    const artist_id = req.user.id;
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new AppError('ThĂ¡Â»Âi gian Ă„â€˜Ă¡ÂºÂ·t lĂ¡Â»â€¹ch khÄ‚Â´ng hĂ¡Â»Â£p lĂ¡Â»â€¡.', 400);
    }
    if (startDate <= new Date()) {
        throw new AppError('KhÄ‚Â´ng thĂ¡Â»Æ’ Ă„â€˜Ă¡ÂºÂ·t lĂ¡Â»â€¹ch trong quÄ‚Â¡ khĂ¡Â»Â©.', 400);
    }
    if (startDate >= endDate) {
        throw new AppError('ThĂ¡Â»Âi gian kĂ¡ÂºÂ¿t thÄ‚Âºc phĂ¡ÂºÂ£i sau thĂ¡Â»Âi gian bĂ¡ÂºÂ¯t Ă„â€˜Ă¡ÂºÂ§u.', 400);
    }
    const [conflicts] = await pool.execute(
        `SELECT id FROM booking
         WHERE studio_id = ?
           AND status = 'scheduled'
           AND start_time < ?
           AND end_time > ?
         LIMIT 1`,
        [studio_id, end_time, start_time]
    );
    if (conflicts.length > 0) {
        throw new AppError('Khung giĂ¡Â»Â nÄ‚Â y Ă„â€˜Ä‚Â£ cÄ‚Â³ lĂ¡Â»â€¹ch Ă„â€˜Ă¡ÂºÂ·t.', 409);
    }
    const [result] = await pool.execute(
        `INSERT INTO booking (studio_id, artist_id, order_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, 'scheduled')`,
        [studio_id, artist_id, order_id, start_time, end_time]
    );
    if (studioAdminId) {
        notify(studioAdminId, 'new_booking', {
            studioId: studio_id,
            orderId: order_id,
            message: `CĂ³ má»™t lá»‹ch Ä‘áº·t má»›i táº¡i phĂ²ng thu cá»§a báº¡n cho Ä‘Æ¡n hĂ ng #${order_id}.`
        });
    }
    logger.info(`New booking created for studio #${studio_id} by artist #${artist_id}`);
    res.status(201).json({ id: result.insertId, message: 'Booking created' });
}));

// API: Láº¥y thĂ´ng tin booking theo order ID (dĂ¹ng cho service khĂ¡c)
app.get('/bookings/order/:orderId', asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const [rows] = await pool.execute(`
        SELECT s.name as studioName, s.location, b.start_time, b.end_time
        FROM booking b JOIN studios s ON b.studio_id = s.id
        WHERE b.order_id = ? LIMIT 1`,
        [orderId]
    );
    if (rows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y lá»‹ch Ä‘áº·t cho Ä‘Æ¡n hĂ ng nĂ y.', 404);
    }
    res.json(rows[0]);
}));

// --- API DĂ€NH RIĂNG CHO ADMIN PHĂ’NG THU ---
// API: Láº¥y toĂ n bá»™ lá»‹ch Ä‘áº·t (yĂªu cáº§u 'studio_admin')
app.get('/bookings/all', authMiddleware, checkRole('studio_admin'), asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(`
        SELECT b.id, b.order_id, b.start_time, b.end_time, s.name as studio_name
        FROM booking b JOIN studios s ON b.studio_id = s.id
        WHERE b.status = 'scheduled' ORDER BY b.start_time ASC`);
    res.json(rows);
}));

app.post('/bookings/:id/confirm', authMiddleware, checkRole('studio_admin', 'admin'), asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM booking WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y lá»‹ch Ä‘áº·t.', 404);
    }
    const booking = rows[0];
    const [conflicts] = await pool.execute(
        `SELECT id FROM booking
         WHERE studio_id = ?
           AND id <> ?
           AND status = 'scheduled'
           AND start_time < ?
           AND end_time > ?
         LIMIT 1`,
        [booking.studio_id, booking.id, booking.end_time, booking.start_time]
    );
    if (conflicts.length > 0) {
        throw new AppError('Khung giá» nĂ y Ä‘Ă£ cĂ³ lá»‹ch Ä‘áº·t.', 409);
    }
    await pool.execute("UPDATE booking SET status = 'scheduled' WHERE id = ?", [booking.id]);
    res.json({ success: true, message: 'Booking confirmed.', data: { id: booking.id } });
}));

app.post('/bookings/:id/reject', authMiddleware, checkRole('studio_admin', 'admin'), asyncHandler(async (req, res) => {
    const [result] = await pool.execute("UPDATE booking SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y lá»‹ch Ä‘áº·t.', 404);
    }
    res.json({ success: true, message: 'Booking rejected.', data: { id: req.params.id } });
}));

app.post('/bookings/:id/cancel', authMiddleware, asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM booking WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y lá»‹ch Ä‘áº·t.', 404);
    }
    const booking = rows[0];
    if (!['admin', 'studio_admin'].includes(req.user.role) && Number(booking.artist_id) !== Number(req.user.id)) {
        throw new AppError('Báº¡n khĂ´ng cĂ³ quyá»n há»§y lá»‹ch nĂ y.', 403);
    }
    await pool.execute("UPDATE booking SET status = 'cancelled' WHERE id = ?", [booking.id]);
    res.json({ success: true, message: 'Booking cancelled.', data: { id: booking.id } });
}));

// API: Cáº­p nháº­t tráº¡ng thĂ¡i phĂ²ng thu (yĂªu cáº§u 'studio_admin')
app.put('/studios/:id/status', authMiddleware, checkRole('studio_admin'), idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['available', 'booked', 'maintenance'];
    if (!validStatuses.includes(status)) {
        throw new AppError('Tráº¡ng thĂ¡i khĂ´ng há»£p lá»‡.', 400);
    }
    const [result] = await pool.execute('UPDATE studios SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y phĂ²ng thu.', 404);
    }
    notify('broadcast', 'studio_status_updated', {
        studioId: id,
        newStatus: status
    });
    logger.info(`Studio #${id} status updated to ${status}`);
    res.json({ message: 'Cáº­p nháº­t tráº¡ng thĂ¡i phĂ²ng thu thĂ nh cĂ´ng.' });
}));

// --- Middleware xá»­ lĂ½ cuá»‘i cĂ¹ng ---
app.use(notFound);
app.use(errorHandler);
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    logger.info(`Studio Service is running on port ${PORT}`);
});


