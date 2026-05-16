// web-app/src/pages/CoordinatorDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import orderApi from '../api/orderApi';
import taskApi from '../api/taskApi';
import authApi from '../api/authApi';
import './StudioAdminDashboard.css';
import './CoordinatorDashboard.css';

// === START: THÊM HÀM FORMAT TRẠNG THÁI ===
const formatStatusText = (status) => {
  if (status === 'in_progress') return 'in progress';
  if (status === 'revision_requested') return 'revision requested';
  if (status === 'fixed') return 'fixed';
  return status;
};
// === END: THÊM HÀM FORMAT TRẠNG THÁI ===

// Modal giao việc (Giữ nguyên)
const  AssignTaskModal = ({  order ,  onClose ,  onAssign  })  =>  {
const  [specialists, setSpecialists] = useState([]);
const  [selectedSpecialist, setSelectedSpecialist] = useState('');
const  [loading, setLoading] = useState(true);
const  roleMap = {
    'transcription': 'transcriber',
    'arrangement': 'arranger',
    'recording': 'artist'
};
const  requiredRole = roleMap[order.service_type];
useEffect(()  =>  {
    const  fetchSpecialists = async ()  =>  {
    if (!requiredRole) return;
try {
const  data = await authApi.getSpecialistsByRole(requiredRole);
setSpecialists(data);
if (data.length > 0) {
setSelectedSpecialist(data[0].id);
}
} catch (error) {
console.error("Failed to fetch specialists", error);
} finally {
setLoading(false);
}
};
fetchSpecialists();
}, [requiredRole]);
const  handleSubmit = ()  =>  {
if (!selectedSpecialist) {
toast.warn("Vui lòng chọn một chuyên viên.");
return;
}
onAssign( order , selectedSpecialist);
};
return (
<div className="modal-backdrop">
<div className="modal-content">
    <h2>Giao việc cho đơn hàng #{ order .id}</h2>
    <p><strong>Dịch vụ:</strong> { order .service_type}</p>
<div className="form-group">
    <label>Chọn chuyên viên ({requiredRole}):</label>
{loading ? (        
<p>Đang tải danh sách...</p>
) : (
<select
value={selectedSpecialist}
    onChange={( e )  =>  setSelectedSpecialist( e .target.value)}
    style={{
    width: '100%',
    padding: '0.75rem',
    color: '#333',
    backgroundColor: '#fff',
    border: '1px solid #ccc'
}}
>
{specialists.length > 0 ? (
specialists.map( sp   =>  (
    <option key={ sp .id} value={ sp .id}>{ sp .name}</option>
))
) : (
    <option value="" disabled>Không có chuyên viên phù hợp</option>
)}
    </select>
)}
</div>
        <div className="modal-actions">
            <button onClick={ onClose } className="form-button secondary">Hủy</button>
            <button onClick={handleSubmit} className="form-button" disabled={!selectedSpecialist || loading}>Xác nhận</button>
        </div>
    </div>
</div>
);
};

