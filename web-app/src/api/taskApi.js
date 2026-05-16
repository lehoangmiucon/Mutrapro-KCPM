// File: web-app/src/api/taskApi.js (ĐÃ SỬA LỖI)

import axios from 'axios';
const API_URL = 'http://localhost:3007/api/tasks';
// Địa chỉ của Task Service (Đã đúng)

const createTask = async (taskData) => {
    try {
        // LỖI GỐC: const response = await axios.post(`${API_URL}/tasks`, taskData);
        // SỬA LẠI: Bỏ "/tasks" đi, vì API_URL đã chứa nó rồi.
        const response = await axios.post(API_URL, taskData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const getTasksBySpecialist = async (specialistId) => {
    try {
        // LỖI GỐC: const response = await axios.get(`${API_URL}/tasks/specialist/${specialistId}`);
        // SỬA LẠI: Bỏ "/tasks"
        const response = await axios.get(`${API_URL}/specialist/${specialistId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

const updateTaskStatus = async (taskId, status) => {
    try {
        // LỖI GỐC: const response = await axios.put(`${API_URL}/tasks/${taskId}/status`, { status });
        // SỬA LẠI: Bỏ "/tasks"
        const response = await axios.put(`${API_URL}/${taskId}/status`, { status });
        return response.data;
    } catch (error) {
        throw error;
    }
};

const taskApi = {
    createTask,
    getTasksBySpecialist,
    updateTaskStatus
};

export default taskApi;
