// services/order-service/index.js (ĐÃ CẬP NHẬT HOÀN CHỈNH VỚI RABBITMQ)
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const axios = require('axios');
const amqp = require('amqplib'); // <-- (MQ) THÊM DÒNG NÀY
require('dotenv').config({ path: '../../.env' });

// Import các module dùng chung
// ======================= SỬA LỖI PATH Ở ĐÂY =======================
// Đường dẫn đúng là './shared' (cùng cấp), không phải '../../shared'
const { logger } = require('./shared/logger');
const { asyncHandler, notFound, errorHandler, AppError } = require('./shared/middleware/errorHandler');
const { createOrderValidation, idParamValidation, feedbackValidation } = require('./shared/middleware/validation');
// ==================================================================

// === THÊM KẾT NỐI REDIS ===
const Redis = require('ioredis');
const redis = new Redis({
    host: 'redis_cache', // Tên service bạn đặt trong docker-compose.yml
    port: 6379,
});
redis.on('connect', () => {
    logger.info('Order-service đã kết nối với Redis Cache.');
});
redis.on('error', (err) => {
    logger.error('Không thể kết nối Redis', err);
});
// === KẾT THÚC THÊM MỚI ===

// TODO: Tạm thời giả lập auth, sẽ được thay thế bằng logic gọi qua API Gateway
const authMiddleware = (req, res, next) => next();
const checkRole = (...roles) => (req, res, next) => next();
const app = express();
app.use(cors());
app.use(express.json());
//  🔹  Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        service: 'order-service',
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_ORDER_NAME,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
const pool = mysql.createPool(dbConfig);
// Hàm helper để gửi thông báo
const notify = async (userId, eventName, data) => {
    try {
        await axios.post('http://notification-service:3006/notify', { userId, eventName, data });
    } catch (err) {
        logger.error(`Lỗi khi gửi thông báo '${eventName}'`, { error: err.message });
    }
};

// === (MQ) THÊM HÀM GỬI TIN NHẮN RABBITMQ ===
const amqpUrl = 'amqp://user:password@rabbitmq'; // Chuỗi kết nối RabbitMQ
const exchangeName = 'mutrapro_events';

// Hàm helper mới để gửi tin nhắn
const publishMessage = async (routingKey, message) => {
  let connection;
  try {
    connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();
    
    // Đảm bảo exchange tồn tại
    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    
    // Gửi tin nhắn
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(message)));
    
    logger.info(`[RabbitMQ] Đã gửi tin nhắn. Key: ${routingKey}`, message);
    await channel.close();
  } catch (err) {
    logger.error('[RabbitMQ] Lỗi khi gửi tin nhắn:', err.message);
  } finally {
    if (connection) await connection.close();
  }
};
// === KẾT THÚC HÀM MỚI ===

// --- API Endpoints ---
// API: Tạo đơn hàng mới (yêu cầu vai trò 'customer')
// SỬA: Bỏ '/orders'
app.post('/', authMiddleware, checkRole('customer'), createOrderValidation, asyncHandler(async (req, res) => {
    const { customer_id, service_type, description, price } = req.body;
    const [result] = await pool.execute(
        `INSERT INTO orders (customer_id, service_type, description, price, status) VALUES (?, ?, ?, ?, 'pending')`,
        [customer_id, service_type, description, price]
    )
    ;
// === SỬA LỖI PUSH NOTIFICATION (Bỏ 'broadcast') ===
try {
    // 1. Gọi auth-service để lấy TẤT CẢ IDs của coordinator
    const authResponse = await axios.get('http://auth-service:3001/users/by-role/coordinator');
    const coordinators = authResponse.data; // Mảng [ {id: 2}, {id: 9} ]

    // 2. Gửi thông báo cho từng coordinator
    const notificationData = {
        orderId: result.insertId,
        message: `Có đơn hàng mới #${result.insertId} đang chờ được phân công.`
    };

    for (const coord of coordinators) {
        // Gọi notify cho từng ID
        notify(coord.id, 'new_order_pending', notificationData);
    }
    logger.info(`[Notify] Đã gửi thông báo 'new_order_pending' đến ${coordinators.length} coordinator.`);

} catch (err) {
    logger.error(`[Notify] Lỗi nghiêm trọng khi gửi thông báo cho coordinator: ${err.message}`);
}
// === KẾT THÚC SỬA LỖI ===

    logger.info(`New order created with ID: ${result.insertId}`);
    res.status(201).json({ id: result.insertId, message: 'Order created' });
}));

