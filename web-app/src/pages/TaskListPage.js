// web-app/src/pages/TaskListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'; // DĂ¹ng useAuth cho gá»n
import { toast } from 'react-toastify';
import taskApi from '../api/taskApi';
import fileApi from '../api/fileApi';
import orderApi from '../api/orderApi';

// --- Táº O Má»˜T COMPONENT NHá» Äá»‚ Xá»¬ LĂ NĂT Táº¢I FILE ---
const DownloadFileButton = ({ orderId }) => {
    const [fileInfo, setFileInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchFile = async () => {
            try {
                // Chá»‰ láº¥y file 'audio' (file gá»‘c cá»§a khĂ¡ch hĂ ng)
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
        return <small>Äang kiá»ƒm tra file...</small>;
    }

    return fileInfo ? (
        <button
            onClick={async () => {
                setDownloading(true);
                try {
                    await fileApi.downloadFile(fileInfo.id, fileInfo.file_name);
                } catch (error) {
                    toast.error(error.message || 'Không thể tải file.');
                } finally {
                    setDownloading(false);
                }
            }}
            className="form-button secondary"
            disabled={downloading}
            style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '10px', color: 'white' }}
        >
            Tải file của khách
        </button>
    ) : (
        <small>KhĂ´ng cĂ³ file yĂªu cáº§u.</small>
    );
};


const TaskListPage = () => {
    const { user } = useAuth(); // DĂ¹ng AuthContext
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState({});

    // DĂ¹ng useCallback Ä‘á»ƒ trĂ¡nh warning vĂ  tá»‘i Æ°u
    const fetchTasks = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await taskApi.getTasksBySpecialist(user.id);
            setTasks(data);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            toast.error("KhĂ´ng thá»ƒ táº£i danh sĂ¡ch cĂ´ng viá»‡c.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    
    // CĂ¡c hĂ m handle cĂ²n láº¡i giá»¯ nguyĂªn logic, chá»‰ thay alert báº±ng toast
    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            await taskApi.updateTaskStatus(taskId, newStatus);
            toast.success(`ÄĂ£ báº¯t Ä‘áº§u thá»±c hiá»‡n cĂ´ng viá»‡c!`);
            fetchTasks();
        } catch (error) {
            toast.error(`Cáº­p nháº­t tháº¥t báº¡i!`);
        }
    };

    const handleFileChange = (event, taskId) => {
        setSelectedFiles({ ...selectedFiles, [taskId]: event.target.files[0] });
    };

    const handleCompleteTask = async (task) => {
        const file = selectedFiles[task.id];
        if (!file) {
            toast.warn('Vui lĂ²ng chá»n file sáº£n pháº©m trÆ°á»›c khi hoĂ n thĂ nh!');
            return;
        }
        if (!user) return;

        const fileTypeMap = { 'transcriber': 'notation', 'arranger': 'mix', 'artist': 'audio' };
        const fileType = fileTypeMap[user.role] || 'final';

        try {
            await fileApi.uploadFile(file, task.order_id, fileType);
            await taskApi.updateTaskStatus(task.id, 'done');
            await orderApi.updateOrderStatus(task.order_id, 'completed');
            toast.success('HoĂ n thĂ nh vĂ  ná»™p sáº£n pháº©m thĂ nh cĂ´ng!');
            fetchTasks();
        } catch (error) {
            toast.error(error.message || 'CĂ³ lá»—i xáº£y ra, vui lĂ²ng thá»­ láº¡i.');
        }
    };

    if (loading) return <div className="page-container"><p>Äang táº£i danh sĂ¡ch cĂ´ng viá»‡c...</p></div>;

    return (
        <div className="page-container" style={{ alignItems: 'flex-start', maxWidth: '1200px', margin: 'auto' }}>
            <h2>CĂ´ng Viá»‡c Cá»§a Báº¡n</h2>
            {tasks.length === 0 ? (
                <p>Báº¡n khĂ´ng cĂ³ cĂ´ng viá»‡c má»›i nĂ o.</p>
            ) : (
                <div className="dashboard-features">
                    {/* Chuyá»ƒn sang dĂ¹ng div thay vĂ¬ table Ä‘á»ƒ dá»… style hÆ¡n */}
                    {tasks.map(task => (
                        <div key={task.id} className="task-item">
                            <h4>ÄÆ¡n hĂ ng #{task.order_id} - <span className="task-status">{task.status}</span></h4>

                            {/* --- START Sá»¬A Lá»–I LOGIC HIá»‚N THá» --- */}
                                {task.status === 'revision_requested' && task.revision_comment ? (
                                    <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                                        <strong>YĂªu cáº§u chá»‰nh sá»­a:</strong> {task.revision_comment}
                                    </p>
                                ) : (
                                    <p><strong>YĂªu cáº§u gá»‘c:</strong> {task.description}</p>
                                )}
                                {/* --- END Sá»¬A Lá»–I LOGIC --- */}

                            <p><small>NgĂ y giao: {new Date(task.assigned_at).toLocaleDateString()}</small></p>

                            {/* --- PHáº¦N LOGIC Má»I Náº°M á» ÄĂ‚Y --- */}
                            <div className="task-actions">
                                <DownloadFileButton orderId={task.order_id} />
                                
                                {task.status === 'assigned' && (
                                    <button onClick={() => handleUpdateStatus(task.id, 'in_progress')} className="form-button">Báº¯t Ä‘áº§u</button>
                                )}
                                {(task.status === 'in_progress' || task.status === 'revision_requested') && (
                                    <div className="upload-section">
                                        <input type="file" onChange={(e) => handleFileChange(e, task.id)} />
                                        <button onClick={() => handleCompleteTask(task)} className="form-button" disabled={!selectedFiles[task.id]}>
                                            HoĂ n thĂ nh & Ná»™p
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

