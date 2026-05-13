// web-app/src/api/fileApi.js
import axios from 'axios';

const API_URL = 'http://localhost:3007/api/files'; // Địa chỉ của File Service

/**
 * Tải một file lên server.
 * @param {File} file - Đối tượng file được chọn từ input.
 * @param {number} orderId - ID của đơn hàng liên quan.
 * @param {number} uploaderId - ID của người tải lên.
 * @param {string} fileType - Loại file ('notation', 'mix', 'audio').
 * @returns {Promise<object>}
 */
const uploadFile = async (file, orderId, uploaderId, fileType) => {
    // Dùng FormData để gửi file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_id', orderId);
    formData.append('uploader_id', uploaderId);
    formData.append('file_type', fileType);

    try {
        const response = await axios.post(`${API_URL}/upload`, formData, {
            headers: {
                // Header này rất quan trọng khi gửi file
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        // Ném lỗi ra để component có thể bắt và xử lý
        throw error;
    }
};

const getFilesByOrder = async (orderId) => {
    try {
        const response = await axios.get(`${API_URL}/files/order/${orderId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const fileApi = {
    uploadFile,
    getFilesByOrder,
};

export default fileApi;
