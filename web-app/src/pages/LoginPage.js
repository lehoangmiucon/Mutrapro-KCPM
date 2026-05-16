// web-app/src/pages/LoginPage.js
import React, { useState, useContext } from 'react'; // <--- SỬA LỖI Ở DÒNG NÀY
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authApi from '../api/authApi';

const LoginPage = () => {
    const { login } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const responseData = await authApi.login(email, password);
            login(responseData.user); // Báo cho AuthContext biết đã đăng nhập

            // Dựa vào vai trò của người dùng để quyết định trang chuyển hướng
            const userRole = responseData.user.role;
            if (userRole === 'studio_admin') {
                navigate('/admin/studios'); // Nếu là admin phòng thu, vào trang quản trị
            } else {
                navigate('/dashboard'); // Các vai trò khác vẫn vào dashboard
            }

        } catch (err) {
            setError('Email hoặc mật khẩu không đúng!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <form onSubmit={handleLogin} className="form-card">
                <h2>Đăng nhập</h2>
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Mật khẩu</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" className="form-button" disabled={loading}>
                    {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;