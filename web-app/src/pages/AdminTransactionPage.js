// File: web-app/src/pages/AdminTransactionPage.js (TẠO MỚI)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import orderApi from '../api/orderApi';
import './AdminTransactionPage.css'; // Dùng file CSS mới
import './StudioAdminDashboard.css'; // Dùng chung .admin-table
import './CoordinatorDashboard.css'; // Dùng chung .status-badge

const AdminTransactionPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const data = await orderApi.adminGetTransactions();
            setTransactions(data);
        } catch (err) {
            setError('Không thể tải danh sách giao dịch.');
            toast.error('Không thể tải danh sách giao dịch.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    if (error) return <div className="page-container"><h1>{error}</h1></div>;

    return (
        <div className="page-container admin-transaction-page">
            <h1>Quản Lý Giao Dịch</h1>
            {loading ? (
                <p>Đang tải dữ liệu...</p>
            ) : (
                <div className="dashboard-features" style={{ overflowX: 'auto' }}>
                    {transactions.length === 0 ? (
                        <p>Chưa có giao dịch nào được ghi nhận.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID Giao Dịch</th>
                                    <th>ID Đơn Hàng</th>
                                    <th>Khách Hàng</th>
                                    <th>Số Tiền</th>
                                    <th>Phương Thức</th>
                                    <th>Trạng Thái</th>
                                    <th>Ngày Giao Dịch</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>{tx.id}</td>
                                        <td>
                                            <Link to={`/orders/${tx.order_id}`} style={{ fontWeight: 'bold' }}>
                                                #{tx.order_id}
                                            </Link>
                                        </td>
                                        <td>{tx.customer_name} (ID: {tx.customer_id})</td>
                                        <td>{Number(tx.amount).toLocaleString('vi-VN')} VNĐ</td>
                                        <td>{tx.method}</td>
                                        <td>
                                            <span className={`status-badge status-${tx.status}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td>{new Date(tx.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminTransactionPage;