// web-app/src/pages/StudioBookingPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // Dùng toast cho đẹp
import studioApi from '../api/studioApi';
import { useAuth } from '../context/AuthContext';
import { io } from "socket.io-client";

const StudioBookingPage = () => {
    const { user } = useAuth();
    const [studios, setStudios] = useState([]);
    const [selectedStudio, setSelectedStudio] = useState('');
    const [orderId, setOrderId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStudios = async () => {
            try {
                const data = await studioApi.getStudios();
                setStudios(data);
                const availableStudio = data.find(s => s.status === 'available');
                if (availableStudio) {
                    setSelectedStudio(availableStudio.id);
                }
            } catch (error) {
                console.error("Failed to fetch studios", error);
            }
        };
        fetchStudios();

        const socket = io("http://localhost:3006");
        socket.on('studio_status_updated', (data) => {
            console.log("Nhận được cập nhật trạng thái studio real-time:", data);
            setStudios(prevStudios => 
                prevStudios.map(studio => 
                    studio.id === Number(data.studioId)
                        ? { ...studio, status: data.newStatus } 
                        : studio
                )
            );
        });
        return () => {
            socket.disconnect();
        };
    }, []);

    // ======================= SỬA LỖI Ở HÀM NÀY =======================
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || !selectedStudio || !startTime || !orderId) {
            toast.warn("Vui lòng điền đầy đủ thông tin.");
            return;
        }
        
        // 1. SỬ DỤNG `setLoading`
        setLoading(true);

        try {
            // Giả sử một buổi thu kéo dài 2 tiếng
            const endTime = new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000);

            await studioApi.createBooking({
                studio_id: selectedStudio,
                artist_id: user.id, // 2. SỬ DỤNG `user`
                order_id: orderId,
                start_time: startTime,
                end_time: endTime.toISOString().slice(0, 19).replace('T', ' ')
            });
            toast.success("Đặt phòng thành công!");
            
            // 3. SỬ DỤNG `Maps`
            navigate('/dashboard'); 
        } catch (error) {
            toast.error("Đặt phòng thất bại! Vui lòng kiểm tra lại thông tin.");
            console.error("Failed to create booking", error);
        } finally {
            // 1. SỬ DỤNG `setLoading`
            setLoading(false);
        }
    };
    // ================================================================

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit} className="form-card">
                <h2>Đặt Lịch Phòng Thu</h2>
                <div className="form-group">
                    <label>Chọn phòng thu</label>
                    <select value={selectedStudio} onChange={(e) => setSelectedStudio(e.target.value)}>
                        {studios.map(studio => (
                            <option key={studio.id} value={studio.id} disabled={studio.status !== 'available'}>
                                {studio.name} - {studio.location} ({studio.status})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>ID Đơn hàng liên quan</label>
                    <input type="number" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Nhập ID đơn hàng cần thu âm" required />
                </div>
                <div className="form-group">
                    <label>Thời gian bắt đầu</label>
                    <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <button type="submit" className="form-button" disabled={loading}>
                    {loading ? 'Đang gửi...' : 'Xác nhận Đặt lịch'}
                </button>
            </form>
        </div>
    );
};

export default StudioBookingPage;