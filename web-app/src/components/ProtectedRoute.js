// web-app/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
    // Lấy cả user và loading từ context
    const { user, loading } = useAuth(); 

    // 1. Nếu đang trong quá trình kiểm tra (loading), hiển thị màn hình chờ
    if (loading) {
        return <div className="page-container"><h1>Đang xác thực...</h1></div>;
    }

    // 2. Sau khi đã kiểm tra xong, nếu không có user thì mới chuyển hướng
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Nếu có user, cho phép truy cập
    return <Outlet />;
};

export default ProtectedRoute;