// API: Lấy TẤT CẢ đơn hàng (yêu cầu coordinator/admin)
// SỬA: Bỏ '/orders'
app.get('/', authMiddleware, checkRole('coordinator', 'admin'), asyncHandler(async (req, res) => {
    // 1. Lấy tất cả đơn hàng
    const [orders] = await pool.execute('SELECT * FROM orders ORDER BY created_at DESC');
    // 2. Lấy tất cả feedback (để map cho hiệu quả)
    const [feedbackRows] = await pool.execute('SELECT order_id, rating, comment FROM feedback');
    const feedbackMap = new Map();
    feedbackRows.forEach(fb => {
        feedbackMap.set(fb.order_id, { rating: fb.rating, comment: fb.comment });
    });
    // 3. Làm giàu dữ liệu
    const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
            let assignedSpecialistName = null;

            // === KHỐI LOGIC ĐÃ ĐƯỢC CẬP NHẬT VỚI REDIS ===
            try {
                // ======================= SỬA LỖI 404 Ở ĐÂY =======================
                // Code CŨ: `http://task-service:3003/tasks/order/${order.id}`
                // Code MỚI: (Đã xóa /tasks)
                const taskResponse = await axios.get(`http://task-service:3003/order/${order.id}`);
                // =================================================================

                const specialistId = taskResponse.data.assigned_to;

                // === PHẦN SỬA CACHE BẮT ĐẦU TỪ ĐÂY ===
                const specialistCacheKey = `user:${specialistId}:name`;
                const cachedName = await redis.get(specialistCacheKey);

                if (cachedName) {
                    assignedSpecialistName = cachedName;
                    logger.info(`[Cache] HIT for specialist ${specialistId}`); // ĐÃ BẬT LOG
                } else {
                    // Gọi qua auth-service để lấy tên chuyên viên
                    logger.info(`[Cache] MISS for specialist ${specialistId}. Fetching...`); // ĐÃ BẬT LOG
                    const authResponse = await axios.get(`http://auth-service:3001/users/${specialistId}`);
                    assignedSpecialistName = authResponse.data.name;
                    // Lưu vào cache
                    await redis.set(specialistCacheKey, assignedSpecialistName, 'EX', 3600);
                }
                // === KẾT THÚC PHẦN SỬA CACHE ===

            } catch (error) {
                // Không sao, có thể là đơn hàng 'pending' chưa có task
                if (error.response?.status !== 404) {
                    logger.warn(`[Order Service] Lỗi khi lấy task/user cho order ${order.id}:`, { message: error.message });
                }
            }
            // === KẾT THÚC KHỐI CẬP NHẬT ===
            // Lấy feedback từ map
            const feedback = feedbackMap.get(order.id) || null;
            return {
                ...order,
                assignedSpecialist: assignedSpecialistName,
                feedback: feedback
            };
        })
    );
    res.json(enrichedOrders);
}));

// === START: DI CHUYỂN ROUTE LÊN TRÊN ===
// API: Lấy thống kê (yêu cầu admin hoặc coordinator)
// GIỮ NGUYÊN - API Gateway sẽ gọi /api/orders/stats
app.get('/stats', authMiddleware, checkRole('admin', 'coordinator'), asyncHandler(async (req, res) => {
    const [revenueRows] = await pool.execute("SELECT SUM(amount) as totalRevenue FROM payment WHERE status = 'paid'");
    const [statusRows] = await pool.execute("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
    const [totalOrdersRows] = await pool.execute("SELECT COUNT(*) as totalOrders FROM orders");
    res.json({
        totalRevenue: revenueRows[0].totalRevenue || 0,
        orderStats: statusRows,
        totalOrders: totalOrdersRows[0].totalOrders || 0
    });
}));

// API: (Admin) LẤY TẤT CẢ GIAO DỊCH
// GIỮ NGUYÊN - API Gateway sẽ gọi /api/orders/admin/payments
app.get('/admin/payments', authMiddleware, checkRole('admin'), asyncHandler(async (req, res) => {
    // 1. Lấy tất cả giao dịch từ bảng payment
    const [payments] = await pool.execute(
        'SELECT * FROM payment ORDER BY created_at DESC'
    );
    if (payments.length === 0) {
        return res.json([]);
    }
    // 2. Làm giàu dữ liệu: Lấy tên khách hàng từ auth-service
    const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
            let customerName = 'Không rõ';

            // === KHỐI LOGIC CẬP NHẬT VỚI REDIS ===
            const customerCacheKey = `user:${payment.customer_id}:name`;
            try {
                const cachedName = await redis.get(customerCacheKey);
                if (cachedName) {
                    customerName = cachedName;
                    logger.info(`[Cache] HIT for user ${payment.customer_id} (in payments)`);
                } else {
                    logger.info(`[Cache] MISS for user ${payment.customer_id} (in payments). Fetching...`);
                    const authResponse = await axios.get(`http://auth-service:3001/users/${payment.customer_id}`);
                    customerName = authResponse.data.name;
                    await redis.set(customerCacheKey, customerName, 'EX', 3600);
                }
            } catch (error) {
                if (error.response?.status !== 404) {
                    logger.warn(`[Order Service] Lỗi khi lấy user ${payment.customer_id}:`, { message: error.message });
                }
            }
            // === HẾT KHỐI LOGIC ===
            return {
                ...payment,
                customer_name: customerName
            };
        })
    );
    res.json(enrichedPayments);
}));
// === END: DI CHUYỂN ROUTE ===

