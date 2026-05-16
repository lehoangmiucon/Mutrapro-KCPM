const axios = require('axios');
const { AppError } = require('../shared/middleware/errorHandler');

const SPECIALIST_ROLES = ['transcriber', 'arranger', 'artist'];
const ROLE_FILE_TYPES = {
    customer: ['audio'],
    transcriber: ['notation'],
    arranger: ['mix'],
    artist: ['audio'],
    coordinator: ['audio', 'notation', 'mix', 'final'],
    admin: ['audio', 'notation', 'mix', 'final']
};

const parsePositiveInt = (value, fieldName) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new AppError(`${fieldName} must be a positive integer.`, 400);
    }
    return parsed;
};

const assertKnownFileType = (fileType) => {
    if (!['audio', 'notation', 'mix', 'final'].includes(fileType)) {
        throw new AppError('File type is invalid.', 400);
    }
};

const authHeaders = (token) => {
    if (token) return { Authorization: `Bearer ${token}` };
    if (process.env.INTERNAL_SERVICE_TOKEN) {
        return { 'X-Internal-Service-Token': process.env.INTERNAL_SERVICE_TOKEN };
    }
    return {};
};

const getOrder = async (orderId, token) => {
    const response = await axios.get(`http://order-service:3002/${orderId}`, {
        headers: authHeaders(token)
    });
    return response.data;
};

const getLatestTask = async (orderId, token) => {
    try {
        const response = await axios.get(`http://task-service:3003/order/${orderId}`, {
            headers: authHeaders(token)
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
    }
};

const canAccessOrder = async (user, token, orderId) => {
    if (['admin', 'coordinator'].includes(user.role)) return true;

    if (user.role === 'customer') {
        const order = await getOrder(orderId, token);
        return Number(order.customer_id) === Number(user.id);
    }

    if (SPECIALIST_ROLES.includes(user.role)) {
        const task = await getLatestTask(orderId, token);
        return task && Number(task.assigned_to) === Number(user.id);
    }

    return false;
};

const assertCanUpload = async ({ user, token, orderId, fileType }) => {
    assertKnownFileType(fileType);

    const allowedTypes = ROLE_FILE_TYPES[user.role] || [];
    if (!allowedTypes.includes(fileType)) {
        throw new AppError('You are not allowed to upload this file type.', 403);
    }

    const hasAccess = await canAccessOrder(user, token, orderId);
    if (!hasAccess) {
        throw new AppError('You are not allowed to upload files for this order.', 403);
    }
};

const assertCanReadOrderFiles = async ({ user, token, orderId }) => {
    const hasAccess = await canAccessOrder(user, token, orderId);
    if (!hasAccess) {
        throw new AppError('You are not allowed to access files for this order.', 403);
    }
};

module.exports = {
    assertCanUpload,
    assertCanReadOrderFiles,
    parsePositiveInt
};
