const env = require('../config/env');
const { COOKIE_NAME } = require('../middleware/auth');
const authService = require('../services/authService');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

exports.register = async (req, res, next) => {
  try {
    const { user, businessId, token } = await authService.registerBusiness(req.body || {});
    setAuthCookie(res, token);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({
      success: true,
      message: 'Business account created with a fresh workspace.',
      user: {
        id: user.id,
        businessId: user.business_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      workspace
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { user, businessId, token } = await authService.loginUser(req.body || {});
    setAuthCookie(res, token);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({
      success: true,
      message: 'Signed in successfully.',
      user: {
        id: user.id,
        businessId: user.business_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      workspace
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({
    success: true,
    message: 'Signed out successfully.'
  });
};

exports.me = async (req, res, next) => {
  try {
    const workspace = await getWorkspaceSnapshot(req.user.businessId);
    res.json({
      success: true,
      user: req.user,
      workspace
    });
  } catch (err) {
    next(err);
  }
};
