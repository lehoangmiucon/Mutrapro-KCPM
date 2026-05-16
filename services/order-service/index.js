// services/order-service/index.js (ÄĂƒ Cáº¬P NHáº¬T HOĂ€N CHá»ˆNH Vá»I RABBITMQ)
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const axios = require('axios');
const amqp = require('amqplib'); // <-- (MQ) THĂM DĂ’NG NĂ€Y
require('dotenv').config({ path: '../../.env', quiet: true });

// Import cĂ¡c module dĂ¹ng chung
// ======================= Sá»¬A Lá»–I PATH á» ÄĂ‚Y =======================
// ÄÆ°á»ng dáº«n Ä‘Ăºng lĂ  './shared' (cĂ¹ng cáº¥p), khĂ´ng pháº£i '../../shared'
const { logger } = require('./shared/logger');
const { asyncHandler, notFound, errorHandler, AppError } = require('./shared/middleware/errorHandler');
const { responseHandler } = require('./shared/middleware/responseHandler');
const { createOrderValidation, idParamValidation, feedbackValidation } = require('./shared/middleware/validation');
const { authMiddleware, checkRole, assertOwnerOrRole } = require('./shared/middleware/auth');
// ==================================================================

// === THĂM Káº¾T Ná»I REDIS ===
const Redis = require('ioredis');
const redis = new Redis({
    host: 'redis_cache', // TĂªn service báº¡n Ä‘áº·t trong docker-compose.yml
    port: 6379,
});
redis.on('connect', () => {
    logger.info('Order service connected to Redis cache.');
});
redis.on('error', (err) => {
    logger.error('Order service failed to connect to Redis.', { message: err.message });
});
// === Káº¾T THĂC THĂM Má»I ===

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(responseHandler);
//  đŸ”¹  Health check route
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
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
const pool = mysql.createPool(dbConfig);
// HĂ m helper Ä‘á»ƒ gá»­i thĂ´ng bĂ¡o
const notify = async (userId, eventName, data) => {
    try {
        await axios.post('http://notification-service:3006/notify', { userId, eventName, data });
    } catch (err) {
        logger.error(`Failed to send notification '${eventName}'.`, { error: err.message });
    }
};

// === (MQ) THĂM HĂ€M Gá»¬I TIN NHáº®N RABBITMQ ===
const amqpUrl = 'amqp://user:password@rabbitmq'; // Chuá»—i káº¿t ná»‘i RabbitMQ
const exchangeName = 'mutrapro_events';

// HĂ m helper má»›i Ä‘á»ƒ gá»­i tin nháº¯n
const publishMessage = async (routingKey, message) => {
  let connection;
  try {
    connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();
    
    // Äáº£m báº£o exchange tá»“n táº¡i
    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    
    // Gá»­i tin nháº¯n
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(message)));
    
    logger.info(`[RabbitMQ] Message published. Key: ${routingKey}`, message);
    await channel.close();
  } catch (err) {
    logger.error('[RabbitMQ] Failed to publish message.', { message: err.message });
  } finally {
    if (connection) await connection.close();
  }
};
// === Káº¾T THĂC HĂ€M Má»I ===

