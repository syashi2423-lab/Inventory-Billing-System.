const { pool, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { requireNonEmptyString, optionalString, isValidGstin } = require('../middleware/validate');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.listSuppliers = async (req, res, next) => {
  try {
    const [suppliers] = await pool.execute(
      'SELECT * FROM suppliers WHERE business_id = ? ORDER BY name ASC, id ASC',
      [req.user.businessId]
    );
    res.json({ success: true, suppliers });
  } catch (err) {
    next(err);
  }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const body = req.body || {};

    const name = requireNonEmptyString(body.name, 'Supplier name', 120);
    const phone = optionalString(body.phone, 30);
    const email = optionalString(body.email, 150);
    const gstin = optionalString(body.gstin, 20).toUpperCase();
    const address = optionalString(body.address, 255);

    if (!isValidGstin(gstin)) {
      throw new AppError('GSTIN format is not valid.', 400);
    }

    await pool.execute(
      'INSERT INTO suppliers (business_id, name, phone, email, gstin, address) VALUES (?, ?, ?, ?, ?, ?)',
      [businessId, name, phone, email, gstin, address]
    );

    await logAudit(pool, businessId, req.user.id, 'Supplier added', name);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({ success: true, message: 'Supplier saved.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const supplierId = Number(req.params.id);
    const body = req.body || {};

    const [rows] = await pool.execute(
      'SELECT * FROM suppliers WHERE id = ? AND business_id = ? LIMIT 1',
      [supplierId, businessId]
    );
    if (!rows.length) {
      throw new AppError('Supplier not found.', 404);
    }

    const name = requireNonEmptyString(body.name, 'Supplier name', 120);
    const phone = optionalString(body.phone, 30);
    const email = optionalString(body.email, 150);
    const gstin = optionalString(body.gstin, 20).toUpperCase();
    const address = optionalString(body.address, 255);

    if (!isValidGstin(gstin)) {
      throw new AppError('GSTIN format is not valid.', 400);
    }

    await pool.execute(
      `UPDATE suppliers
          SET name = ?, phone = ?, email = ?, gstin = ?, address = ?
        WHERE id = ? AND business_id = ?`,
      [name, phone, email, gstin, address, supplierId, businessId]
    );
    await pool.execute(
      'UPDATE purchase_orders SET supplier_name = ? WHERE business_id = ? AND supplier_id = ?',
      [name, businessId, supplierId]
    );

    await logAudit(pool, businessId, req.user.id, 'Supplier updated', name);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Supplier saved.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const supplierId = Number(req.params.id);

    const [poRows] = await pool.execute(
      'SELECT id FROM purchase_orders WHERE business_id = ? AND supplier_id = ? LIMIT 1',
      [businessId, supplierId]
    );
    if (poRows.length) {
      throw new AppError('This supplier has purchase orders and cannot be deleted.', 400);
    }

    await pool.execute('DELETE FROM suppliers WHERE id = ? AND business_id = ?', [supplierId, businessId]);
    await logAudit(pool, businessId, req.user.id, 'Supplier deleted', `ID ${supplierId}`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Supplier deleted.', workspace });
  } catch (err) {
    next(err);
  }
};
