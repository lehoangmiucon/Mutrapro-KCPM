// File: web-app/src/pages/ArtistWorkspacePage.js (ĐÃ SỬA)
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import taskApi from '../api/taskApi';
import fileApi from '../api/fileApi';
import orderApi from '../api/orderApi';
import './Workspace.css'; // Dùng file CSS chung

// (Component DownloadFileButton không đổi)
const DownloadFileButton = ({ orderId }) => {
    const [fileInfo, setFileInfo] = useState(null);
    useEffect(() => {
        const fetchFile = async () => {
            try {
                const files = await fileApi.getFilesByOrder(orderId);
                const inputFile = files.find(f => f.file_type === 'mix' || f.file_type === 'audio');
                if (inputFile) setFileInfo(inputFile);
            } catch (error) {
                console.error("Lỗi tải file info", error);
            }
        };
        fetchFile();
    }, [orderId]);

    return fileInfo ? (
        <a href={`http://localhost:3004/files/download/${fileInfo.id}`} className="form-button secondary"
           style={{ textDecoration: 'none', display: 'inline-block', color: 'white', marginTop: '1rem' }}>
            Tải file nhạc nền ({fileInfo.file_type})
        </a>
    ) : <p>Không tìm thấy file nhạc nền/yêu cầu.</p>;
};

const ArtistWorkspacePage = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadFile, setUploadFile] = useState(null);

    const fetchTasks = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await taskApi.getTasksBySpecialist(user.id);
            setTasks(data);
            
            if (selectedTask) {
                const updatedSelectedTask = data.find(t => t.id === selectedTask.id);
                setSelectedTask(updatedSelectedTask || (data.length > 0 ? data[0] : null));
            } else if (data.length > 0) {
                setSelectedTask(data[0]);
            } else {
                setSelectedTask(null);
            }
            
        } catch (error) {
            toast.error("Không thể tải danh sách công việc.");
        } finally {
            setLoading(false);
        }
    }, [user, selectedTask?.id]);

    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user]);

    const handleSelectTask = (task) => {
        setSelectedTask(task);
        setUploadFile(null);
    };

    // === START: SỬA LỖI LOGIC NẰM Ở ĐÂY ===
    const handleStartTask = async () => {
        if (!selectedTask) return;
        try {
            await taskApi.updateTaskStatus(selectedTask.id, 'in_progress');
            toast.success('Đã nhận công việc!');
            
            const updatedTasks = await taskApi.getTasksBySpecialist(user.id);
            setTasks(updatedTasks);

            const newlyUpdatedTask = updatedTasks.find(t => t.id === selectedTask.id);
            if (newlyUpdatedTask) {
                setSelectedTask(newlyUpdatedTask);
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra!');
        }
    };
    // === END: SỬA LỖI LOGIC ===

    const handleCompleteTask = async () => {
        if (!uploadFile) {
            toast.warn('Vui lòng chọn file thu âm (WAV, MP3...) để nộp!');
            return;
        }
        setLoading(true);
        try {
            await fileApi.uploadFile(uploadFile, selectedTask.order_id, user.id, 'audio');
            await taskApi.updateTaskStatus(selectedTask.id, 'done');
            const newOrderStatus = selectedTask.status === 'revision_requested' ? 'fixed' : 'completed';
            await orderApi.updateOrderStatus(selectedTask.order_id, newOrderStatus);
            
            toast.success('Nộp file thu âm thành công!');
            const updatedTasks = await taskApi.getTasksBySpecialist(user.id);
            setTasks(updatedTasks);
            setSelectedTask(updatedTasks.length > 0 ? updatedTasks[0] : null);
        } catch (error) {
            toast.error('Nộp sản phẩm thất bại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container workspace-layout">
            {/* Sidebar danh sách Task */}
            <aside className="task-sidebar">
                <h2>Việc Thu Âm Của Bạn</h2>
                {loading && <p>Đang tải...</p>}
                <div className="task-list">
                    {tasks.length === 0 && !loading && <p>Bạn không có công việc nào.</p>}
                    {tasks.map(task => (
                        <div 
                            key={task.id}
                            className={`task-list-item ${selectedTask?.id === task.id ? 'selected' : ''}`}
                            onClick={() => handleSelectTask(task)}
                        >
                            <p>Đơn hàng #{task.order_id}</p>
                            <small>Trạng thái: {task.status}</small>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Khu vực làm việc chính */}
            <main className="workspace-main">
                {!selectedTask ? (
                    <div className="dashboard-features"><h3>Vui lòng chọn một công việc từ danh sách bên trái.</h3></div>
                ) : (
                    <div className="dashboard-features">
                        <h3>Chi tiết công việc (Đơn hàng #{selectedTask.order_id})</h3>
                        <p><strong>Yêu cầu từ khách:</strong> {selectedTask.description}</p>
                        <p><strong>Trạng thái:</strong> {selectedTask.status}</p>
                        {selectedTask.status === 'revision_requested' && (
                            <p style={{color: '#dc3545', fontWeight: 'bold'}}>
                                <strong>Lý do sửa:</strong> {selectedTask.revision_comment}
                            </p>
                        )}
                        <DownloadFileButton orderId={selectedTask.order_id} />

                        {selectedTask.status === 'assigned' && (
                            <button onClick={handleStartTask} className="form-button" style={{ marginTop: '20px' }}>Nhận việc</button>
                        )}

                        {(selectedTask.status === 'in_progress' || selectedTask.status === 'revision_requested') && (
                            <div className="cooking-area">
                                <h3>Quy trình Thu âm</h3>
                                <p>Bạn cần đặt lịch phòng thu để tiến hành thu âm cho đơn hàng này.</p>
                                <Link 
                                    to="/studio/booking" 
                                    className="form-button"
                                    style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem', marginTop: '1rem', color: 'white' }}
                                >
                                    Đi đến trang Đặt Lịch Phòng Thu
                                </Link>

                                <div className="upload-section">
                                    <label>Nộp file thu âm (WAV, MP3)</label>
                                    <input 
                                        type="file" 
                                        onChange={(e) => setUploadFile(e.target.files[0])}
                                        accept=".mp3,.wav" 
                                    />
                                    <button 
                                        onClick={handleCompleteTask} 
                                        className="form-button" 
                                        disabled={!uploadFile || loading}
                                    >
                                        {loading ? 'Đang nộp...' : 'Hoàn thành & Nộp'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ArtistWorkspacePage;
