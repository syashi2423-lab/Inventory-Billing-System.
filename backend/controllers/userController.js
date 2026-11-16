const bcrypt = require('bcrypt');
const { pool, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { requireNonEmptyString, isValidEmail } = require('../middleware/validate');
const { SALT_ROUNDS } = require('../services/authService');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

async function countActiveOwners(businessId) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS cnt FROM users WHERE business_id = ? AND role = 'owner' AND is_active = 1",
    [businessId]
  );
  return Number(rows[0]?.cnt || 0);
}

exports.listUsers = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, business_id, name, email, role, is_active, last_login_at, created_at FROM users WHERE business_id = ? ORDER BY id ASC',
      [req.user.businessId]
    );
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const name = requireNonEmptyString(req.body?.name, 'Name', 100);
    const email = requireNonEmptyString(req.body?.email, 'Email', 150).toLowerCase();
    const password = String(req.body?.password || '');
    const role = ['owner', 'manager', 'cashier'].includes(req.body?.role) ? req.body.role : 'cashier';

    if (!isValidEmail(email)) {
      throw new AppError('Enter a valid email address.', 400);
    }
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters.', 400);
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      throw new AppError('That email already has an account.', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.execute(
      'INSERT INTO users (business_id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [businessId, name, email, passwordHash, role]
    );

    await logAudit(pool, businessId, req.user.id, 'User added', `${email} (${role})`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({ success: true, message: 'User added successfully.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const targetId = Number(req.params.id);
    const newRole = req.body?.role;

    if (!['owner', 'manager', 'cashier'].includes(newRole)) {
      throw new AppError('Invalid role.', 400);
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND business_id = ? LIMIT 1',
      [targetId, businessId]
    );
    if (!rows.length) {
      throw new AppError('User not found in your business.', 404);
    }
    const target = rows[0];

    if (target.role === 'owner' && newRole !== 'owner' && target.is_active) {
      const owners = await countActiveOwners(businessId);
      if (owners < 2) {
        throw new AppError('Keep at least one active Owner in your business.', 400);
      }
    }

    await pool.execute('UPDATE users SET role = ? WHERE id = ? AND business_id = ?', [newRole, targetId, businessId]);
    await logAudit(pool, businessId, req.user.id, 'Role changed', `${target.email} → ${newRole}`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'User role updated.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const targetId = Number(req.params.id);

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND business_id = ? LIMIT 1',
      [targetId, businessId]
    );
    if (!rows.length) {
      throw new AppError('User not found in your business.', 404);
    }
    const target = rows[0];

    if (target.is_active && target.role === 'owner') {
      const owners = await countActiveOwners(businessId);
      if (owners < 2) {
        throw new AppError('Keep at least one active Owner in your business.', 400);
      }
    }

    const nextActive = target.is_active ? 0 : 1;
    await pool.execute('UPDATE users SET is_active = ? WHERE id = ? AND business_id = ?', [nextActive, targetId, businessId]);
    await logAudit(pool, businessId, req.user.id, nextActive ? 'User enabled' : 'User disabled', target.email);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'User status updated.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const targetId = Number(req.params.id);
    const password = String(req.body?.password || '');

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters.', 400);
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND business_id = ? LIMIT 1',
      [targetId, businessId]
    );
    if (!rows.length) {
      throw new AppError('User not found in your business.', 404);
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ? AND business_id = ?', [hash, targetId, businessId]);
    await logAudit(pool, businessId, req.user.id, 'Password reset', rows[0].email);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Password updated.', workspace });
  } catch (err) {
    next(err);
  }
};