// --- API Endpoints ---
// API: Táº¡o Ä‘Æ¡n hĂ ng má»›i (yĂªu cáº§u vai trĂ² 'customer')
// Sá»¬A: Bá» '/orders'
app.post('/', authMiddleware, checkRole('customer'), createOrderValidation, asyncHandler(async (req, res) => {
    const { service_type, description, price } = req.body;
    const customer_id = req.user.id;
    const [result] = await pool.execute(
        `INSERT INTO orders (customer_id, service_type, description, price, status) VALUES (?, ?, ?, ?, 'pending')`,
        [customer_id, service_type, description, price]
    )
    ;
// === Sá»¬A Lá»–I PUSH NOTIFICATION (Bá» 'broadcast') ===
try {
    // 1. Gá»i auth-service Ä‘á»ƒ láº¥y Táº¤T Cáº¢ IDs cá»§a coordinator
    const authResponse = await axios.get('http://auth-service:3001/users/by-role/coordinator');
    const coordinators = authResponse.data; // Máº£ng [ {id: 2}, {id: 9} ]

    // 2. Gá»­i thĂ´ng bĂ¡o cho tá»«ng coordinator
    const notificationData = {
        orderId: result.insertId,
        message: `CĂ³ Ä‘Æ¡n hĂ ng má»›i #${result.insertId} Ä‘ang chá» Ä‘Æ°á»£c phĂ¢n cĂ´ng.`
    };

    for (const coord of coordinators) {
        // Gá»i notify cho tá»«ng ID
        notify(coord.id, 'new_order_pending', notificationData);
    }
    logger.info(`[Notify] Sent 'new_order_pending' to ${coordinators.length} coordinator(s).`);

} catch (err) {
    logger.error(`[Notify] Failed to notify coordinators: ${err.message}`);
}
// === Káº¾T THĂC Sá»¬A Lá»–I ===

    logger.info(`New order created with ID: ${result.insertId}`);
    res.status(201).json({ id: result.insertId, message: 'Order created' });
}));

// API: Láº¥y Táº¤T Cáº¢ Ä‘Æ¡n hĂ ng (yĂªu cáº§u coordinator/admin)
// Sá»¬A: Bá» '/orders'
app.get('/', authMiddleware, checkRole('coordinator', 'admin'), asyncHandler(async (req, res) => {
    // 1. Láº¥y táº¥t cáº£ Ä‘Æ¡n hĂ ng
    const [orders] = await pool.execute('SELECT * FROM orders ORDER BY created_at DESC');
    // 2. Láº¥y táº¥t cáº£ feedback (Ä‘á»ƒ map cho hiá»‡u quáº£)
    const [feedbackRows] = await pool.execute('SELECT order_id, rating, comment FROM feedback');
    const feedbackMap = new Map();
    feedbackRows.forEach(fb => {
        feedbackMap.set(fb.order_id, { rating: fb.rating, comment: fb.comment });
    });
    // 3. LĂ m giĂ u dá»¯ liá»‡u
    const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
            let assignedSpecialistName = null;

            // === KHá»I LOGIC ÄĂƒ ÄÆ¯á»¢C Cáº¬P NHáº¬T Vá»I REDIS ===
            try {
                // ======================= Sá»¬A Lá»–I 404 á» ÄĂ‚Y =======================
                // Code CÅ¨: `http://task-service:3003/tasks/order/${order.id}`
                // Code Má»I: (ÄĂ£ xĂ³a /tasks)
                const taskResponse = await axios.get(`http://task-service:3003/order/${order.id}`);
                // =================================================================

                const specialistId = taskResponse.data.assigned_to;

                // === PHáº¦N Sá»¬A CACHE Báº®T Äáº¦U Tá»ª ÄĂ‚Y ===
                const specialistCacheKey = `user:${specialistId}:name`;
                const cachedName = await redis.get(specialistCacheKey);

                if (cachedName) {
                    assignedSpecialistName = cachedName;
                    logger.info(`[Cache] HIT for specialist ${specialistId}`);
                } else {
                    // Gá»i qua auth-service Ä‘á»ƒ láº¥y tĂªn chuyĂªn viĂªn
                    logger.info(`[Cache] MISS for specialist ${specialistId}. Fetching...`);
                    const authResponse = await axios.get(`http://auth-service:3001/users/${specialistId}`);
                    assignedSpecialistName = authResponse.data.name;
                    // LÆ°u vĂ o cache
                    await redis.set(specialistCacheKey, assignedSpecialistName, 'EX', 3600);
                }
                // === Káº¾T THĂC PHáº¦N Sá»¬A CACHE ===

            } catch (error) {
                // KhĂ´ng sao, cĂ³ thá»ƒ lĂ  Ä‘Æ¡n hĂ ng 'pending' chÆ°a cĂ³ task
                if (error.response?.status !== 404) {
                    logger.warn(`[Order Service] Failed to fetch task/user for order ${order.id}.`, { message: error.message });
                }
            }
            // === Káº¾T THĂC KHá»I Cáº¬P NHáº¬T ===
            // Láº¥y feedback tá»« map
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

// === START: DI CHUYá»‚N ROUTE LĂN TRĂN ===
// API: Láº¥y thá»‘ng kĂª (yĂªu cáº§u admin hoáº·c coordinator)
// GIá»® NGUYĂN - API Gateway sáº½ gá»i /api/orders/stats
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

// API: (Admin) Láº¤Y Táº¤T Cáº¢ GIAO Dá»CH
// GIá»® NGUYĂN - API Gateway sáº½ gá»i /api/orders/admin/payments
app.get('/admin/payments', authMiddleware, checkRole('admin'), asyncHandler(async (req, res) => {
    // 1. Láº¥y táº¥t cáº£ giao dá»‹ch tá»« báº£ng payment
    const [payments] = await pool.execute(
        'SELECT * FROM payment ORDER BY created_at DESC'
    );
    if (payments.length === 0) {
        return res.json([]);
    }
    // 2. LĂ m giĂ u dá»¯ liá»‡u: Láº¥y tĂªn khĂ¡ch hĂ ng tá»« auth-service
    const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
            let customerName = 'KhĂ´ng rĂµ';

            // === KHá»I LOGIC Cáº¬P NHáº¬T Vá»I REDIS ===
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
                    logger.warn(`[Order Service] Failed to fetch user ${payment.customer_id}.`, { message: error.message });
                }
            }
            // === Háº¾T KHá»I LOGIC ===
            return {
                ...payment,
                customer_name: customerName
            };
        })
    );
    res.json(enrichedPayments);
}));
// === END: DI CHUYá»‚N ROUTE ===

