const { pool } = require('../config/db');
const invoiceService = require('../services/invoiceService');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.listPayments = async (req, res, next) => {
  try {
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE business_id = ? ORDER BY payment_date DESC, id DESC',
      [req.user.businessId]
    );
    res.json({ success: true, payments });
  } catch (err) {
    next(err);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const result = await invoiceService.recordInvoicePayment(businessId, req.user.id, req.body || {});
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      payment: result,
      workspace
    });
  } catch (err) {
    next(err);
  }
};
