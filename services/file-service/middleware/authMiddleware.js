const jwt = require('jsonwebtoken');
const { AppError } = require('../shared/middleware/errorHandler');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication is required.', 401);
        }

        const token = authHeader.split(' ')[1];
        req.token = token;
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        next(new AppError('Token is invalid or expired.', 401));
    }
};

module.exports = { authMiddleware };