app.post('/payments', authMiddleware, checkRole('customer'), asyncHandler(async (req, res) => {
    const { order_id, method } = req.body;
    if (!order_id) {
        throw new AppError('Order ID is required.', 400);
    }

    const [orderRows] = await pool.execute('SELECT id, customer_id, price, status FROM orders WHERE id = ?', [order_id]);
    if (orderRows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y Ä‘Æ¡n hĂ ng.', 404);
    }

    const order = orderRows[0];
    assertOwnerOrRole(req, order.customer_id);
    if (!['completed', 'fixed'].includes(order.status)) {
        throw new AppError('Chá»‰ cĂ³ thá»ƒ táº¡o thanh toĂ¡n cho Ä‘Æ¡n hĂ ng Ä‘Ă£ hoĂ n thĂ nh.', 400);
    }

    const [existingPaid] = await pool.execute(
        "SELECT id FROM payment WHERE order_id = ? AND status = 'paid' LIMIT 1",
        [order_id]
    );
    if (existingPaid.length > 0) {
        throw new AppError('ÄÆ¡n hĂ ng nĂ y Ä‘Ă£ Ä‘Æ°á»£c thanh toĂ¡n.', 409);
    }

    const [result] = await pool.execute(
        "INSERT INTO payment (order_id, customer_id, amount, method, status) VALUES (?, ?, ?, ?, 'pending')",
        [order_id, req.user.id, order.price, method || 'bank_transfer']
    );

    res.status(201).json({
        success: true,
        message: 'Payment created.',
        data: { id: result.insertId, status: 'pending', amount: order.price }
    });
}));

app.get('/payments', authMiddleware, checkRole('admin', 'coordinator'), asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const allowedStatuses = ['pending', 'paid', 'failed'];
    if (status && !allowedStatuses.includes(status)) {
        throw new AppError('Payment status is invalid.', 400);
    }

    const where = status ? 'WHERE status = ?' : '';
    const params = status ? [status] : [];
    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM payment ${where}`, params);
    const [items] = await pool.execute(
        `SELECT * FROM payment ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    res.json({
        success: true,
        message: 'Payments loaded.',
        data: {
            items,
            pagination: {
                page,
                limit,
                total: countRows[0].total,
                totalPages: Math.ceil(countRows[0].total / limit)
            }
        }
    });
}));

app.get('/payments/:id', authMiddleware, asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM payment WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y giao dá»‹ch.', 404);
    }
    assertOwnerOrRole(req, rows[0].customer_id, ['admin', 'coordinator']);
    res.json({ success: true, message: 'Payment loaded.', data: rows[0] });
}));

app.post('/payments/:id/mock-success', authMiddleware, asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM payment WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y giao dá»‹ch.', 404);
    }
    const payment = rows[0];
    assertOwnerOrRole(req, payment.customer_id, ['admin']);
    if (payment.status === 'paid') {
        throw new AppError('Giao dá»‹ch Ä‘Ă£ Ä‘Æ°á»£c thanh toĂ¡n.', 409);
    }

    const transactionId = `MTP-${Date.now()}-${payment.id}`;
    await pool.execute(
        "UPDATE payment SET status = 'paid', transaction_id = ?, paid_at = NOW() WHERE id = ?",
        [transactionId, payment.id]
    );
    await pool.execute("UPDATE orders SET status = 'paid' WHERE id = ?", [payment.order_id]);
    res.json({ success: true, message: 'Payment marked as paid.', data: { transaction_id: transactionId } });
}));

app.post('/payments/:id/mock-fail', authMiddleware, asyncHandler(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM payment WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y giao dá»‹ch.', 404);
    }
    const payment = rows[0];
    assertOwnerOrRole(req, payment.customer_id, ['admin']);
    if (payment.status === 'paid') {
        throw new AppError('KhĂ´ng thá»ƒ Ä‘Ă¡nh dáº¥u tháº¥t báº¡i cho giao dá»‹ch Ä‘Ă£ thanh toĂ¡n.', 409);
    }

    await pool.execute("UPDATE payment SET status = 'failed' WHERE id = ?", [payment.id]);
    res.json({ success: true, message: 'Payment marked as failed.', data: { id: payment.id } });
}));

// API: Láº¥y táº¥t cáº£ Ä‘Æ¡n hĂ ng cá»§a má»™t khĂ¡ch hĂ ng (yĂªu cáº§u Ä‘Ăºng customer hoáº·c admin)
// Sá»¬A: Bá» '/orders'
app.get('/customer/:customerId', authMiddleware, asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    assertOwnerOrRole(req, customerId, ['admin', 'coordinator']);
    // if (req.user.id !== parseInt(customerId, 10) && req.user.role !== 'admin') {
    //  throw new AppError('KhĂ´ng cĂ³ quyá»n truy cáº­p', 403);
    // }
    const [orders] = await pool.execute('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
    // LĂ m giĂ u dá»¯ liá»‡u
    const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
            if (order.service_type === 'recording' && order.status !== 'pending') {
                try {
                    const bookingResponse = await axios.get(`http://studio-service:3005/bookings/order/${order.id}`);
                    return { ...order, studioInfo: bookingResponse.data };
                } catch (error) {
                    if (error.response && error.response.status !== 404) {
                        logger.error(`[Order Service] Failed to fetch booking for order ${order.id}.`, { message: error.message });
                    }
                    return order;
                }
            }
            return order;
        })
    );
    res.json(enrichedOrders);
}));

