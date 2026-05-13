// web-app/src/pages/StudioAdminDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import studioApi from '../api/studioApi';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './StudioAdminDashboard.css'; // Sẽ tạo file CSS riêng cho trang này

const localizer = momentLocalizer(moment);

const StudioAdminDashboard = () => {
    const [studios, setStudios] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const [studiosData, bookingsData] = await Promise.all([
                studioApi.getStudios(),
                studioApi.getAllBookings()
            ]);
            setStudios(studiosData);
            
            // Chuyển đổi dữ liệu booking để calendar có thể hiển thị
            const formattedBookings = bookingsData.map(booking => ({
                id: booking.id,
                title: `Order #${booking.order_id} - ${booking.studio_name}`,
                start: new Date(booking.start_time),
                end: new Date(booking.end_time),
            }));
            setBookings(formattedBookings);

        } catch (err) {
            console.error("Failed to fetch data", err);
            setError('Không thể tải dữ liệu từ server.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStatusChange = async (studioId, newStatus) => {
        try {
            await studioApi.updateStudioStatus(studioId, newStatus);
            // Cập nhật lại trạng thái trên UI ngay lập tức
            setStudios(prevStudios => 
                prevStudios.map(studio => 
                    studio.id === studioId ? { ...studio, status: newStatus } : studio
                )
            );
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Cập nhật trạng thái thất bại!");
        }
    };
    
    if (loading) return <div className="page-container"><h1>Đang tải dữ liệu quản trị...</h1></div>;
    if (error) return <div className="page-container"><h1>{error}</h1></div>;

    return (
        <div className="page-container admin-dashboard">
            <h1>Bảng điều khiển Quản trị Phòng thu</h1>

            {/* Phần quản lý danh sách phòng thu */}
            <div className="dashboard-features">
                <h3>Quản lý trạng thái phòng thu</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Tên Phòng Thu</th>
                            <th>Địa điểm</th>
                            <th>Trạng Thái Hiện Tại</th>
                            <th>Thay Đổi Trạng Thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {studios.map(studio => (
                            <tr key={studio.id}>
                                <td>{studio.name}</td>
                                <td>{studio.location}</td>
                                <td>
                                    <span className={`status-badge status-${studio.status}`}>
                                        {studio.status}
                                    </span>
                                </td>
                                <td>
                                    <select 
                                        value={studio.status} 
                                        onChange={(e) => handleStatusChange(studio.id, e.target.value)}
                                        className="status-select"
                                    >
                                        <option value="available">Available</option>
                                        <option value="booked">Booked</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Phần hiển thị lịch */}
            <div className="dashboard-features calendar-container">
                 <h3>Lịch Đặt Phòng</h3>
                 <Calendar
                    localizer={localizer}
                    events={bookings}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 600 }}
                    views={['month', 'week', 'day']}
                />
            </div>
        </div>
    );
};

export default StudioAdminDashboard;