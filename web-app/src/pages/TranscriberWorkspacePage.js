// File: web-app/src/pages/TranscriberWorkspacePage.js (ĐÃ SỬA)
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
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
                const audioFile = files.find(f => f.file_type === 'audio');
                if (audioFile) setFileInfo(audioFile);
            } catch (error) {
                console.error("Lỗi tải file info", error);
            }
        };
        fetchFile();
    }, [orderId]);

    return fileInfo ? (
        <a href={`http://localhost:3004/files/download/${fileInfo.id}`} className="form-button secondary"
           style={{ textDecoration: 'none', display: 'inline-block', color: 'white', marginTop: '1rem' }}>
            Tải file âm thanh (MP3)
        </a>
    ) : <p>Không tìm thấy file âm thanh gốc.</p>;
};

const TranscriberWorkspacePage = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);

    // State cho khu vực làm việc
    const [notes, setNotes] = useState('');
    const [uploadFile, setUploadFile] = useState(null);

    const fetchTasks = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await taskApi.getTasksBySpecialist(user.id);
            setTasks(data);
            
            // FIX: Khi fetchTasks được gọi lại, nó cũng phải cập nhật selectedTask
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
    }, [user, selectedTask?.id]); // Thêm selectedTask.id vào dependencies

    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user]); // Chỉ fetch khi user load lần đầu

    const handleSelectTask = (task) => {
        setSelectedTask(task);
        setNotes(''); // Reset ghi chú khi đổi task
        setUploadFile(null); // Reset file khi đổi task
    };

    // === START: SỬA LỖI LOGIC NẰM Ở ĐÂY ===
    const handleStartTask = async () => {
        if (!selectedTask) return;
        try {
            await taskApi.updateTaskStatus(selectedTask.id, 'in_progress');
            toast.success('Đã bắt đầu công việc!');
            
            // Tải lại dữ liệu
            const updatedTasks = await taskApi.getTasksBySpecialist(user.id);
            setTasks(updatedTasks);

            // (FIX) Tìm và set lại selectedTask từ dữ liệu mới
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
            toast.warn('Vui lòng chọn file bản ký âm (PDF, XML...) để nộp!');
            return;
        }
        setLoading(true);
        try {
            // Bước 1: Upload file
            await fileApi.uploadFile(uploadFile, selectedTask.order_id, user.id, 'notation');
            // Bước 2: Cập nhật trạng thái task
            await taskApi.updateTaskStatus(selectedTask.id, 'done');
            // Bước 3: Cập nhật trạng thái order
            const newOrderStatus = selectedTask.status === 'revision_requested' ? 'fixed' : 'completed';
            await orderApi.updateOrderStatus(selectedTask.order_id, newOrderStatus);
            
            toast.success('Nộp sản phẩm thành công!');
            // Tải lại danh sách và reset
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
                <h2>Việc Ký Âm Của Bạn</h2>
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

                        {/* Nút bắt đầu (Nếu task mới) */}
                        {selectedTask.status === 'assigned' && (
                            <button onClick={handleStartTask} className="form-button" style={{ marginTop: '20px' }}>Bắt đầu ký âm</button>
                        )}

                        {/* Khu vực "Cooking" (Nếu đang làm) */}
                        {(selectedTask.status === 'in_progress' || selectedTask.status === 'revision_requested') && (
                            <div className="cooking-area">
                                <h3>Không gian làm việc</h3>
                                <div className="form-group">
                                    <label>Ghi chú ký âm (Nháp)</label>
                                    <textarea
                                        className="transcriber-notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Ghi chú lại các hợp âm, tiết tấu..."
                                    />
                                </div>
                                <div className="upload-section">
                                    <label>Nộp file bản ký âm (PDF, MusicXML...)</label>
                                    <input 
                                        type="file" 
                                        onChange={(e) => setUploadFile(e.target.files[0])}
                                        accept=".pdf,.xml,.mxl,.musicxml" 
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

export default TranscriberWorkspacePage;
