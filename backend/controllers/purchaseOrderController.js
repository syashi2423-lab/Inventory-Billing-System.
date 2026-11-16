const { pool } = require('../config/db');
const purchaseOrderService = require('../services/purchaseOrderService');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.listPurchaseOrders = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const [orders] = await pool.execute(
      'SELECT * FROM purchase_orders WHERE business_id = ? ORDER BY id DESC',
      [businessId]
    );
    const [items] = await pool.execute(
      'SELECT * FROM purchase_order_items WHERE business_id = ? ORDER BY id ASC',
      [businessId]
    );
    const byPo = new Map();
    for (const item of items) {
      const k = Number(item.purchase_order_id);
      if (!byPo.has(k)) byPo.set(k, []);
      byPo.get(k).push(item);
    }
    res.json({
      success: true,
      purchaseOrders: orders.map(o => ({ ...o, lines: byPo.get(Number(o.id)) || [] }))
    });
  } catch (err) {
    next(err);
  }
};

exports.createPurchaseOrder = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const po = await purchaseOrderService.createPurchaseOrder(businessId, req.user.id, req.body || {});
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({
      success: true,
      message: `Purchase order ${po.poNumber} saved.`,
      purchaseOrder: po,
      workspace
    });
  } catch (err) {
    next(err);
  }
};

exports.updatePurchaseOrderStatus = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const poId = Number(req.params.id);
    const action = String(req.body?.action || '');
    const result = await purchaseOrderService.updatePurchaseOrderStatus(businessId, req.user.id, poId, action);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({
      success: true,
      message: `${result.poNumber} updated.`,
      result,
      workspace
    });
  } catch (err) {
    next(err);
  }
};

exports.payPurchaseOrder = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const poId = Number(req.params.id);
    const result = await purchaseOrderService.payPurchaseOrder(businessId, req.user.id, poId, req.body || {});
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({
      success: true,
      message: 'Supplier payment recorded.',
      result,
      workspace
    });
  } catch (err) {
    next(err);
  }
};
