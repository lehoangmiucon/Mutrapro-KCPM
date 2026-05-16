// web-app/src/components/PaymentConfirmModal.js
import React from 'react';
import './PaymentConfirmModal.css'; // Sẽ tạo file CSS này ngay sau đây

const PaymentConfirmModal = ({ order, onConfirm, onCancel, loading }) => {
    if (!order) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content payment-modal">
                <h2>Xác Nhận Thanh Toán</h2>
                <p>Vui lòng xem lại thông tin đơn hàng trước khi thanh toán.</p>
                
                <div className="order-review-info">
                    <p><strong>Mã đơn hàng:</strong> #{order.id}</p>
                    <p><strong>Dịch vụ:</strong> {order.service_type}</p>
                    <p className="order-price"><strong>Tổng tiền:</strong> {Number(order.price).toLocaleString('vi-VN')} VNĐ</p>
                </div>

                <div className="modal-actions">
                    <button onClick={onCancel} className="form-button secondary" disabled={loading}>
                        Hủy
                    </button>
                    <button onClick={onConfirm} className="form-button" disabled={loading}>
                        {loading ? 'Đang xử lý...' : 'Xác nhận & Thanh toán'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentConfirmModal;