const { withTransaction, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { roundMoney } = require('../middleware/validate');

/**
 * Create a new Purchase Order for a supplier.
 */
async function createPurchaseOrder(businessId, userId, payload) {
  const supplierId = Number(payload.supplierId);
  const orderDate = String(payload.orderDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const note = String(payload.note || '').trim().slice(0, 255);
  const lines = Array.isArray(payload.lines) ? payload.lines : [];

  if (!supplierId) {
    throw new AppError('Please select a supplier.', 400);
  }
  if (!lines.length) {
    throw new AppError('Add at least one product line to the purchase order.', 400);
  }

  return withTransaction(async (conn) => {
    const [bizRows] = await conn.execute(
      'SELECT next_po_number FROM businesses WHERE id = ? FOR UPDATE',
      [businessId]
    );
    if (!bizRows.length) {
      throw new AppError('Business not found.', 404);
    }

    const [supRows] = await conn.execute(
      'SELECT id, name FROM suppliers WHERE id = ? AND business_id = ? LIMIT 1',
      [supplierId, businessId]
    );
    if (!supRows.length) {
      throw new AppError('Supplier not found in your business.', 404);
    }
    const supplier = supRows[0];

    const poSeq = Number(bizRows[0].next_po_number) || 1;
    const poNumber = `PO-${String(poSeq).padStart(4, '0')}`;

    const resolvedLines = [];
    let totalAmount = 0;

    for (const line of lines) {
      const qty = Number(line.qty ?? line.quantity);
      const unitCost = roundMoney(line.cost ?? line.unitCost);
      if (!Number.isInteger(qty) || qty < 1 || unitCost < 0) {
        throw new AppError('Each PO line requires a positive integer quantity and valid unit cost.', 400);
      }

      let productId = line.productId ? Number(line.productId) : null;
      let sku = String(line.sku || '').trim();
      let productName = String(line.name || line.productName || '').trim();

      if (productId) {
        const [pRows] = await conn.execute(
          'SELECT id, sku, name FROM products WHERE id = ? AND business_id = ? LIMIT 1',
          [productId, businessId]
        );
        if (pRows.length) {
          productId = pRows[0].id;
          sku = pRows[0].sku;
          productName = pRows[0].name;
        }
      } else if (sku) {
        const [pRows] = await conn.execute(
          'SELECT id, sku, name FROM products WHERE sku = ? AND business_id = ? LIMIT 1',
          [sku, businessId]
        );
        if (pRows.length) {
          productId = pRows[0].id;
          sku = pRows[0].sku;
          productName = pRows[0].name;
        }
      }

      if (!productName) {
        throw new AppError('Product name is required for each purchase order line.', 400);
      }

      const lineTotal = roundMoney(qty * unitCost);
      totalAmount = roundMoney(totalAmount + lineTotal);
      resolvedLines.push({ productId, sku: sku || 'SKU', productName, qty, unitCost, lineTotal });
    }

    const [poRes] = await conn.execute(
      `INSERT INTO purchase_orders (
        business_id, po_number, supplier_id, supplier_name, order_date,
        status, total_amount, paid_amount, note, created_by
      ) VALUES (?, ?, ?, ?, ?, 'Draft', ?, 0, ?, ?)`,
      [businessId, poNumber, supplier.id, supplier.name, orderDate, totalAmount, note, userId]
    );

    const poId = poRes.insertId;
    for (const l of resolvedLines) {
      await conn.execute(
        `INSERT INTO purchase_order_items (
          business_id, purchase_order_id, product_id, sku, product_name, quantity, unit_cost, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [businessId, poId, l.productId, l.sku, l.productName, l.qty, l.unitCost, l.lineTotal]
      );
    }

    await conn.execute(
      'UPDATE businesses SET next_po_number = ? WHERE id = ?',
      [poSeq + 1, businessId]
    );

    await logAudit(conn, businessId, userId, 'Purchase order created', `${poNumber} · ${supplier.name}`);
    return { id: poId, poNumber, totalAmount };
  });
}

/**
 * Transition a Purchase Order status (order, recv, cancel).
 * Receiving a PO atomically increments product stock and records stock movements.
 */
async function updatePurchaseOrderStatus(businessId, userId, poId, action) {
  return withTransaction(async (conn) => {
    const [poRows] = await conn.execute(
      'SELECT * FROM purchase_orders WHERE id = ? AND business_id = ? FOR UPDATE',
      [poId, businessId]
    );
    if (!poRows.length) {
      throw new AppError('Purchase order not found.', 404);
    }
    const po = poRows[0];

    if (po.status === 'Received' || po.status === 'Cancelled') {
      throw new AppError(`Purchase order ${po.po_number} is already ${po.status}.`, 400);
    }

    if (action === 'order') {
      await conn.execute(
        "UPDATE purchase_orders SET status = 'Ordered' WHERE id = ? AND business_id = ?",
        [po.id, businessId]
      );
      await logAudit(conn, businessId, userId, 'Purchase order marked ordered', po.po_number);
      return { id: po.id, poNumber: po.po_number, status: 'Ordered' };
    }

    if (action === 'cancel') {
      await conn.execute(
        "UPDATE purchase_orders SET status = 'Cancelled' WHERE id = ? AND business_id = ?",
        [po.id, businessId]
      );
      await logAudit(conn, businessId, userId, 'Purchase order cancelled', po.po_number);
      return { id: po.id, poNumber: po.po_number, status: 'Cancelled' };
    }

    if (action === 'recv') {
      const [items] = await conn.execute(
        'SELECT * FROM purchase_order_items WHERE purchase_order_id = ? AND business_id = ?',
        [po.id, businessId]
      );

      let skipped = 0;
      for (const item of items) {
        let prod = null;
        if (item.product_id) {
          const [pRows] = await conn.execute(
            'SELECT * FROM products WHERE id = ? AND business_id = ? FOR UPDATE',
            [item.product_id, businessId]
          );
          prod = pRows[0] || null;
        }
        if (!prod && item.sku) {
          const [pRows] = await conn.execute(
            'SELECT * FROM products WHERE sku = ? AND business_id = ? FOR UPDATE',
            [item.sku, businessId]
          );
          prod = pRows[0] || null;
        }

        if (!prod) {
          skipped++;
          continue;
        }

        const newStock = Number(prod.stock_quantity) + Number(item.quantity);
        await conn.execute(
          'UPDATE products SET stock_quantity = ?, purchase_price = ? WHERE id = ? AND business_id = ?',
          [newStock, Number(item.unit_cost) > 0 ? item.unit_cost : prod.purchase_price, prod.id, businessId]
        );
        await conn.execute(
          `INSERT INTO stock_movements (
            business_id, product_id, product_name, sku, movement_type,
            quantity_change, balance_after, reference, created_by
          ) VALUES (?, ?, ?, ?, 'Stock In', ?, ?, ?, ?)`,
          [businessId, prod.id, prod.name, prod.sku, Number(item.quantity), newStock, po.po_number, userId]
        );
      }

      const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await conn.execute(
        "UPDATE purchase_orders SET status = 'Received', received_at = ? WHERE id = ? AND business_id = ?",
        [nowIso, po.id, businessId]
      );
      await logAudit(conn, businessId, userId, 'Purchase order received', po.po_number);
      return { id: po.id, poNumber: po.po_number, status: 'Received', skipped };
    }

    throw new AppError('Invalid purchase order action.', 400);
  });
}

/**
 * Record a supplier payment against a received Purchase Order.
 */
async function payPurchaseOrder(businessId, userId, poId, payload) {
  const amount = roundMoney(payload.amount);
  const bankAccountId = payload.bankAccountId ? Number(payload.bankAccountId) : null;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Enter a valid payment amount greater than 0.', 400);
  }

  return withTransaction(async (conn) => {
    const [poRows] = await conn.execute(
      'SELECT * FROM purchase_orders WHERE id = ? AND business_id = ? FOR UPDATE',
      [poId, businessId]
    );
    if (!poRows.length) {
      throw new AppError('Purchase order not found.', 404);
    }
    const po = poRows[0];
    const balance = roundMoney(Number(po.total_amount) - Number(po.paid_amount));
    if (amount > balance + 0.01) {
      throw new AppError('Payment amount cannot exceed the purchase order balance.', 400);
    }

    const newPaid = roundMoney(Number(po.paid_amount) + Math.min(amount, balance));
    await conn.execute(
      'UPDATE purchase_orders SET paid_amount = ? WHERE id = ? AND business_id = ?',
      [newPaid, po.id, businessId]
    );

    if (bankAccountId) {
      const today = new Date().toISOString().slice(0, 10);
      await conn.execute(
        `INSERT INTO bank_transactions (business_id, account_id, tx_type, amount, tx_date, note)
         VALUES (?, ?, 'Withdrawal', ?, ?, ?)`,
        [businessId, bankAccountId, amount, today, `Supplier payment ${po.po_number}`]
      );
    }

    await logAudit(conn, businessId, userId, 'Supplier payment', `${po.po_number} · ${amount.toFixed(2)}`);
    return { id: po.id, poNumber: po.po_number, paidAmount: newPaid };
  });
}

module.exports = {
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  payPurchaseOrder
};
