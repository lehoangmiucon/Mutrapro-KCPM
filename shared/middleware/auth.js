const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const isInternalRequest = (req) => {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
  const providedToken = req.headers['x-internal-service-token'];
  return Boolean(expectedToken && providedToken && providedToken === expectedToken);
};

const authMiddleware = (req, res, next) => {
  try {
    if (isInternalRequest(req)) {
      req.internalService = true;
      return next();
    }

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

const checkRole = (...allowedRoles) => (req, res, next) => {
  if (req.internalService) return next();

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to access this resource.', 403));
  }
  next();
};

const assertOwnerOrRole = (req, ownerId, roles = []) => {
  if (req.internalService) return;
  if (roles.includes(req.user.role)) return;
  if (Number(req.user.id) === Number(ownerId)) return;
  throw new AppError('You do not have permission to access this resource.', 403);
};

module.exports = {
  authMiddleware,
  checkRole,
  assertOwnerOrRole,
  isInternalRequest
};
