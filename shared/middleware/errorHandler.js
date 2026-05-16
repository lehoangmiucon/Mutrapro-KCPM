// shared/middleware/errorHandler.js
const { logger } = require('../logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi từ phía máy chủ';

  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Dữ liệu bạn cung cấp đã tồn tại.';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFound = (req, res, next) => {
  const error = new AppError(`Không tìm thấy đường dẫn - ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFound
};