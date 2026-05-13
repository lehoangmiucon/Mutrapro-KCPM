// web-app/src/pages/AdminDashboardPage.js
import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import analyticsApi from '../api/analyticsApi';
import './AdminDashboardPage.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const AdminDashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await analyticsApi.getStats();
                setStats(data);
            } catch (err) {
                setError('Không thể tải dữ liệu thống kê.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="page-container"><h1>Đang tải báo cáo...</h1></div>;
    if (error) return <div className="page-container"><h1>{error}</h1></div>;

    const chartData = {
        labels: stats.orderStats.map(s => s.status),
        datasets: [{
            label: 'Số lượng đơn hàng',
            data: stats.orderStats.map(s => s.count),
            backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)',
            ],
            borderColor: '#fff',
            borderWidth: 2,
        }],
    };

    return (
        <div className="page-container admin-dashboard-page">
            <h1>Báo Cáo & Thống Kê</h1>
            <div className="stats-cards-container">
                <div className="stat-card">
                    <h2>Tổng Doanh Thu</h2>
                    <p>{Number(stats.totalRevenue).toLocaleString('vi-VN')} VNĐ</p>
                </div>
                <div className="stat-card">
                    <h2>Tổng Số Đơn Hàng</h2>
                    <p>{stats.totalOrders}</p>
                </div>
            </div>
            <div className="chart-container dashboard-features">
                <h3>Phân Bố Trạng Thái Đơn Hàng</h3>
                <div className="chart-wrapper">
                    <Doughnut data={chartData} />
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