// API: Lấy tất cả đơn hàng của một khách hàng (yêu cầu đúng customer hoặc admin)
// SỬA: Bỏ '/orders'
app.get('/customer/:customerId', authMiddleware, asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    // if (req.user.id !== parseInt(customerId, 10) && req.user.role !== 'admin') {
    //  throw new AppError('Không có quyền truy cập', 403);
    // }
    const [orders] = await pool.execute('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
    // Làm giàu dữ liệu
    const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
            if (order.service_type === 'recording' && order.status !== 'pending') {
                try {
                    const bookingResponse = await axios.get(`http://studio-service:3005/bookings/order/${order.id}`);
                    return { ...order, studioInfo: bookingResponse.data };
                } catch (error) {
                    if (error.response && error.response.status !== 404) {
                        logger.error(`[Order Service] Lỗi khi lấy booking cho order ${order.id}:`, { message: error.message });
                    }
                    return order;
                }
            }
            return order;
        })
    );
    res.json(enrichedOrders);
}));

// API: Lấy chi tiết một đơn hàng
// SỬA: Bỏ '/orders'
// *** ROUTE NÀY PHẢI NẰM SAU CÁC ROUTE CỤ THỂ (như /stats) ***
app.get('/:id', authMiddleware, idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // 1. Lấy thông tin order và feedback (ĐÃ SỬA LỖI SQL SYNTAX)
    const [rows] = await pool.execute(
        `SELECT o.*, f.rating, f.comment 
        FROM orders o
        LEFT JOIN feedback f ON o.id = f.order_id
        WHERE o.id = ?`,
        [id]
    );
    if (rows.length === 0) {
        throw new AppError('Không tìm thấy đơn hàng.', 404);
    }
    const order = rows[0];
    // === KHỐI LOGIC ĐÃ ĐƯỢC CẬP NHẬT VỚI REDIS ===
    let customerName = 'Không rõ';
    // 1. Định nghĩa một key cache duy nhất cho user này
    const customerCacheKey = `user:${order.customer_id}:name`;
    try {
        // 2. Thử lấy dữ liệu từ Redis TRƯỚC
        const cachedName = await redis.get(customerCacheKey);
        if (cachedName) {
            // 3. CACHE HIT: Tìm thấy!
            customerName = cachedName;
            logger.info(`[Cache] HIT for user ${order.customer_id}`); // ĐÃ BẬT LOG
        } else {
            // 4. CACHE MISS: Không tìm thấy.
            logger.info(`[Cache] MISS for user ${order.customer_id}. Fetching...`); // ĐÃ BẬT LOG
            const authResponse = await axios.get(`http://auth-service:3001/users/${order.customer_id}`);
            customerName = authResponse.data.name;
            // 5. Lưu kết quả vào cache cho lần sau
            await redis.set(customerCacheKey, customerName, 'EX', 3600);
        }
    } catch (error) {
        // Logic xử lý lỗi giữ nguyên như cũ
        if (error.response?.status !== 404) {
            logger.warn(`[Order Service] Lỗi khi lấy user ${order.customer_id} cho order ${id}:`, { message: error.message });
        }
    }
    // === END: PHẦN THAY THẾ ===
    const enrichedOrder = {
        ...order,
        customer_name: customerName // Thêm tên khách hàng vào object
    };
    // === END: LÀM GIÀU DỮ LIỆU ===
    // 3. Trả về order đã có tên khách hàng
    res.json(enrichedOrder);
}));

