const { pool } = require('../config/db');
const Models = require('../models');
const { roundMoney } = require('../middleware/validate');

/**
 * Fetch the complete, live workspace state for a specific business_id.
 * Also computes dynamic dashboard metrics from actual saved database records.
 */
async function getWorkspaceSnapshot(businessId) {
  const business = await Models.getBusinessById(businessId);
  const taxes = await Models.getTaxRatesByBusiness(businessId);
  const products = await Models.getProductsByBusiness(businessId);
  const customers = await Models.getCustomersWithStats(businessId);

  const [invoices] = await pool.execute(
    'SELECT * FROM invoices WHERE business_id = ? ORDER BY invoice_date DESC, id DESC',
    [businessId]
  );
  const [invoiceItems] = await pool.execute(
    'SELECT * FROM invoice_items WHERE business_id = ? ORDER BY id ASC',
    [businessId]
  );
  const [payments] = await pool.execute(
    'SELECT * FROM payments WHERE business_id = ? ORDER BY payment_date DESC, id DESC',
    [businessId]
  );
  const [movements] = await pool.execute(
    'SELECT * FROM stock_movements WHERE business_id = ? ORDER BY created_at DESC, id DESC LIMIT 250',
    [businessId]
  );
  const [expenses] = await pool.execute(
    'SELECT * FROM expenses WHERE business_id = ? ORDER BY expense_date DESC, id DESC',
    [businessId]
  );
  const [suppliers] = await pool.execute(
    'SELECT * FROM suppliers WHERE business_id = ? ORDER BY name ASC, id ASC',
    [businessId]
  );
  const [purchaseOrders] = await pool.execute(
    'SELECT * FROM purchase_orders WHERE business_id = ? ORDER BY id DESC',
    [businessId]
  );
  const [poItems] = await pool.execute(
    'SELECT * FROM purchase_order_items WHERE business_id = ? ORDER BY id ASC',
    [businessId]
  );
  const [services] = await pool.execute(
    'SELECT * FROM services WHERE business_id = ? ORDER BY name ASC, id ASC',
    [businessId]
  );
  const [bankAccounts] = await pool.execute(
    'SELECT * FROM bank_accounts WHERE business_id = ? ORDER BY id ASC',
    [businessId]
  );
  const [bankTransactions] = await pool.execute(
    'SELECT * FROM bank_transactions WHERE business_id = ? ORDER BY tx_date DESC, id DESC',
    [businessId]
  );
  const [purchaseList] = await pool.execute(
    'SELECT * FROM purchase_list WHERE business_id = ? ORDER BY id ASC',
    [businessId]
  );
  const [auditLogs] = await pool.execute(
    'SELECT * FROM audit_logs WHERE business_id = ? ORDER BY created_at DESC, id DESC LIMIT 100',
    [businessId]
  );
  const [users] = await pool.execute(
    'SELECT id, business_id, name, email, role, is_active, last_login_at, created_at FROM users WHERE business_id = ? ORDER BY id ASC',
    [businessId]
  );

  // Group invoice items by invoice_id
  const itemsByInvoice = new Map();
  for (const item of invoiceItems) {
    const invId = Number(item.invoice_id);
    if (!itemsByInvoice.has(invId)) itemsByInvoice.set(invId, []);
    itemsByInvoice.get(invId).push(item);
  }

  // Group PO items by purchase_order_id
  const itemsByPo = new Map();
  for (const item of poItems) {
    const poId = Number(item.purchase_order_id);
    if (!itemsByPo.has(poId)) itemsByPo.set(poId, []);
    itemsByPo.get(poId).push(item);
  }

  // Compute dynamic dashboard summary from actual database records
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = (dt) => {
    if (!dt) return false;
    const d = new Date(dt);
    if (isNaN(d)) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  };

  const todayInvoices = invoices.filter(inv => isToday(inv.invoice_date));
  const todaySales = roundMoney(todayInvoices.reduce((s, inv) => s + Number(inv.grand_total || 0), 0));
  const todayOrders = todayInvoices.length;
  const todayMoneyReceived = roundMoney(
    payments.filter(p => isToday(p.payment_date)).reduce((s, p) => s + Number(p.amount || 0), 0)
  );
  const todayPending = roundMoney(todayInvoices.reduce((s, inv) => s + Number(inv.balance_due || 0), 0));

  let todayGrossProfit = 0;
  for (const inv of todayInvoices) {
    const lines = itemsByInvoice.get(Number(inv.id)) || [];
    for (const l of lines) {
      todayGrossProfit += (Number(l.unit_price || 0) - Number(l.purchase_price || 0)) * Number(l.quantity || 0);
    }
  }
  todayGrossProfit = roundMoney(todayGrossProfit);

  let allTimeGrossProfit = 0;
  for (const l of invoiceItems) {
    allTimeGrossProfit += (Number(l.unit_price || 0) - Number(l.purchase_price || 0)) * Number(l.quantity || 0);
  }
  allTimeGrossProfit = roundMoney(allTimeGrossProfit);

  const totalInventoryValue = roundMoney(
    products.reduce((s, p) => s + Number(p.purchase_price || 0) * Number(p.stock_quantity || 0), 0)
  );
  const lowStockCount = products.filter(p => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= Number(p.min_stock_level)).length;
  const outOfStockCount = products.filter(p => Number(p.stock_quantity) === 0).length;
  const totalPendingPayments = roundMoney(invoices.reduce((s, inv) => s + Number(inv.balance_due || 0), 0));

  return {
    business,
    taxes,
    products,
    customers,
    invoices: invoices.map(inv => ({
      ...inv,
      items: itemsByInvoice.get(Number(inv.id)) || []
    })),
    payments,
    movements,
    expenses,
    suppliers,
    purchaseOrders: purchaseOrders.map(po => ({
      ...po,
      lines: itemsByPo.get(Number(po.id)) || []
    })),
    services,
    bankAccounts,
    bankTransactions,
    purchaseList,
    auditLogs,
    users,
    dashboardSummary: {
      todayDate: todayStr,
      todaySales,
      todayOrders,
      todayMoneyReceived,
      todayPending,
      todayGrossProfit,
      allTimeGrossProfit,
      totalInventoryValue,
      lowStockCount,
      outOfStockCount,
      totalPendingPayments,
      totalInvoices: invoices.length,
      totalProducts: products.length,
      totalCustomers: customers.length
    }
  };
}

module.exports = {
  getWorkspaceSnapshot
};
