// web-app/src/pages/CreateOrderPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import orderApi from '../api/orderApi';
import fileApi from '../api/fileApi';

const CreateOrderPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [serviceType, setServiceType] = useState('transcription');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const getExtension = (fileName = '') => {
        const index = fileName.lastIndexOf('.');
        return index >= 0 ? fileName.slice(index).toLowerCase() : '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!user) {
            toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
            return;
        }

        if (!file) {
            toast.error('Vui lòng chọn file âm thanh trước khi gửi yêu cầu!');
            return;
        }

        const allowedExtensions = ['.mp3', '.mp4', '.m4a', '.wav'];
        const ext = getExtension(file.name);
        if (!allowedExtensions.includes(ext)) {
            toast.error(`Định dạng không hợp lệ. Hệ thống chỉ chấp nhận: ${allowedExtensions.join(', ')}.`);
            return;
        }

        setLoading(true);

        let price = 0;
        switch (serviceType) {
            case 'transcription':
                price = 300000;
                break;
            case 'arrangement':
                price = 800000;
                break;
            case 'recording':
                price = 500000;
                break;
            default:
                price = 0;
        }

        try {
            const orderData = {
                customer_id: user.id,
                service_type: serviceType,
                description: description,
                price: price
            };
            
            // Gọi API tạo đơn hàng
            const response = await orderApi.createOrder(orderData);

            // BỘ LỌC AN TOÀN: Tìm kiếm ID từ mọi cấu trúc phản hồi có thể có của Backend
            const orderId = response?.id || response?.order?.id || response?.data?.id || response?.orderId;

            if (!orderId) {
                throw new Error('Không thể lấy được mã ID của đơn hàng mới tạo từ hệ thống.');
            }

            try {
                // Upload file bằng ID vừa tìm được
                await fileApi.uploadFile(file, orderId, 'audio');
                toast.success('Tạo đơn hàng và tải file thành công!');
                navigate(`/orders/${orderId}`); 
            } catch (uploadError) {
                console.error("Upload file failed:", uploadError);
                toast.warning(`Đơn hàng đã tạo nhưng tải file thất bại: ${uploadError.message}`);
                navigate(`/orders/${orderId}`); 
            }

        } catch (err) {
            console.error("Create order failed:", err);
            toast.error(err.message || 'Tạo đơn hàng thất bại. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit} className="form-card">
                <h2>Tạo Yêu Cầu Dịch Vụ Mới</h2>
                
                <div className="form-group">
                    <label>Chọn loại dịch vụ</label>
                    <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                        <option value="transcription">Ký âm (Transcription) - 300.000 VNĐ</option>
                        <option value="arrangement">Hòa âm, Phối khí (Arrangement) - 800.000 VNĐ</option>
                        <option value="recording">Thu âm (Recording) - 500.000 VNĐ</option>
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Mô tả chi tiết yêu cầu</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows="5"
                        placeholder="Ví dụ: Em cần ký âm bài hát 'See Tình' của Hoàng Thùy Linh..."
                        style={{ resize: 'none', width: '339px' }}
                    />
                </div>
                
                <div className="form-group">
                    <label>Tải lên tệp âm thanh (MP3, MP4, WAV...)</label>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".mp3,.mp4,.wav,.m4a"
                        className="file-input"
                    />
                </div>
                
                <button type="submit" className="form-button" disabled={loading}>
                    {loading ? 'Đang xử lý...' : 'Gửi Yêu Cầu'}
                </button>
            </form>
        </div>
    );
};
export default CreateOrderPage;
