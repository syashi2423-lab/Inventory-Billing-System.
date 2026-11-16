const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

const COOKIE_NAME = 'munnem_token';

/**
 * Middleware to authenticate requests via HTTP-only JWT cookie or Bearer token.
 * Enforces strict multi-business isolation by loading the user's current business_id and active status from MySQL.
 */
async function authenticate(req, res, next) {
  try {
    let token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({
        success: false,
        message: 'Your session has expired or is invalid. Please sign in again.'
      });
    }

    const [rows] = await pool.execute(
      `SELECT u.id, u.business_id, u.name, u.email, u.role, u.is_active,
              b.business_name, b.currency_code, b.currency_symbol, b.currency_locale
         FROM users u
         INNER JOIN businesses b ON b.id = u.business_id
        WHERE u.id = ? AND u.business_id = ?
        LIMIT 1`,
      [decoded.userId, decoded.businessId]
    );

    if (!rows.length) {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({
        success: false,
        message: 'User account or business workspace no longer exists.'
      });
    }

    const user = rows[0];
    if (!user.is_active) {
      res.clearCookie(COOKIE_NAME);
      return res.status(403).json({
        success: false,
        message: 'Your user account has been disabled by the business owner.'
      });
    }

    req.user = {
      id: user.id,
      businessId: user.business_id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessName: user.business_name
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based access control middleware.
 * @param  {...string} allowedRoles - e.g. 'owner', 'manager', 'cashier'
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`
      });
    }
    next();
  };
}

module.exports = {
  COOKIE_NAME,
  authenticate,
  authorizeRoles
};
