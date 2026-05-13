// web-app/src/api/studioApi.js
import axios from 'axios';

const API_URL = 'http://localhost:3007/api/studio';

// Lấy danh sách tất cả phòng thu
const getStudios = async () => {
    try {
        const response = await axios.get(`${API_URL}/studios`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Tạo một booking mới (cho Artist)
const createBooking = async (bookingData) => {
    try {
        const dataToSend = {
            ...bookingData,
            start_time: new Date(bookingData.start_time).toISOString().slice(0, 19).replace('T', ' '),
            end_time: new Date(bookingData.end_time).toISOString().slice(0, 19).replace('T', ' ')
        };
        const response = await axios.post(`${API_URL}/bookings`, dataToSend);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// === CÁC HÀM MỚI CHO ADMIN ===

// Lấy tất cả lịch đặt
const getAllBookings = async () => {
    try {
        const response = await axios.get(`${API_URL}/bookings/all`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Cập nhật trạng thái phòng thu
const updateStudioStatus = async (studioId, status) => {
    try {
        const response = await axios.put(`${API_URL}/studios/${studioId}/status`, { status });
        return response.data;
    } catch (error) {
        throw error;
    }
};

const studioApi = {
    getStudios,
    createBooking,
    getAllBookings,       // Mới
    updateStudioStatus,   // Mới
};

export default studioApi;
