const { pool, withTransaction, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { optionalString } = require('../middleware/validate');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.adjustStock = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const productId = Number(req.body?.productId);
    const rawType = String(req.body?.type || 'Stock In');
    const qty = Number(req.body?.quantity);
    const reason = optionalString(req.body?.reason || 'Manual adjustment', 150);

    if (!productId || !Number.isInteger(qty)) {
      throw new AppError('Choose a product and enter a whole-number quantity.', 400);
    }

    const type = rawType === 'Set exact quantity' ? 'Adjustment' : rawType;
    if (!['Stock In', 'Stock Out', 'Adjustment'].includes(type)) {
      throw new AppError('Invalid stock adjustment type.', 400);
    }
    if (type === 'Adjustment' ? qty < 0 : qty <= 0) {
      throw new AppError('Enter a valid quantity greater than 0.', 400);
    }

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT * FROM products WHERE id = ? AND business_id = ? FOR UPDATE',
        [productId, businessId]
      );
      if (!rows.length) {
        throw new AppError('Product not found in your business.', 404);
      }
      const prod = rows[0];
      const currentStock = Number(prod.stock_quantity);

      const delta = type === 'Stock In'
        ? qty
        : type === 'Stock Out'
          ? -qty
          : qty - currentStock;

      const newBalance = currentStock + delta;
      if (newBalance < 0) {
        throw new AppError(`Stock cannot become negative (current stock: ${currentStock}).`, 400);
      }

      await conn.execute(
        'UPDATE products SET stock_quantity = ? WHERE id = ? AND business_id = ?',
        [newBalance, productId, businessId]
      );

      await conn.execute(
        `INSERT INTO stock_movements (
          business_id, product_id, product_name, sku, movement_type,
          quantity_change, balance_after, reference, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [businessId, productId, prod.name, prod.sku, type, delta, newBalance, reason || type, req.user.id]
      );

      await logAudit(
        conn,
        businessId,
        req.user.id,
        'Stock adjusted',
        `${prod.name} · ${delta > 0 ? '+' : ''}${delta} · ${reason || type}`
      );
    });

    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Stock updated and movement recorded.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.listMovements = async (req, res, next) => {
  try {
    const [movements] = await pool.execute(
      'SELECT * FROM stock_movements WHERE business_id = ? ORDER BY created_at DESC, id DESC LIMIT 250',
      [req.user.businessId]
    );
    res.json({ success: true, movements });
  } catch (err) {
    next(err);
  }
};

exports.addToPurchaseList = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const productId = Number(req.body?.productId);

    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ? AND business_id = ? LIMIT 1',
      [productId, businessId]
    );
    if (!rows.length) {
      throw new AppError('Product not found.', 404);
    }
    const prod = rows[0];
    const reorderQty = Math.max(1, Number(prod.min_stock_level) * 3 - Number(prod.stock_quantity));

    const [existing] = await pool.execute(
      'SELECT * FROM purchase_list WHERE business_id = ? AND sku = ? LIMIT 1',
      [businessId, prod.sku]
    );

    if (existing.length) {
      const newQty = Number(existing[0].quantity) + reorderQty;
      await pool.execute(
        'UPDATE purchase_list SET quantity = ?, unit_cost = ? WHERE id = ? AND business_id = ?',
        [newQty, prod.purchase_price, existing[0].id, businessId]
      );
    } else {
      await pool.execute(
        `INSERT INTO purchase_list (business_id, product_id, sku, product_name, quantity, unit_cost)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [businessId, prod.id, prod.sku, prod.name, reorderQty, prod.purchase_price]
      );
    }

    await logAudit(pool, businessId, req.user.id, 'Added to purchase list', `${prod.name} · ${reorderQty} units`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: `${prod.name} added to purchase list.`, workspace });
  } catch (err) {
    next(err);
  }
};

exports.removeFromPurchaseList = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const sku = String(req.params.sku || '');
    await pool.execute('DELETE FROM purchase_list WHERE business_id = ? AND sku = ?', [businessId, sku]);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Purchase-list item removed.', workspace });
  } catch (err) {
    next(err);
  }
};
