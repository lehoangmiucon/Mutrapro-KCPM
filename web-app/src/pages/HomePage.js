import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth để kiểm tra đăng nhập

const HomePage = () => {
    const { user } = useAuth(); // Lấy thông tin user từ "trạm điều khiển"

    return (
        <div className="hero-container">
            {/* Ảnh nền sẽ được thêm bằng CSS */}
            <div className="hero-content">
                <h1 className="hero-title">"Designed For Music, Engineered to Last"</h1>
                <p className="hero-subtitle"><b>Dịch vụ sản xuất âm nhạc chuyên nghiệp dành cho bạn</b></p>
                
                {/* Nút bấm sẽ thay đổi tùy thuộc đã đăng nhập hay chưa */}
                {user ? (
                     <Link to="/dashboard" className="hero-button">
                        Đến bảng điều khiển
                     </Link>
                ) : (
                    <Link to="/register" className="hero-button">
                        Bắt đầu ngay
                    </Link>
                )}
            </div>
        </div>
    );
};

export default HomePage;