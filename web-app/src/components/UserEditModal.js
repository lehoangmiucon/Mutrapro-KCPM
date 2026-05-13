// File: web-app/src/components/UserEditModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import authApi from '../api/authApi';
import './UserEditModal.css'; // Sẽ tạo file CSS ngay sau đây

const UserEditModal = ({ userToEdit, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'customer'
    });
    const [loading, setLoading] = useState(false);
    
    // Kiểm tra xem đây là modal "Tạo mới" hay "Chỉnh sửa"
    const isEditMode = Boolean(userToEdit);

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                name: userToEdit.name,
                email: userToEdit.email,
                role: userToEdit.role,
                password: '' // Không tải mật khẩu
            });
        }
    }, [userToEdit, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode) {
                // Gọi API cập nhật (không gửi mật khẩu)
                await authApi.adminUpdateUser(userToEdit.id, {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role
                });
                toast.success('Cập nhật người dùng thành công!');
            } else {
                // Gọi API tạo mới (gửi đầy đủ)
                await authApi.adminCreateUser(formData);
                toast.success('Tạo người dùng mới thành công!');
            }
            onSave(); // Báo cho component cha tải lại dữ liệu
            onClose(); // Đóng modal
        } catch (error) {
            toast.error(error.response?.data?.error || 'Thao tác thất bại.');
        } finally {
            setLoading(false);
        }
    };

    // Danh sách các vai trò
    const roles = ['customer','coordinator','transcriber','arranger','artist','studio_admin','admin'];

    return (
        <div className="modal-backdrop">
            <form onSubmit={handleSubmit} className="modal-content user-edit-modal">
                <h2>{isEditMode ? 'Chỉnh Sửa Người Dùng' : 'Tạo Người Dùng Mới'}</h2>
                
                <div className="form-group">
                    <label>Tên hiển thị</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                {!isEditMode && (
                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label>Vai trò (Role)</label>
                    <select name="role" value={formData.role} onChange={handleChange} required>
                        {roles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="form-button secondary" disabled={loading}>
                        Hủy
                    </button>
                    <button type="submit" className="form-button" disabled={loading}>
                        {loading ? 'Đang lưu...' : (isEditMode ? 'Lưu Thay Đổi' : 'Tạo Mới')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserEditModal;