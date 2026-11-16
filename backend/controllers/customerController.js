const { pool, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const {
  requireNonEmptyString,
  optionalString,
  requireNonNegativeNumber,
  isValidGstin
} = require('../middleware/validate');
const Models = require('../models');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.listCustomers = async (req, res, next) => {
  try {
    const customers = await Models.getCustomersWithStats(req.user.businessId);
    res.json({ success: true, customers });
  } catch (err) {
    next(err);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const body = req.body || {};

    const name = requireNonEmptyString(body.name, 'Customer name', 120);
    const phone = optionalString(body.phone, 30);
    const email = optionalString(body.email, 150);
    const city = optionalString(body.city, 80);
    const address = optionalString(body.address, 255);
    const gstin = optionalString(body.gstin, 20).toUpperCase();
    const creditLimit = requireNonNegativeNumber(body.creditLimit ?? 0, 'Credit limit');

    if (!isValidGstin(gstin)) {
      throw new AppError('Customer GSTIN format is not valid.', 400);
    }

    if (phone) {
      const normalized = phone.replace(/\s+/g, '');
      const [existing] = await pool.execute(
        'SELECT id, phone FROM customers WHERE business_id = ?',
        [businessId]
      );
      if (existing.some(c => String(c.phone || '').replace(/\s+/g, '') === normalized)) {
        throw new AppError('This phone number is already assigned to another customer.', 409);
      }
    }

    const [resCust] = await pool.execute(
      `INSERT INTO customers (business_id, name, phone, email, city, address, gstin, credit_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [businessId, name, phone, email, city, address, gstin, creditLimit]
    );

    await logAudit(pool, businessId, req.user.id, 'Customer added', name);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({
      success: true,
      message: 'Customer added successfully.',
      customerId: resCust.insertId,
      workspace
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const customerId = Number(req.params.id);
    const body = req.body || {};

    const [rows] = await pool.execute(
      'SELECT * FROM customers WHERE id = ? AND business_id = ? LIMIT 1',
      [customerId, businessId]
    );
    if (!rows.length) {
      throw new AppError('Customer record not found.', 404);
    }

    const name = requireNonEmptyString(body.name, 'Customer name', 120);
    const phone = optionalString(body.phone, 30);
    const email = optionalString(body.email, 150);
    const city = optionalString(body.city, 80);
    const address = optionalString(body.address, 255);
    const gstin = optionalString(body.gstin, 20).toUpperCase();
    const creditLimit = requireNonNegativeNumber(body.creditLimit ?? 0, 'Credit limit');

    if (!isValidGstin(gstin)) {
      throw new AppError('Customer GSTIN format is not valid.', 400);
    }

    if (phone) {
      const normalized = phone.replace(/\s+/g, '');
      const [existing] = await pool.execute(
        'SELECT id, phone FROM customers WHERE business_id = ? AND id != ?',
        [businessId, customerId]
      );
      if (existing.some(c => String(c.phone || '').replace(/\s+/g, '') === normalized)) {
        throw new AppError('This phone number is already assigned to another customer.', 409);
      }
    }

    await pool.execute(
      `UPDATE customers
          SET name = ?, phone = ?, email = ?, city = ?, address = ?, gstin = ?, credit_limit = ?
        WHERE id = ? AND business_id = ?`,
      [name, phone, email, city, address, gstin, creditLimit, customerId, businessId]
    );

    // Keep denormalized customer_name synced on past invoices/payments for this customer
    await pool.execute(
      'UPDATE invoices SET customer_name = ? WHERE business_id = ? AND customer_id = ?',
      [name, businessId, customerId]
    );
    await pool.execute(
      'UPDATE payments SET customer_name = ? WHERE business_id = ? AND customer_id = ?',
      [name, businessId, customerId]
    );

    await logAudit(pool, businessId, req.user.id, 'Customer updated', name);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Customer updated successfully.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const customerId = Number(req.params.id);

    const [dueRows] = await pool.execute(
      'SELECT COALESCE(SUM(balance_due), 0) AS due FROM invoices WHERE business_id = ? AND customer_id = ?',
      [businessId, customerId]
    );
    if (Number(dueRows[0]?.due || 0) > 0) {
      throw new AppError('Cannot delete a customer with an outstanding balance.', 400);
    }

    await pool.execute('DELETE FROM customers WHERE id = ? AND business_id = ?', [customerId, businessId]);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Customer deleted.', workspace });
  } catch (err) {
    next(err);
  }
};
