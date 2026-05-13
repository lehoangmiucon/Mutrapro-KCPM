// File: web-app/src/api/orderApi.js (ĐÃ SỬA LỖI ROUTING)
import axios from 'axios';
// Địa chỉ của Order Service (đã trỏ đúng vào Gateway)
const API_URL = 'http://localhost:3007/api/orders';

const createOrder = async (orderData) => {
    try {
        // SỬA: Bỏ "/orders" vì nó đã có trong API_URL
        const response = await axios.post(API_URL, orderData); 
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getAllOrders = async () => {
    try {
        // SỬA: Bỏ "/orders"
        const response = await axios.get(API_URL);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const updateOrderStatus = async (orderId, status) => {
    try {
        // SỬA: Bỏ "/orders"
        const response = await axios.put(`${API_URL}/${orderId}/status`, { status });
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getOrdersByCustomer = async (customerId) => {
    try {
        // SỬA: Bỏ "/orders"
        const response = await axios.get(`${API_URL}/customer/${customerId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getOrderById = async (orderId) => {
    try {
        // SỬA: Bỏ "/orders"
        const response = await axios.get(`${API_URL}/${orderId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const payForOrder = async (orderId, paymentData) => {
    try {
        // SỬA: Bỏ "/orders"
        const response = await axios.post(`${API_URL}/${orderId}/pay`, paymentData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// ======================= HÀM MỚI CHO FEEDBACK =======================
const getFeedbackForOrder = async (orderId) => {
    try {
        // SỬA: Bỏ "/orders"
        const response = await axios.get(`${API_URL}/${orderId}/feedback`);
        return response.data; // Should return { hasFeedback: true/false }
    } catch (error) {
        throw error;
    }
};

const submitFeedback = async (orderId, feedbackData) => {
    try {
        // SỬA: Bỏ "/orders"
        const response = await axios.post(`${API_URL}/${orderId}/feedback`, feedbackData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// ======================================================================
// Hàm mới để gọi API thống kê
const getStats = async () => {
    try {
        // GIỮ NGUYÊN: vì route này là /stats
        const response = await axios.get(`${API_URL}/stats`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Hàm mới để yêu cầu chỉnh sửa đơn hàng
const requestRevision = async (orderId, revisionData) => {
    try {
        // SỬA: Bỏ "/orders"
        const response = await axios.post(`${API_URL}/${orderId}/request-revision`, revisionData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const adminGetTransactions = async () => {
    try {
        // GIỮ NGUYÊN: vì route này là /admin/payments
        const response = await axios.get(`${API_URL}/admin/payments`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const orderApi = {
    createOrder,
    getAllOrders,
    updateOrderStatus,
    getOrdersByCustomer,
    getOrderById,
    payForOrder,
    getFeedbackForOrder,
    submitFeedback,
    getStats,
    requestRevision,
    adminGetTransactions
};

export default orderApi;
