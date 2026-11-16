const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool, withTransaction, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const {
  requireNonEmptyString,
  optionalString,
  isValidEmail,
  isValidGstin
} = require('../middleware/validate');

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      businessId: user.business_id,
      role: user.role,
      email: user.email
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * Register a brand-new business account and its Owner user.
 * Creates a completely fresh, isolated, empty workspace in MySQL (no demo/sample data).
 */
async function registerBusiness(payload) {
  const businessName = requireNonEmptyString(payload.businessName, 'Business name', 120);
  const ownerName = requireNonEmptyString(payload.ownerName, 'Owner name', 100);
  const email = requireNonEmptyString(payload.email, 'Email', 150).toLowerCase();
  const password = String(payload.password || '');
  const phone = optionalString(payload.phone, 30);
  const address = optionalString(payload.address, 255);
  const city = optionalString(payload.city, 80);
  const state = optionalString(payload.state, 80);
  const pinCode = optionalString(payload.pinCode, 20);
  const gstin = optionalString(payload.gstin, 20).toUpperCase();
  const invoicePrefix = optionalString(payload.invoicePrefix || 'INV', 16).toUpperCase() || 'INV';

  if (!isValidEmail(email)) {
    throw new AppError('Please enter a valid email address.', 400);
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long.', 400);
  }
  if (!isValidGstin(gstin)) {
    throw new AppError('Invalid GSTIN format. Expected 15-character Indian GSTIN.', 400);
  }

  return withTransaction(async (conn) => {
    const [existing] = await conn.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (existing.length > 0) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const [bizResult] = await conn.execute(
      `INSERT INTO businesses (
        business_name, owner_name, email, phone, address, city, state, pin_code,
        gstin, invoice_prefix, next_invoice_number, next_po_number,
        currency_code, currency_symbol, currency_locale
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'INR', '₹', 'en-IN')`,
      [businessName, ownerName, email, phone, address, city, state, pinCode, gstin, invoicePrefix]
    );

    const businessId = bizResult.insertId;

    // Seed standard GST tax slabs for the new business (no demo products, customers, or invoices)
    const defaultTaxes = [
      ['GST 0%', 0],
      ['GST 5%', 5],
      ['GST 12%', 12],
      ['GST 18%', 18],
      ['GST 28%', 28]
    ];
    for (const [taxName, rate] of defaultTaxes) {
      await conn.execute(
        'INSERT INTO tax_rates (business_id, name, rate) VALUES (?, ?, ?)',
        [businessId, taxName, rate]
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [userResult] = await conn.execute(
      `INSERT INTO users (business_id, name, email, password_hash, role, is_active, last_login_at)
       VALUES (?, ?, ?, ?, 'owner', 1, NOW())`,
      [businessId, ownerName, email, passwordHash]
    );

    const userId = userResult.insertId;
    await logAudit(conn, businessId, userId, 'Business registered', `${businessName} (${email})`);

    const user = {
      id: userId,
      business_id: businessId,
      name: ownerName,
      email,
      role: 'owner',
      is_active: 1
    };
    const token = signToken(user);

    return { user, businessId, token };
  });
}

/**
 * Authenticate an existing user and return JWT token + user profile.
 */
async function loginUser({ email, password }) {
  const cleanEmail = requireNonEmptyString(email, 'Email', 150).toLowerCase();
  const rawPassword = String(password || '');
  if (!rawPassword) {
    throw new AppError('Password is required.', 400);
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.business_id, u.name, u.email, u.password_hash, u.role, u.is_active,
            b.business_name
       FROM users u
       INNER JOIN businesses b ON b.id = u.business_id
      WHERE u.email = ?
      LIMIT 1`,
    [cleanEmail]
  );

  if (!rows.length) {
    throw new AppError('Incorrect email or password.', 401);
  }

  const user = rows[0];
  if (!user.is_active) {
    throw new AppError('Your account has been disabled. Please contact your business owner.', 403);
  }

  const matched = await bcrypt.compare(rawPassword, user.password_hash);
  if (!matched) {
    throw new AppError('Incorrect email or password.', 401);
  }

  await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  await logAudit(pool, user.business_id, user.id, 'User signed in', user.email);

  const token = signToken(user);
  return {
    user: {
      id: user.id,
      business_id: user.business_id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      business_name: user.business_name
    },
    businessId: user.business_id,
    token
  };
}

module.exports = {
  SALT_ROUNDS,
  signToken,
  registerBusiness,
  loginUser
};
