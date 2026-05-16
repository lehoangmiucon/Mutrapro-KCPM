// File: web-app/src/pages/Dashboard.js
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import CoordinatorDashboard from './CoordinatorDashboard';

// (Component chức năng của Khách hàng - giữ nguyên)
const CustomerDashboard = ({ user }) => (
    <div className="dashboard-features">
        <h3>Chức năng của Khách hàng</h3>
        <ul>
            <li><Link to="/orders/new">Tạo đơn hàng mới</Link></li>
            <li><Link to="/orders/history">Xem lịch sử đơn hàng</Link></li>
            <li><Link to="/profile">Chỉnh sửa hồ sơ</Link></li>
        </ul>
    </div>
);

// === START: PHẦN CẬP NHẬT CHÍNH ===
// Helper function để lấy đúng link Workspace
const getWorkspaceLink = (role) => {
    switch (role) {
        case 'transcriber':
            return '/workspace/transcriber';
        case 'arranger':
            return '/workspace/arranger';
        case 'artist':
            return '/workspace/artist';
        default:
            return '/tasks'; // Fallback về trang cũ nếu có lỗi
    }
};

// (Component chức năng của Chuyên gia - ĐÃ SỬA)
const SpecialistDashboard = ({ user }) => (
    <div className="dashboard-features">
        <h3>Nhiệm vụ của bạn</h3>
        <ul>
            {/* SỬA DÒNG NÀY: Dùng link động thay vì /tasks */}
            <li><Link to={getWorkspaceLink(user.role)}>Vào không gian làm việc</Link></li>
            
            {user.role === 'artist' && (
                <li><Link to="/studio/booking">Đặt lịch phòng thu</Link></li>
            )}
        </ul>
    </div>
);
// === END: PHẦN CẬP NHẬT CHÍNH ===

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    const renderRoleDashboard = () => {
        if (!user) return null;
        switch (user.role) {
            case 'customer':
                return <CustomerDashboard user={user} />;
            
            case 'coordinator':
                return (
                    <>
                        <CoordinatorDashboard />
                        <div className="dashboard-features" style={{ marginTop: '20px' }}>
                            <h3>Quản lý</h3>
                            <ul>
                                <li><Link to="/admin/dashboard">Xem Báo Cáo & Thống Kê</Link></li>
                            </ul>
                        </div>
                    </>
                );
            
            case 'artist':
            case 'transcriber':
            case 'arranger':
                return <SpecialistDashboard user={user} />;
            
            case 'admin':
                return (
                    <div className="dashboard-features">
                        <h3>Công cụ quản trị hệ thống</h3>
                        <ul>
                            <li><Link to="/admin/dashboard">Xem Báo Cáo & Thống Kê</Link></li>
                            {/* === THÊM LINK MỚI === */}
                            <li><Link to="/admin/users">Quản lý người dùng</Link></li>
                            {/* === THÊM LINK MỚI CHO GIAO DỊCH === */}
                            <li><Link to="/admin/transactions">Quản lý giao dịch</Link></li>
                        </ul>
                    </div>
                );
            
            default:
                if (user.role === 'studio_admin') {
                    return (
                        <div className="dashboard-features">
                            <h3>Công cụ quản trị phòng thu</h3>
                            <ul>
                                <li><Link to="/admin/studios">Quản lý phòng thu & lịch đặt</Link></li>
                            </ul>
                        </div>
                    );
                }
                return <p>Vai trò của bạn chưa có chức năng nào trên trang này.</p>;
        }
    };
    
    if (!user) {
        return <div className="page-container"><h1>Đang tải thông tin người dùng...</h1></div>;
    }
    
    return (
        <div className="page-container" style={{ alignItems: 'flex-start', maxWidth: '1000px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <h1>Chào mừng trở lại, {user.name}!</h1>
            </div>
            <p style={{ marginBottom: '30px' }}>Đây là bảng điều khiển của bạn. <strong>Vai trò:</strong> {user.role}</p>
            {renderRoleDashboard()}
        </div>
    );
};

export default Dashboard;