import axios from 'axios';

const API_URL = 'http://localhost:3007/api/orders';

// Thêm apiClient để tự động gắn Bearer Token
const apiClient = axios.create({
    baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const createOrder = async (orderData) => {
    try {
        const response = await apiClient.post('/', orderData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getAllOrders = async () => {
    try {
        const response = await apiClient.get('/');
        return response.data;
    } catch (error) {
        throw error;
    }
};

const updateOrderStatus = async (orderId, status) => {
    try {
        const response = await apiClient.put(`/${orderId}/status`, { status });
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getOrdersByCustomer = async (customerId) => {
    try {
        const response = await apiClient.get(`/customer/${customerId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getOrderById = async (orderId) => {
    try {
        const response = await apiClient.get(`/${orderId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const payForOrder = async (orderId, paymentData) => {
    try {
        const response = await apiClient.post(`/${orderId}/pay`, paymentData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getFeedbackForOrder = async (orderId) => {
    try {
        const response = await apiClient.get(`/${orderId}/feedback`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const submitFeedback = async (orderId, feedbackData) => {
    try {
        const response = await apiClient.post(`/${orderId}/feedback`, feedbackData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getStats = async () => {
    try {
        const response = await apiClient.get('/stats');
        return response.data;
    } catch (error) {
        throw error;
    }
};

const requestRevision = async (orderId, revisionData) => {
    try {
        const response = await apiClient.post(`/${orderId}/request-revision`, revisionData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const adminGetTransactions = async () => {
    try {
        const response = await apiClient.get('/admin/payments');
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