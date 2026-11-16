const { pool, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const {
  requireNonEmptyString,
  optionalString,
  isValidGstin,
  roundMoney
} = require('../middleware/validate');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

const CURRENCY_MAP = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  AED: { symbol: 'AED ', locale: 'en-AE' },
  BDT: { symbol: '৳', locale: 'bn-BD' }
};

exports.getWorkspace = async (req, res, next) => {
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

exports.updateSettings = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const body = req.body || {};

    const [rows] = await pool.execute('SELECT * FROM businesses WHERE id = ? LIMIT 1', [businessId]);
    if (!rows.length) throw new AppError('Business not found.', 404);
    const current = rows[0];

    const businessName = body.shopName !== undefined || body.businessName !== undefined
      ? requireNonEmptyString(body.shopName || body.businessName, 'Business name', 120)
      : current.business_name;
    const ownerName = body.owner !== undefined || body.ownerName !== undefined
      ? optionalString(body.owner ?? body.ownerName, 100) || current.owner_name
      : current.owner_name;
    const phone = body.phone !== undefined ? optionalString(body.phone, 30) : current.phone;
    const address = body.address !== undefined ? optionalString(body.address, 255) : current.address;
    const city = body.city !== undefined ? optionalString(body.city, 80) : current.city;
    const state = body.state !== undefined ? optionalString(body.state, 80) : current.state;
    const pinCode = body.pinCode !== undefined ? optionalString(body.pinCode, 20) : current.pin_code;
    const gstin = body.gstin !== undefined
      ? optionalString(body.gstin, 20).toUpperCase()
      : current.gstin;
    const invoicePrefix = body.prefix !== undefined || body.invoicePrefix !== undefined
      ? requireNonEmptyString(body.prefix || body.invoicePrefix, 'Invoice prefix', 16).toUpperCase()
      : current.invoice_prefix;

    if (!isValidGstin(gstin)) {
      throw new AppError('GSTIN format is not valid.', 400);
    }

    let currencyCode = current.currency_code;
    let currencySymbol = current.currency_symbol;
    let currencyLocale = current.currency_locale;
    if (body.currency && CURRENCY_MAP[body.currency]) {
      currencyCode = body.currency;
      currencySymbol = CURRENCY_MAP[body.currency].symbol;
      currencyLocale = CURRENCY_MAP[body.currency].locale;
    }

    await pool.execute(
      `UPDATE businesses
          SET business_name = ?, owner_name = ?, phone = ?, address = ?, city = ?,
              state = ?, pin_code = ?, gstin = ?, invoice_prefix = ?,
              currency_code = ?, currency_symbol = ?, currency_locale = ?
        WHERE id = ?`,
      [
        businessName, ownerName, phone, address, city,
        state, pinCode, gstin, invoicePrefix,
        currencyCode, currencySymbol, currencyLocale,
        businessId
      ]
    );

    await logAudit(pool, businessId, req.user.id, 'Settings updated', businessName);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Business settings saved.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const body = req.body || {};

    const [rows] = await pool.execute('SELECT * FROM businesses WHERE id = ? LIMIT 1', [businessId]);
    if (!rows.length) throw new AppError('Business not found.', 404);
    const current = rows[0];

    const accent = body.accent ? optionalString(body.accent, 20) : current.tpl_accent;
    const size = ['A4', 'A5', '80mm'].includes(body.size) ? body.size : current.tpl_size;
    const head = body.head !== undefined ? optionalString(body.head, 200) : current.tpl_header;
    const foot = body.foot !== undefined ? optionalString(body.foot, 1000) : current.tpl_footer;
    const logo = body.logo !== undefined ? String(body.logo || '') : current.tpl_logo;

    await pool.execute(
      `UPDATE businesses
          SET tpl_accent = ?, tpl_size = ?, tpl_header = ?, tpl_footer = ?, tpl_logo = ?
        WHERE id = ?`,
      [accent, size, head, foot, logo, businessId]
    );

    await logAudit(pool, businessId, req.user.id, 'Invoice design updated', `Size ${size}`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Invoice design saved.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.addTaxRate = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const name = requireNonEmptyString(req.body?.name, 'Tax name', 60);
    const rate = Number(req.body?.rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new AppError('Tax rate must be between 0 and 100.', 400);
    }

    await pool.execute(
      'INSERT INTO tax_rates (business_id, name, rate) VALUES (?, ?, ?)',
      [businessId, name, roundMoney(rate)]
    );
    await logAudit(pool, businessId, req.user.id, 'Tax rate added', `${name} (${rate}%)`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({ success: true, message: 'Tax rate added.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.deleteTaxRate = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const taxId = Number(req.params.id);
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM tax_rates WHERE business_id = ?',
      [businessId]
    );
    if (Number(countRows[0]?.cnt || 0) < 2) {
      throw new AppError('Keep at least one tax rate in your business.', 400);
    }
    await pool.execute('DELETE FROM tax_rates WHERE id = ? AND business_id = ?', [taxId, businessId]);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Tax rate removed.', workspace });
  } catch (err) {
    next(err);
  }
};
