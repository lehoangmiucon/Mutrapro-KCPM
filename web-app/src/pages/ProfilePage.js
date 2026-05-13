// web-app/src/pages/ProfilePage.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import authApi from '../api/authApi';
import './ProfilePage.css';

// --- COMPONENT MODAL ĐỔI MẬT KHẨU (GIỮ NGUYÊN) ---
const ChangePasswordModal = ({ user, onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authApi.changePassword(user.id, { oldPassword, newPassword });
            toast.success("Đổi mật khẩu thành công!");
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || "Đổi mật khẩu thất bại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <form onSubmit={handleSubmit} className="modal-content form-card">
                <h2>Đổi Mật Khẩu</h2>
                <div className="form-group">
                    <label>Mật khẩu cũ</label>
                    <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Mật khẩu mới</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="form-button secondary">Hủy</button>
                    <button type="submit" className="form-button" disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Xác nhận'}
                    </button>
                </div>
            </form>
        </div>
    );
};


// --- COMPONENT CHÍNH CỦA TRANG PROFILE (ĐÃ SỬA LỖI) ---
const ProfilePage = () => {
    const { user, login } = useAuth();
    const [name, setName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    useEffect(() => {
        if (user) setName(user.name);
    }, [user]);

    // Đổi tên hàm cho rõ ràng hơn, hàm này giờ chỉ để cập nhật TÊN
    const handleUpdateName = async () => {
        setLoading(true);
        try {
            await authApi.updateProfile(user.id, { name });
            const updatedUser = { ...user, name: name };
            login(updatedUser);
            toast.success("Cập nhật tên thành công!");
            setIsEditing(false); // Tắt chế độ sửa sau khi thành công
        } catch (error) {
            toast.error("Cập nhật thất bại!");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="page-container"><h1>Đang tải...</h1></div>;

    return (
        <>
            <div className="form-container">
                {/* BƯỚC 1: BỎ onSubmit, biến <form> thành <div> để tránh lỗi */}
                <div className="form-card">
                    <h2>Hồ Sơ Của Bạn</h2>
                    <div className="form-group">
                        <label>Tên hiển thị</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} readOnly={!isEditing} />
                    </div>
                    <div className="form-group">
                        <label>Email (không thể thay đổi)</label>
                        <input type="email" value={user.email} readOnly />
                    </div>
                    
                    {isEditing ? (
                        // Khi đang ở chế độ Sửa Tên
                        <div className="profile-actions">
                            <button type="button" onClick={() => setIsEditing(false)} className="form-button secondary">Hủy</button>
                            {/* BƯỚC 2: Gắn trực tiếp hàm handleUpdateName vào nút "Lưu" */}
                            <button type="button" onClick={handleUpdateName} className="form-button" disabled={loading}>
                                {loading ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    ) : (
                        // Khi đang ở chế độ xem
                         <div className="profile-actions">
                             <button type="button" onClick={() => setShowPasswordModal(true)} className="form-button secondary">Đổi Mật Khẩu</button>
                            <button type="button" onClick={() => setIsEditing(true)} className="form-button">Sửa Tên</button>
                        </div>
                    )}
                </div>
            </div>
            {/* Modal đổi mật khẩu không thay đổi */}
            {showPasswordModal && <ChangePasswordModal user={user} onClose={() => setShowPasswordModal(false)} />}
        </>
    );
};

export default ProfilePage;