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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
            return;
        }
        setLoading(true);

        // ======================= PHẦN SỬA LỖI =======================
        // 1. Tự động tính giá dựa trên loại dịch vụ
        let price = 0;
        switch (serviceType) {
            case 'transcription':
                price = 300000; // Giá cơ bản cho ký âm
                break;
            case 'arrangement':
                price = 800000; // Giá cơ bản cho phối khí
                break;
            case 'recording':
                price = 500000; // Giá cơ bản cho thu âm
                break;
            default:
                price = 0;
        }
        // ==========================================================

        try {
            // Bước 1: Tạo đơn hàng trước với giá đã được tính
            const orderData = {
                customer_id: user.id,
                service_type: serviceType,
                description: description,
                price: price // 2. Sử dụng giá đã tính thay vì số 0
            };
            const newOrder = await orderApi.createOrder(orderData);

            // Bước 2: Nếu có file, upload file với ID của đơn hàng vừa tạo
            if (file) {
                await fileApi.uploadFile(file, newOrder.id, user.id, 'audio');
            }

            toast.success('Tạo đơn hàng thành công!');
            navigate('/orders/history');
        } catch (err) {
            toast.error('Tạo đơn hàng thất bại. Vui lòng thử lại.');
            console.error("Create order failed:", err);
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
                    {loading ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu'}
                </button>
            </form>
        </div>
    );
};

export default CreateOrderPage;