// Component chính (Giữ nguyên logic, sửa hiển thị)
const  CoordinatorDashboard = ()  =>  {
const  [orders, setOrders] = useState([]);
const  [loading, setLoading] = useState(true);
const  [selectedOrder, setSelectedOrder] = useState(null);
const  [filter, setFilter] = useState('all');
const  fetchOrders = useCallback(async ()  =>  {
setLoading(true);
try {
const  data = await orderApi.getAllOrders();
setOrders(data);
} catch (error) {
    toast.error("Không thể tải danh sách đơn hàng.");
    console.error("Failed to fetch orders:", error);
} finally {
setLoading(false);
}
}, []);

useEffect(()  =>  {
fetchOrders();
}, [fetchOrders]);

const  handleAssignTask = async ( order ,  specialistId )  =>  {
const  roleMap = {
    'transcription': 'transcriber',
    'arrangement': 'arranger',
    'recording': 'artist'
};
try {
const  deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
await taskApi.createTask({
    order_id:  order .id,
    assigned_to:  specialistId ,
    specialist_role: roleMap[ order .service_type],
    deadline: deadlineDate.toISOString().slice(0, 19).replace('T', ' ')
});
    await orderApi.updateOrderStatus( order .id, 'assigned');
    toast.success(`Đã giao việc cho đơn hàng #${ order .id} thành công!`);
    setSelectedOrder(null);
    fetchOrders();
} catch (error) {
    console.error("Failed to assign task:", error);
    toast.error("Giao việc thất bại!");
}
};

const  filteredOrders = orders.filter( order   =>  {
    if (filter === 'all') return true;
    return  order .status === filter;
});

// Component render sao (Giữ nguyên)
const  renderRating = ( feedback )  =>  {
    if (! feedback ) return 'N/A';
return (
<span title={ feedback .comment || 'Không có bình luận'}>
    {' ⭐ '.repeat( feedback .rating)}
    {' ☆ '.repeat(5 -  feedback .rating)}
</span>
);
};

if (loading) return <p>Đang tải bảng điều khiển...</p>;

return (
<>
<h2 style={{color: 'white', width: '100%'}}>Quản lý Toàn bộ Đơn hàng</h2>

{/* Bộ lọc (Giữ nguyên) */}
<div className="filter-buttons">
<button onClick={()  =>  setFilter('all')} className={filter === 'all' ? 'active' : ''}>Tất cả</button>
<button onClick={()  =>  setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>Chờ phân công</button>
<button onClick={()  =>  setFilter('assigned')} className={filter === 'assigned' ? 'active' : ''}>Đã phân công</button>
<button onClick={()  =>  setFilter('in_progress')} className={filter === 'in_progress' ? 'active' : ''}>Đang thực hiện</button>
<button onClick={()  =>  setFilter('completed')} className={filter === 'completed' ? 'active' : ''}>Hoàn thành</button>
<button onClick={()  =>  setFilter('revision_requested')} className={filter === 'revision_requested' ? 'active' : ''}>Cần sửa</button>
<button onClick={() => setFilter('fixed')} className={filter === 'fixed' ? 'active' : ''}>Đã sửa</button>
<button onClick={()  =>  setFilter('paid')} className={filter === 'paid' ? 'active' : ''}>Đã thanh toán</button>
</div>

<div className="dashboard-features" style={{width: '100%', overflowX: 'auto'}}>
{filteredOrders.length === 0 ? (
<p>Không có đơn hàng nào khớp với bộ lọc.</p>
) : (
<table className="admin-table" style={{color: 'black'}}>
<thead>
<tr>
    <th>ID</th>
    <th>Dịch vụ</th>
    <th>Trạng thái</th>
    <th>Chuyên viên</th>
    <th>Đánh giá</th>
    <th>Chi tiết</th>
</tr>
</thead>
<tbody>
{filteredOrders.map( order   =>  (
<tr key={ order .id}>
<td>< Link  to={`/orders/${ order .id}`}>#{ order .id}</ Link ></td>
<td>{ order .service_type}</td>
<td>
{/* === START: SỬA HIỂN THỊ TRẠNG THÁI === */}
<span className={`status-badge status-${ order .status}`}>
{formatStatusText( order .status)}
</span>
{/* === END: SỬA HIỂN THỊ TRẠNG THÁI === */}
</td>
<td>{ order .assignedSpecialist || 'Chưa giao'}</td>
<td>{renderRating( order .feedback)}</td>
<td>
{ order .status === 'pending' && (
<button onClick={()  =>  setSelectedOrder( order )} className="form-button">Giao việc</button>
)}
{ order .status !== 'pending' && (
< Link  to={`/orders/${ order .id}`} className="form-button secondary" style={{color:'white'}}>Xem</ Link >
)}
</td>
</tr>
))}
        </tbody>
    </table>
)}
</div>

{selectedOrder && (
                < AssignTaskModal
                order={selectedOrder}
                onClose={()  =>  setSelectedOrder(null)}
                onAssign={handleAssignTask}
                />
            )}
        </>
    );
};
export default CoordinatorDashboard;
