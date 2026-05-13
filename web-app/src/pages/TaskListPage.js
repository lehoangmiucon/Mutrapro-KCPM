// web-app/src/pages/TaskListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'; // Dùng useAuth cho gọn
import { toast } from 'react-toastify';
import taskApi from '../api/taskApi';
import fileApi from '../api/fileApi';
import orderApi from '../api/orderApi';

// --- TẠO MỘT COMPONENT NHỎ ĐỂ XỬ LÝ NÚT TẢI FILE ---
const DownloadFileButton = ({ orderId }) => {
    const [fileInfo, setFileInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFile = async () => {
            try {
                // Chỉ lấy file 'audio' (file gốc của khách hàng)
                const files = await fileApi.getFilesByOrder(orderId);
                const audioFile = files.find(f => f.file_type === 'audio');
                if (audioFile) {
                    setFileInfo(audioFile);
                }
            } catch (error) {
                console.error("Could not fetch file info for order", orderId, error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFile();
    }, [orderId]);

    if (isLoading) {
        return <small>Đang kiểm tra file...</small>;
    }

    return fileInfo ? (
        <a 
            href={`http://localhost:3004/files/download/${fileInfo.id}`} 
            className="form-button secondary" // Dùng class có sẵn cho đẹp
            style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '10px', color: 'white' }}
        >
            Tải file của khách
        </a>
    ) : (
        <small>Không có file yêu cầu.</small>
    );
};


const TaskListPage = () => {
    const { user } = useAuth(); // Dùng AuthContext
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState({});

    // Dùng useCallback để tránh warning và tối ưu
    const fetchTasks = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await taskApi.getTasksBySpecialist(user.id);
            setTasks(data);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            toast.error("Không thể tải danh sách công việc.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    
    // Các hàm handle còn lại giữ nguyên logic, chỉ thay alert bằng toast
    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            await taskApi.updateTaskStatus(taskId, newStatus);
            toast.success(`Đã bắt đầu thực hiện công việc!`);
            fetchTasks();
        } catch (error) {
            toast.error(`Cập nhật thất bại!`);
        }
    };

    const handleFileChange = (event, taskId) => {
        setSelectedFiles({ ...selectedFiles, [taskId]: event.target.files[0] });
    };

    const handleCompleteTask = async (task) => {
        const file = selectedFiles[task.id];
        if (!file) {
            toast.warn('Vui lòng chọn file sản phẩm trước khi hoàn thành!');
            return;
        }
        if (!user) return;

        const fileTypeMap = { 'transcriber': 'notation', 'arranger': 'mix', 'artist': 'audio' };
        const fileType = fileTypeMap[user.role] || 'final';

        try {
            await fileApi.uploadFile(file, task.order_id, user.id, fileType);
            await taskApi.updateTaskStatus(task.id, 'done');
            await orderApi.updateOrderStatus(task.order_id, 'completed');
            toast.success('Hoàn thành và nộp sản phẩm thành công!');
            fetchTasks();
        } catch (error) {
            toast.error('Có lỗi xảy ra, vui lòng thử lại.');
        }
    };

    if (loading) return <div className="page-container"><p>Đang tải danh sách công việc...</p></div>;

    return (
        <div className="page-container" style={{ alignItems: 'flex-start', maxWidth: '1200px', margin: 'auto' }}>
            <h2>Công Việc Của Bạn</h2>
            {tasks.length === 0 ? (
                <p>Bạn không có công việc mới nào.</p>
            ) : (
                <div className="dashboard-features">
                    {/* Chuyển sang dùng div thay vì table để dễ style hơn */}
                    {tasks.map(task => (
                        <div key={task.id} className="task-item">
                            <h4>Đơn hàng #{task.order_id} - <span className="task-status">{task.status}</span></h4>

                            {/* --- START SỬA LỖI LOGIC HIỂN THỊ --- */}
                                {task.status === 'revision_requested' && task.revision_comment ? (
                                    <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                                        <strong>Yêu cầu chỉnh sửa:</strong> {task.revision_comment}
                                    </p>
                                ) : (
                                    <p><strong>Yêu cầu gốc:</strong> {task.description}</p>
                                )}
                                {/* --- END SỬA LỖI LOGIC --- */}

                            <p><small>Ngày giao: {new Date(task.assigned_at).toLocaleDateString()}</small></p>

                            {/* --- PHẦN LOGIC MỚI NẰM Ở ĐÂY --- */}
                            <div className="task-actions">
                                <DownloadFileButton orderId={task.order_id} />
                                
                                {task.status === 'assigned' && (
                                    <button onClick={() => handleUpdateStatus(task.id, 'in_progress')} className="form-button">Bắt đầu</button>
                                )}
                                {(task.status === 'in_progress' || task.status === 'revision_requested') && (
                                    <div className="upload-section">
                                        <input type="file" onChange={(e) => handleFileChange(e, task.id)} />
                                        <button onClick={() => handleCompleteTask(task)} className="form-button" disabled={!selectedFiles[task.id]}>
                                            Hoàn thành & Nộp
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TaskListPage;