// API: Láº¥y chi tiáº¿t má»™t Ä‘Æ¡n hĂ ng
// Sá»¬A: Bá» '/orders'
// *** ROUTE NĂ€Y PHáº¢I Náº°M SAU CĂC ROUTE Cá»¤ THá»‚ (nhÆ° /stats) ***
app.get('/:id', authMiddleware, idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // 1. Láº¥y thĂ´ng tin order vĂ  feedback (ÄĂƒ Sá»¬A Lá»–I SQL SYNTAX)
    const [rows] = await pool.execute(
        `SELECT o.*, f.rating, f.comment 
        FROM orders o
        LEFT JOIN feedback f ON o.id = f.order_id
        WHERE o.id = ?`,
        [id]
    );
    if (rows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y Ä‘Æ¡n hĂ ng.', 404);
    }
    const order = rows[0];
    assertOwnerOrRole(req, order.customer_id, ['admin', 'coordinator', 'transcriber', 'arranger', 'artist', 'studio_admin']);
    // === KHá»I LOGIC ÄĂƒ ÄÆ¯á»¢C Cáº¬P NHáº¬T Vá»I REDIS ===
    let customerName = 'KhĂ´ng rĂµ';
    // 1. Äá»‹nh nghÄ©a má»™t key cache duy nháº¥t cho user nĂ y
    const customerCacheKey = `user:${order.customer_id}:name`;
    try {
        // 2. Thá»­ láº¥y dá»¯ liá»‡u tá»« Redis TRÆ¯á»C
        const cachedName = await redis.get(customerCacheKey);
        if (cachedName) {
            // 3. CACHE HIT: TĂ¬m tháº¥y!
            customerName = cachedName;
            logger.info(`[Cache] HIT for user ${order.customer_id}`);
        } else {
            // 4. CACHE MISS: KhĂ´ng tĂ¬m tháº¥y.
            logger.info(`[Cache] MISS for user ${order.customer_id}. Fetching...`);
            const authResponse = await axios.get(`http://auth-service:3001/users/${order.customer_id}`);
            customerName = authResponse.data.name;
            // 5. LÆ°u káº¿t quáº£ vĂ o cache cho láº§n sau
            await redis.set(customerCacheKey, customerName, 'EX', 3600);
        }
    } catch (error) {
        // Logic xá»­ lĂ½ lá»—i giá»¯ nguyĂªn nhÆ° cÅ©
        if (error.response?.status !== 404) {
            logger.warn(`[Order Service] Failed to fetch user ${order.customer_id} for order ${id}.`, { message: error.message });
        }
    }
    // === END: PHáº¦N THAY THáº¾ ===
    const enrichedOrder = {
        ...order,
        customer_name: customerName // ThĂªm tĂªn khĂ¡ch hĂ ng vĂ o object
    };
    // === END: LĂ€M GIĂ€U Dá»® LIá»†U ===
    // 3. Tráº£ vá» order Ä‘Ă£ cĂ³ tĂªn khĂ¡ch hĂ ng
    res.json(enrichedOrder);
}));

// API: Cáº­p nháº­t tráº¡ng thĂ¡i Ä‘Æ¡n hĂ ng (yĂªu cáº§u coordinator hoáº·c admin)
// Sá»¬A: Bá» '/orders'
app.put('/:id/status', authMiddleware, checkRole('coordinator', 'admin'), idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'revision_requested', 'fixed', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
        throw new AppError('TrĂ¡ÂºÂ¡ng thÄ‚Â¡i Ă„â€˜Ă†Â¡n hÄ‚Â ng khÄ‚Â´ng hĂ¡Â»Â£p lĂ¡Â»â€¡.', 400);
    }
    const [orderRows] = await pool.execute('SELECT customer_id FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
        throw new AppError('KhĂ´ng tĂ¬m tháº¥y Ä‘Æ¡n hĂ ng.', 404);
    }
    const customerId = orderRows[0].customer_id;
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    notify(customerId, 'order_status_updated', {
        orderId: id,
        newStatus: status,
        message: `Tráº¡ng thĂ¡i Ä‘Æ¡n hĂ ng #${id} cá»§a báº¡n Ä‘Ă£ Ä‘Æ°á»£c cáº­p nháº­t thĂ nh: ${status}.`
    });
    logger.info(`Order #${id} status updated to ${status}`);
    res.json({ message: 'Order status updated successfully' });
}));

