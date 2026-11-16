const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const invoiceService = require('../services/invoiceService');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.listInvoices = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const [invoices] = await pool.execute(
      'SELECT * FROM invoices WHERE business_id = ? ORDER BY invoice_date DESC, id DESC',
      [businessId]
    );
    const [items] = await pool.execute(
      'SELECT * FROM invoice_items WHERE business_id = ? ORDER BY id ASC',
      [businessId]
    );
    const byInvoice = new Map();
    for (const item of items) {
      const k = Number(item.invoice_id);
      if (!byInvoice.has(k)) byInvoice.set(k, []);
      byInvoice.get(k).push(item);
    }
    res.json({
      success: true,
      invoices: invoices.map(inv => ({ ...inv, items: byInvoice.get(Number(inv.id)) || [] }))
    });
  } catch (err) {
    next(err);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const invoiceId = Number(req.params.id);
    const [rows] = await pool.execute(
      'SELECT * FROM invoices WHERE id = ? AND business_id = ? LIMIT 1',
      [invoiceId, businessId]
    );
    if (!rows.length) {
      throw new AppError('Invoice not found.', 404);
    }
    const [items] = await pool.execute(
      'SELECT * FROM invoice_items WHERE invoice_id = ? AND business_id = ? ORDER BY id ASC',
      [invoiceId, businessId]
    );
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE invoice_id = ? AND business_id = ? ORDER BY payment_date DESC, id DESC',
      [invoiceId, businessId]
    );
    res.json({
      success: true,
      invoice: { ...rows[0], items, payments }
    });
  } catch (err) {
    next(err);
  }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const invoice = await invoiceService.createInvoice(businessId, req.user.id, req.body || {});
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} saved.`,
      invoice,
      workspace
    });
  } catch (err) {
    next(err);
  }
};
