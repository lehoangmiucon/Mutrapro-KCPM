// File: web-app/src/api/analyticsApi.js
import axios from 'axios';
// Trỏ vào API Gateway, route mới
const API_URL = 'http://localhost:3007/api/analytics';

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