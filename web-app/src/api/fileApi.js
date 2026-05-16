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

const getApiErrorMessage = (error, fallback = 'Thao tác thất bại. Vui lòng thử lại.') => {
    return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
};

const getExtension = (fileName = '') => {
    const index = fileName.lastIndexOf('.');
    return index >= 0 ? fileName.slice(index).toLowerCase() : '';
};

const validateFileBeforeUpload = (file, fileType) => {
    if (!file) {
        throw new Error('Vui lòng chọn file trước khi tải lên.');
    }

    const allowedExtensions = FILE_RULES[fileType];
    if (!allowedExtensions) {
        throw new Error('Loại file không hợp lệ.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('File quá lớn. Dung lượng tối đa là 50MB.');
    }

    const extension = getExtension(file.name);
    if (!allowedExtensions.includes(extension)) {
        throw new Error(`Định dạng không hợp lệ. Chỉ chấp nhận: ${allowedExtensions.join(', ')}.`);
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
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Tải file thất bại.'));
    }
};

const getFilesByOrder = async (orderId) => {
    try {
        const response = await apiClient.get(`/order/${orderId}`);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Không thể tải danh sách file.'));
    }
};

const downloadFile = async (fileId, fileName = 'download') => {
    try {
        const response = await apiClient.get(`/download/${fileId}`, {
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
        throw new Error(getApiErrorMessage(error, 'Tải file thất bại.'));
    }
};

const fileApi = {
    uploadFile,
    getFilesByOrder,
    downloadFile,
    getApiErrorMessage,
};

export default fileApi;
