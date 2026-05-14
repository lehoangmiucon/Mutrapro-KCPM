// File: web-app/src/api/analyticsApi.js
import axios from 'axios';
// Đổi đường dẫn trỏ về orders để lấy data real-time trực tiếp từ CSDL
const API_URL = 'http://localhost:3007/api/orders';

const getStats = async () => {
  try {
    // Gọi API /api/analytics/stats (siêu nhẹ)
    const response = await axios.get(`${API_URL}/stats`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

const analyticsApi = { getStats };
export default analyticsApi;
