// File: web-app/src/api/authApi.js (ĐÃ SỬA LỖI ROUTING)
import axios from 'axios';
const API_URL = 'http://localhost:3007/api/auth'; // <--- Đã trỏ đúng
// --- Axios Interceptors --- (Giữ nguyên)
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && error.config.url !== `${API_URL}/login`) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
// --- API Functions ---
const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};
const register = async (name, email, password) => {
    return await axios.post(`${API_URL}/register`, { name, email, password });
};
const verifyToken = async () => {
    return await axios.get(`${API_URL}/verify`);
};
const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

// === START: SỬA LỖI NẰM Ở ĐÂY ===
const getSpecialistsByRole = async (role) => {
    // Sửa: Gọi qua API_URL (Gateway) thay vì localhost:3001
    const response = await axios.get(`${API_URL}/users/specialists`, { params: { role } });
    return response.data;
};
// === END: SỬA LỖI ===

const updateProfile = async (userId, profileData) => {
    return await axios.put(`${API_URL}/users/${userId}`, profileData);
};
const changePassword = async (userId, passwordData) => {
    return await axios.put(`${API_URL}/users/${userId}/password`, passwordData);
};
// === START: API MỚI CHO ADMIN ===
const adminGetAllUsers = async () => {
    const response = await axios.get(`${API_URL}/admin/users`);
    return response.data;
};
const adminCreateUser = async (userData) => {
    const response = await axios.post(`${API_URL}/admin/users`, userData);
    return response.data;
};
const adminUpdateUser = async (userId, userData) => {
    const response = await axios.put(`${API_URL}/admin/users/${userId}`, userData);
    return response.data;
};
const adminDeleteUser = async (userId) => {
    const response = await axios.delete(`${API_URL}/admin/users/${userId}`);
    return response.data;
};
// === END: API MỚI CHO ADMIN ===
const authApi = {
    login,
    register,
    logout,
    verifyToken,
    getSpecialistsByRole,
    updateProfile,
    changePassword,
    // === EXPORT API MỚI ===
    adminGetAllUsers,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser
};
export default authApi;
