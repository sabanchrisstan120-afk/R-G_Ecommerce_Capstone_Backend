const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');
const { query } = require('../config/database');

/**
 * Authenticate: validates the Bearer token and attaches user to req
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active
    const { rows } = await query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return unauthorized(res, 'User not found or deactivated');
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid token');
    }
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Authorize: restrict to specific roles
 * Usage: authorize('admin', 'superadmin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res);
    }
    if (!roles.includes(req.user.role)) {
      return forbidden(res, 'You do not have permission to access this resource');
    }
    next();
  };
};

module.exports = { authenticate, authorize };
