import React, { useContext } from 'react'; // 1. Bỏ useState, useEffect, thêm useContext
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // 2. Import "trạm điều khiển"
import './Navbar.css';

const Navbar = () => {
    // 3. Lấy user và hàm logout trực tiếp từ trạm điều khiển
    const { user, logout } = useContext(AuthContext); 
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(); // 4. Gọi hàm logout trung tâm
        navigate('/'); // Chuyển hướng về trang chủ
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    MuTraPro
                </Link>
                <div className="nav-menu">
                    <Link to="/" className="nav-item">
                        Trang Chủ
                    </Link>
                    {user && ( // Chỉ hiển thị khi đã đăng nhập
                        <Link to="/dashboard" className="nav-item">
                            Bảng Điều Khiển
                        </Link>
                    )}

                    {user ? (
                        // Khi đã đăng nhập
                        <>
                            <span className="nav-item">Chào, {user.name}</span>
                            <button onClick={handleLogout} className="nav-item nav-button">
                                Đăng Xuất
                            </button>
                        </>
                    ) : (
                        // Khi chưa đăng nhập
                        <>
                            <Link to="/login" className="nav-item nav-button">
                                Đăng Nhập
                            </Link>
                            <Link to="/register" className="nav-item nav-button nav-button-secondary">
                                Đăng Ký
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;