// API: Cập nhật trạng thái đơn hàng (yêu cầu coordinator hoặc admin)
// SỬA: Bỏ '/orders'
app.put('/:id/status', authMiddleware, checkRole('coordinator', 'admin'), idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const [orderRows] = await pool.execute('SELECT customer_id FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
        throw new AppError('Không tìm thấy đơn hàng.', 404);
    }
    const customerId = orderRows[0].customer_id;
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    notify(customerId, 'order_status_updated', {
        orderId: id,
        newStatus: status,
        message: `Trạng thái đơn hàng #${id} của bạn đã được cập nhật thành: ${status}.`
    });
    logger.info(`Order #${id} status updated to ${status}`);
    res.json({ message: 'Order status updated successfully' });
}));

// API: Thanh toán (yêu cầu customer)
// SỬA: Bỏ '/orders'
app.post('/:id/pay', authMiddleware, checkRole('customer'), idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { customer_id, amount, method } = req.body;
    await pool.query('START TRANSACTION');
    const  [updateResult] = await pool.execute(
        "UPDATE orders SET status = ? WHERE id = ? AND (status = 'completed' OR status = 'fixed')",
        ['paid', id]
    );
    if (updateResult.affectedRows === 0) {
        await pool.query('ROLLBACK');
        throw new AppError('Đơn hàng không hợp lệ để thanh toán.', 400);
    }
    await pool.execute(
        `INSERT INTO payment (order_id, customer_id, amount, method, status) VALUES (?, ?, ?, ?, 'paid')`,
        [id, customer_id, amount, method || 'credit_card']
    );
    await pool.query('COMMIT');
    logger.info(`Payment successful for order #${id}`);
    res.json({ message: 'Thanh toán thành công!' });
}));

// API: Gửi feedback (yêu cầu customer)
// SỬA: Bỏ '/orders'
app.post('/:id/feedback', authMiddleware, checkRole('customer'), idParamValidation, feedbackValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    // ======================= SỬA LỖI SQL UNDEFINED =======================
    const finalComment = comment || null; // Chuyển undefined (nếu có) thành null
    // ===================================================================

    const [existing] = await pool.execute('SELECT id FROM feedback WHERE order_id = ?', [id]);
    if (existing.length > 0) {
        throw new AppError('Đơn hàng này đã được đánh giá.', 409);
    }
    await pool.execute(
        'INSERT INTO feedback (order_id, rating, comment) VALUES (?, ?, ?)',
        [id, rating, finalComment] // <-- Sử dụng biến đã sửa
    );
    logger.info(`New feedback submitted for order #${id}`);
    res.status(201).json({ message: 'Gửi đánh giá thành công!' });
}));

// API: Kiểm tra feedback đã tồn tại chưa
// SỬA: Bỏ '/orders'
app.get('/:id/feedback', authMiddleware, idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT id FROM feedback WHERE order_id = ?', [id]);
    res.json({ hasFeedback: rows.length > 0 });
}));

// API: Khách hàng yêu cầu chỉnh sửa (yêu cầu customer)
// SỬA: Bỏ '/orders'
app.post('/:id/request-revision', authMiddleware, checkRole('customer'), idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { comment, coordinatorId } = req.body; // Lấy comment và ID của coordinator để gửi thông báo
    // 1. Cập nhật trạng thái đơn hàng thành 'revision_requested'
    const [updateResult] = await pool.execute(
        "UPDATE orders SET status = 'revision_requested' WHERE id = ? AND (status = 'completed' OR status = 'fixed')", // Cho phép sửa lại cả đơn đã 'fixed'
        [id]
    );
    if (updateResult.affectedRows === 0) {
        throw new AppError('Đơn hàng không hợp lệ để yêu cầu chỉnh sửa.', 400);
    }
    
    // === (MQ) THAY THẾ KHỐI AXIOS BẰNG RABBITMQ ===
    // 2. (Quan trọng) Gửi tin nhắn qua RabbitMQ cho task-service
    const routingKey = 'order.revision_requested';
    const message = {
        orderId: id,
        comment: comment
    };
    await publishMessage(routingKey, message);
    // KHÔNG CẦN try...catch...rollback nữa!
    // === KẾT THÚC THAY THẾ ===

    // 3. Thông báo cho coordinator biết có yêu cầu chỉnh sửa
    if (coordinatorId) {
        notify(coordinatorId, 'revision_requested', {
            orderId: id,
            message: `Khách hàng vừa yêu cầu chỉnh sửa cho đơn hàng #${id}. Lý do: ${comment}`
        });
    }
    logger.info(`Revision requested for order #${id}`);
    res.json({ message: 'Yêu cầu chỉnh sửa đã được gửi đi.' });
}));

// --- Middleware xử lý cuối cùng ---
app.use(notFound);
app.use(errorHandler);
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    logger.info(`Order Service is running on port ${PORT}`);
});
