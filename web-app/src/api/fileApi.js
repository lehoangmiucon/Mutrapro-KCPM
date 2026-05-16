import axios from 'axios';

const API_URL = 'http://localhost:3007/api/files';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const FILE_RULES = {
    audio: ['.mp3', '.mp4', '.m4a', '.wav'],
    notation: ['.pdf', '.xml', '.mxl', '.musicxml'],
    mix: ['.mp3', '.wav'],
    final: ['.mp3', '.wav', '.pdf', '.zip'],
};

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

const getApiErrorMessage = (error, fallback = 'Thao tac that bai. Vui long thu lai.') => {
    return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
};

const unwrapData = (response) => {
    if (response.data && Object.prototype.hasOwnProperty.call(response.data, 'success')) {
        return response.data.data;
    }
    return response.data;
};

const getExtension = (fileName = '') => {
    const index = fileName.lastIndexOf('.');
    return index >= 0 ? fileName.slice(index).toLowerCase() : '';
};

const validateFileBeforeUpload = (file, fileType) => {
    if (!file) {
        throw new Error('Vui long chon file truoc khi tai len.');
    }

    const allowedExtensions = FILE_RULES[fileType];
    if (!allowedExtensions) {
        throw new Error('Loai file khong hop le.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('File qua lon. Dung luong toi da la 50MB.');
    }

    const extension = getExtension(file.name);
    if (!allowedExtensions.includes(extension)) {
        throw new Error(`Dinh dang khong hop le. Chi chap nhan: ${allowedExtensions.join(', ')}.`);
    }
};

const uploadFile = async (file, orderId, fileType, options = {}) => {
    validateFileBeforeUpload(file, fileType);

    const formData = new FormData();
    formData.append('order_id', orderId);
    formData.append('file_type', fileType);

    if (options.coordinatorId) {
        formData.append('coordinatorId', options.coordinatorId);
    }

    formData.append('file', file);

    try {
        const response = await apiClient.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrapData(response);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Tai file that bai.'));
    }
};

const getFilesByOrder = async (orderId) => {
    try {
        const response = await apiClient.get(`/files/order/${orderId}`);
        return unwrapData(response);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Khong the tai danh sach file.'));
    }
};

const downloadFile = async (fileId, fileName = 'download') => {
    try {
        const response = await apiClient.get(`/files/download/${fileId}`, {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Tai file that bai.'));
    }
};

const fileApi = {
    uploadFile,
    getFilesByOrder,
    downloadFile,
    getApiErrorMessage,
};

export default fileApi;
