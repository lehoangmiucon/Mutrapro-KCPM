import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import { toast } from 'react-toastify';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // const [role, setRole] = useState('customer'); // Dòng này không cần nữa
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Chỉ cần gửi 3 thông tin, backend sẽ tự xử lý role
            await authApi.register(name, email, password); 
            toast.success('Đăng ký tài khoản thành công! Bạn sẽ được chuyển đến trang đăng nhập.');
            navigate('/login');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <form onSubmit={handleRegister} className="form-card">
                <h2>Đăng Ký Tài Khoản Khách Hàng</h2>
                
                <div className="form-group">
                    <label>Tên hiển thị</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label>Mật khẩu</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                
                {/* --- XÓA BỎ HOÀN TOÀN KHỐI DIV CHỌN VAI TRÒ --- */}

                {error && <p className="error-message">{error}</p>}

                <button type="submit" className="form-button" disabled={loading}>
                    {loading ? 'Đang xử lý...' : 'Đăng Ký'}
                </button>
            </form>
        </div>
    );
};

export default RegisterPage;