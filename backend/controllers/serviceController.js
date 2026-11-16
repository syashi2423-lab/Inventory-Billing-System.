const { pool, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const {
  requireNonEmptyString,
  optionalString,
  requireNonNegativeNumber
} = require('../middleware/validate');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.listServices = async (req, res, next) => {
  try {
    const [services] = await pool.execute(
      'SELECT * FROM services WHERE business_id = ? ORDER BY name ASC, id ASC',
      [req.user.businessId]
    );
    res.json({ success: true, services });
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const body = req.body || {};

    const name = requireNonEmptyString(body.name, 'Service name', 120);
    const price = requireNonNegativeNumber(body.price, 'Service price');
    const unit = optionalString(body.unit || 'job', 40) || 'job';
    const taxRate = requireNonNegativeNumber(body.taxRate ?? body.tax ?? 0, 'Tax rate');
    const description = optionalString(body.description || body.desc, 255);
    const isActive = body.active === false ? 0 : 1;

    await pool.execute(
      `INSERT INTO services (business_id, name, unit, price, tax_rate, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [businessId, name, unit, price, taxRate, description, isActive]
    );

    await logAudit(pool, businessId, req.user.id, 'Service added', name);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({ success: true, message: 'Service saved.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const serviceId = Number(req.params.id);
    const body = req.body || {};

    const [rows] = await pool.execute(
      'SELECT * FROM services WHERE id = ? AND business_id = ? LIMIT 1',
      [serviceId, businessId]
    );
    if (!rows.length) {
      throw new AppError('Service not found.', 404);
    }

    const name = requireNonEmptyString(body.name, 'Service name', 120);
    const price = requireNonNegativeNumber(body.price, 'Service price');
    const unit = optionalString(body.unit || 'job', 40) || 'job';
    const taxRate = requireNonNegativeNumber(body.taxRate ?? body.tax ?? 0, 'Tax rate');
    const description = optionalString(body.description || body.desc, 255);
    const isActive = body.active === false ? 0 : 1;

    await pool.execute(
      `UPDATE services
          SET name = ?, unit = ?, price = ?, tax_rate = ?, description = ?, is_active = ?
        WHERE id = ? AND business_id = ?`,
      [name, unit, price, taxRate, description, isActive, serviceId, businessId]
    );

    await logAudit(pool, businessId, req.user.id, 'Service updated', name);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Service saved.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const serviceId = Number(req.params.id);

    await pool.execute('DELETE FROM services WHERE id = ? AND business_id = ?', [serviceId, businessId]);
    await logAudit(pool, businessId, req.user.id, 'Service deleted', `ID ${serviceId}`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Service deleted.', workspace });
  } catch (err) {
    next(err);
  }
};
