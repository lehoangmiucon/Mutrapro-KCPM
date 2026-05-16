import React, { useState } from 'react';
import { toast } from 'react-toastify';
import orderApi from '../api/orderApi';
import './FeedbackForm.css'; // Sẽ tạo file CSS này ngay sau đây

const FeedbackForm = ({ orderId, onFeedbackSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            toast.warn('Vui lòng chọn số sao đánh giá.');
            return;
        }
        setLoading(true);
        try {
            await orderApi.submitFeedback(orderId, { rating, comment });
            toast.success('Cảm ơn bạn đã gửi đánh giá!');
            if (onFeedbackSubmitted) {
                onFeedbackSubmitted(); // Gọi lại hàm từ component cha để làm mới dữ liệu
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gửi đánh giá thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="feedback-container dashboard-features">
            <h3>Để lại đánh giá của bạn</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group star-rating">
                    {[...Array(5)].map((star, index) => {
                        index += 1;
                        return (
                            <button
                                type="button"
                                key={index}
                                className={index <= (hover || rating) ? "star on" : "star off"}
                                onClick={() => setRating(index)}
                                onMouseEnter={() => setHover(index)}
                                onMouseLeave={() => setHover(rating)}
                            >
                                <span className="star-icon">&#9733;</span>
                            </button>
                        );
                    })}
                </div>
                <div className="form-group">
                    <label>Bình luận (tùy chọn)</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows="4"
                        placeholder="Chia sẻ cảm nhận của bạn về dịch vụ..."
                        className="feedback-textarea"
                    />
                </div>
                <button type="submit" className="form-button" disabled={loading}>
                    {loading ? 'Đang gửi...' : 'Gửi Đánh Giá'}
                </button>
            </form>
        </div>
    );
};

export default FeedbackForm;