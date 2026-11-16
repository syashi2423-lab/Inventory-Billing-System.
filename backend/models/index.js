const { pool } = require('../config/db');

/**
 * Shared multi-tenant model queries scoped strictly by business_id.
 */
const Models = {
  async getBusinessById(businessId, executor = pool) {
    const [rows] = await executor.execute(
      'SELECT * FROM businesses WHERE id = ? LIMIT 1',
      [businessId]
    );
    return rows[0] || null;
  },

  async getTaxRatesByBusiness(businessId, executor = pool) {
    const [rows] = await executor.execute(
      'SELECT id, name, rate FROM tax_rates WHERE business_id = ? ORDER BY rate ASC, id ASC',
      [businessId]
    );
    return rows;
  },

  async getProductsByBusiness(businessId, executor = pool) {
    const [rows] = await executor.execute(
      'SELECT * FROM products WHERE business_id = ? AND is_active = 1 ORDER BY name ASC, id ASC',
      [businessId]
    );
    return rows;
  },

  async getCustomersWithStats(businessId, executor = pool) {
    const [customers] = await executor.execute(
      'SELECT * FROM customers WHERE business_id = ? ORDER BY name ASC, id ASC',
      [businessId]
    );
    const [invoiceAgg] = await executor.execute(
      `SELECT customer_id,
              COUNT(*) AS orders_count,
              COALESCE(SUM(grand_total), 0) AS total_purchases,
              COALESCE(SUM(balance_due), 0) AS outstanding_balance
         FROM invoices
        WHERE business_id = ? AND customer_id IS NOT NULL
        GROUP BY customer_id`,
      [businessId]
    );
    const statsMap = new Map(invoiceAgg.map(r => [Number(r.customer_id), r]));
    return customers.map(c => {
      const st = statsMap.get(Number(c.id)) || { orders_count: 0, total_purchases: 0, outstanding_balance: 0 };
      return {
        ...c,
        orders_count: Number(st.orders_count || 0),
        total_purchases: Number(st.total_purchases || 0),
        outstanding_balance: Number(st.outstanding_balance || 0)
      };
    });
  }
};

module.exports = Models;
