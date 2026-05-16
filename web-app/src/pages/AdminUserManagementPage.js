// File: web-app/src/pages/AdminUserManagementPage.js
import React, { useState, useEffect, useCallback, useContext } from 'react'; // 1. Import thêm useContext
import { toast } from 'react-toastify';
import authApi from '../api/authApi';
import UserEditModal from '../components/UserEditModal';
import { AuthContext } from '../context/AuthContext'; // 2. Import AuthContext
import './AdminUserManagementPage.css';

const AdminUserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State cho modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // 3. Lấy thông tin admin đang đăng nhập
    const { user: loggedInUser } = useContext(AuthContext);

    // Hàm tải dữ liệu, dùng useCallback
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await authApi.adminGetAllUsers();
            setUsers(data);
        } catch (err) {
            setError('Không thể tải danh sách người dùng.');
            toast.error('Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Tải dữ liệu khi component mount
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Hàm mở modal "Tạo mới"
    const handleAddNew = () => {
        setCurrentUser(null);
        setIsModalOpen(true);
    };

    // Hàm mở modal "Chỉnh sửa"
    const handleEdit = (user) => {
        setCurrentUser(user);
        setIsModalOpen(true);
    };

    // Hàm xử lý khi modal được lưu
    const handleSave = () => {
        fetchUsers();
    };

    // Hàm xử lý xóa
    const handleDelete = async (user) => {
        // 4. Kiểm tra lại lần nữa trước khi gọi API (dù backend đã chặn)
        if (loggedInUser && user.id === loggedInUser.id) {
            toast.error('Bạn không thể tự xóa chính mình.');
            return;
        }

        if (window.confirm(`Bạn có chắc muốn xóa người dùng "${user.name}" (ID: ${user.id})?`)) {
            try {
                await authApi.adminDeleteUser(user.id);
                toast.success('Xóa người dùng thành công!');
                fetchUsers();
            } catch (error) {
                toast.error(error.response?.data?.error || 'Xóa thất bại.');
            }
        }
    };

    if (error) return <div className="page-container"><h1>{error}</h1></div>;

    return (
        <>
            <div className="page-container admin-user-management">
                <div className="admin-header">
                    <h1>Quản Lý Người Dùng</h1>
                    <button onClick={handleAddNew} className="form-button">
                        Thêm Người Dùng Mới
                    </button>
                </div>

                {loading || !loggedInUser ? ( // Thêm điều kiện check loggedInUser
                    <p>Đang tải dữ liệu...</p>
                ) : (
                    <div className="dashboard-features" style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tên</th>
                                    <th>Email</th>
                                    <th>Vai trò (Role)</th>
                                    <th>Ngày Tạo</th>
                                    <th>Hành Động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`status-badge role-${user.role}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="action-buttons">
                                            <button onClick={() => handleEdit(user)} className="form-button secondary">
                                                Sửa
                                            </button>
                                            
                                            {/* === 5. PHẦN CẬP NHẬT CHÍNH ===
                                                Chỉ hiển thị nút Xóa nếu ID user của hàng này
                                                KHÁC với ID của admin đang đăng nhập.
                                            */}
                                            {loggedInUser.id !== user.id && (
                                                <button onClick={() => handleDelete(user)} className="form-button danger">
                                                    Xóa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal để Thêm/Sửa */}
            {isModalOpen && (
                <UserEditModal
                    userToEdit={currentUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </>
    );
};

export default AdminUserManagementPage;