// API: Thanh toĂ¡n (yĂªu cáº§u customer)
// Sá»¬A: Bá» '/orders'
app.post('/:id/pay', authMiddleware, checkRole('customer'), idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, method } = req.body;
    const customer_id = req.user.id;
    const [orderRows] = await pool.execute('SELECT customer_id, price FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
        throw new AppError('KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y Ă„â€˜Ă†Â¡n hÄ‚Â ng.', 404);
    }
    assertOwnerOrRole(req, orderRows[0].customer_id);
    if (Number(amount) !== Number(orderRows[0].price)) {
        throw new AppError('SĂ¡Â»â€˜ tiĂ¡Â»Ân thanh toÄ‚Â¡n khÄ‚Â´ng khĂ¡Â»â€ºp vĂ¡Â»â€ºi Ă„â€˜Ă†Â¡n hÄ‚Â ng.', 400);
    }
    await pool.query('START TRANSACTION');
    const  [updateResult] = await pool.execute(
        "UPDATE orders SET status = ? WHERE id = ? AND (status = 'completed' OR status = 'fixed')",
        ['paid', id]
    );
    if (updateResult.affectedRows === 0) {
        await pool.query('ROLLBACK');
        throw new AppError('ÄÆ¡n hĂ ng khĂ´ng há»£p lá»‡ Ä‘á»ƒ thanh toĂ¡n.', 400);
    }
    await pool.execute(
        `INSERT INTO payment (order_id, customer_id, amount, method, status) VALUES (?, ?, ?, ?, 'paid')`,
        [id, customer_id, amount, method || 'credit_card']
    );
    await pool.query('COMMIT');
    logger.info(`Payment successful for order #${id}`);
    res.json({ message: 'Thanh toĂ¡n thĂ nh cĂ´ng!' });
}));

// API: Gá»­i feedback (yĂªu cáº§u customer)
// Sá»¬A: Bá» '/orders'
app.post('/:id/feedback', authMiddleware, checkRole('customer'), idParamValidation, feedbackValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const [orderRows] = await pool.execute('SELECT customer_id, status FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
        throw new AppError('KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y Ă„â€˜Ă†Â¡n hÄ‚Â ng.', 404);
    }
    assertOwnerOrRole(req, orderRows[0].customer_id);
    if (orderRows[0].status !== 'paid') {
        throw new AppError('ChĂ¡Â»â€° cÄ‚Â³ thĂ¡Â»Æ’ Ă„â€˜Ä‚Â¡nh giÄ‚Â¡ Ă„â€˜Ă†Â¡n hÄ‚Â ng Ă„â€˜Ä‚Â£ thanh toÄ‚Â¡n.', 400);
    }
    
    // ======================= Sá»¬A Lá»–I SQL UNDEFINED =======================
    const finalComment = comment || null; // Chuyá»ƒn undefined (náº¿u cĂ³) thĂ nh null
    // ===================================================================

    const [existing] = await pool.execute('SELECT id FROM feedback WHERE order_id = ?', [id]);
    if (existing.length > 0) {
        throw new AppError('ÄÆ¡n hĂ ng nĂ y Ä‘Ă£ Ä‘Æ°á»£c Ä‘Ă¡nh giĂ¡.', 409);
    }
    await pool.execute(
        'INSERT INTO feedback (order_id, rating, comment) VALUES (?, ?, ?)',
        [id, rating, finalComment] // <-- Sá»­ dá»¥ng biáº¿n Ä‘Ă£ sá»­a
    );
    logger.info(`New feedback submitted for order #${id}`);
    res.status(201).json({ message: 'Gá»­i Ä‘Ă¡nh giĂ¡ thĂ nh cĂ´ng!' });
}));

// API: Kiá»ƒm tra feedback Ä‘Ă£ tá»“n táº¡i chÆ°a
// Sá»¬A: Bá» '/orders'
app.get('/:id/feedback', authMiddleware, idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [orderRows] = await pool.execute('SELECT customer_id FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
        throw new AppError('KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y Ă„â€˜Ă†Â¡n hÄ‚Â ng.', 404);
    }
    assertOwnerOrRole(req, orderRows[0].customer_id, ['admin', 'coordinator']);
    const [rows] = await pool.execute('SELECT id FROM feedback WHERE order_id = ?', [id]);
    res.json({ hasFeedback: rows.length > 0 });
}));

// API: KhĂ¡ch hĂ ng yĂªu cáº§u chá»‰nh sá»­a (yĂªu cáº§u customer)
// Sá»¬A: Bá» '/orders'
app.post('/:id/request-revision', authMiddleware, checkRole('customer'), idParamValidation, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { comment, coordinatorId } = req.body;
    if (!comment || !comment.trim()) {
        throw new AppError('Vui lòng nhập nội dung yêu cầu chỉnh sửa.', 400);
    }
    const [orderOwnerRows] = await pool.execute('SELECT customer_id FROM orders WHERE id = ?', [id]);
    if (orderOwnerRows.length === 0) {
        throw new AppError('Không tìm thấy đơn hàng.', 404);
    }
    assertOwnerOrRole(req, orderOwnerRows[0].customer_id); // Láº¥y comment vĂ  ID cá»§a coordinator Ä‘á»ƒ gá»­i thĂ´ng bĂ¡o
    // 1. Cáº­p nháº­t tráº¡ng thĂ¡i Ä‘Æ¡n hĂ ng thĂ nh 'revision_requested'
    const [updateResult] = await pool.execute(
        "UPDATE orders SET status = 'revision_requested' WHERE id = ? AND (status = 'completed' OR status = 'fixed')", // Cho phĂ©p sá»­a láº¡i cáº£ Ä‘Æ¡n Ä‘Ă£ 'fixed'
        [id]
    );
    if (updateResult.affectedRows === 0) {
        throw new AppError('ÄÆ¡n hĂ ng khĂ´ng há»£p lá»‡ Ä‘á»ƒ yĂªu cáº§u chá»‰nh sá»­a.', 400);
    }
    
    // === (MQ) THAY THáº¾ KHá»I AXIOS Báº°NG RABBITMQ ===
    // 2. (Quan trá»ng) Gá»­i tin nháº¯n qua RabbitMQ cho task-service
    const routingKey = 'order.revision_requested';
    const message = {
        orderId: id,
        comment: comment
    };
    await publishMessage(routingKey, message);
    // KHĂ”NG Cáº¦N try...catch...rollback ná»¯a!
    // === Káº¾T THĂC THAY THáº¾ ===

    // 3. ThĂ´ng bĂ¡o cho coordinator biáº¿t cĂ³ yĂªu cáº§u chá»‰nh sá»­a
    if (coordinatorId) {
        notify(coordinatorId, 'revision_requested', {
            orderId: id,
            message: `KhĂ¡ch hĂ ng vá»«a yĂªu cáº§u chá»‰nh sá»­a cho Ä‘Æ¡n hĂ ng #${id}. LĂ½ do: ${comment}`
        });
    }
    logger.info(`Revision requested for order #${id}`);
    res.json({ message: 'YĂªu cáº§u chá»‰nh sá»­a Ä‘Ă£ Ä‘Æ°á»£c gá»­i Ä‘i.' });
}));

// --- Middleware xá»­ lĂ½ cuá»‘i cĂ¹ng ---
app.use(notFound);
app.use(errorHandler);
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    logger.info(`Order Service is running on port ${PORT}`);
});



