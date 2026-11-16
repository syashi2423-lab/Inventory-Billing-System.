const { withTransaction, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { roundMoney } = require('../middleware/validate');

/**
 * Create a new sales invoice with atomic stock deduction, GST calculation,
 * customer credit limit enforcement, and payment ledger recording.
 */
async function createInvoice(businessId, userId, payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    throw new AppError('Add at least one item to generate an invoice.', 400);
  }

  const supplyType = payload.supplyType === 'other' ? 'other' : 'same';
  const paymentMethod = ['Cash', 'UPI', 'Card', 'Credit', 'Bank transfer'].includes(payload.paymentMethod)
    ? payload.paymentMethod
    : 'Cash';
  const rawDiscount = Math.max(0, roundMoney(payload.discountAmount || 0));
  const notes = String(payload.notes || '').trim().slice(0, 255);

  return withTransaction(async (conn) => {
    // 1. Lock business row to generate a unique sequential invoice number
    const [bizRows] = await conn.execute(
      'SELECT id, invoice_prefix, next_invoice_number FROM businesses WHERE id = ? FOR UPDATE',
      [businessId]
    );
    if (!bizRows.length) {
      throw new AppError('Business workspace not found.', 404);
    }
    const biz = bizRows[0];
    const year = new Date().getFullYear();
    const prefix = String(biz.invoice_prefix || 'INV').replace(/[-/]+$/, '');
    const seq = Number(biz.next_invoice_number) || 1;
    const invoiceNumber = `${prefix}-${year}-${String(seq).padStart(5, '0')}`;

    // 2. Resolve customer (optional Walk-in Customer or saved customer)
    let customerId = payload.customerId ? Number(payload.customerId) : null;
    let customerName = 'Walk-in Customer';
    let customerCreditLimit = 0;

    if (customerId && customerId > 0) {
      const [custRows] = await conn.execute(
        'SELECT id, name, credit_limit FROM customers WHERE id = ? AND business_id = ? LIMIT 1',
        [customerId, businessId]
      );
      if (!custRows.length) {
        throw new AppError('Selected customer was not found in your business.', 404);
      }
      customerId = custRows[0].id;
      customerName = custRows[0].name;
      customerCreditLimit = Number(custRows[0].credit_limit || 0);
    } else {
      customerId = null;
      if (payload.customerName && String(payload.customerName).trim()) {
        customerName = String(payload.customerName).trim().slice(0, 120);
      }
    }

    // 3. Validate and lock each product or service item, preventing duplicates by merging quantities
    const mergedMap = new Map();
    for (const rawItem of items) {
      const itemType = rawItem.itemType === 'service' ? 'service' : 'product';
      const refId = Number(rawItem.productId || rawItem.serviceId || rawItem.id);
      const qty = Number(rawItem.quantity ?? rawItem.qty);
      if (!Number.isInteger(qty) || qty < 1) {
        throw new AppError('Each invoice item must have a whole-number quantity of at least 1.', 400);
      }
      const key = `${itemType}:${refId}`;
      if (mergedMap.has(key)) {
        mergedMap.get(key).quantity += qty;
      } else {
        mergedMap.set(key, { itemType, refId, quantity: qty });
      }
    }

    const resolvedLines = [];
    let subtotalCents = 0;

    for (const entry of mergedMap.values()) {
      if (entry.itemType === 'service') {
        const [srvRows] = await conn.execute(
          'SELECT * FROM services WHERE id = ? AND business_id = ? LIMIT 1',
          [entry.refId, businessId]
        );
        if (!srvRows.length) {
          throw new AppError('One or more services in the bill were not found.', 404);
        }
        const srv = srvRows[0];
        const unitPrice = roundMoney(srv.price);
        const lineSubCents = Math.round(unitPrice * 100) * entry.quantity;
        subtotalCents += lineSubCents;
        resolvedLines.push({
          itemType: 'service',
          productId: null,
          serviceId: srv.id,
          name: srv.name,
          sku: `SRV-${srv.id}`,
          category: 'Services',
          quantity: entry.quantity,
          purchasePrice: 0,
          unitPrice,
          gstRate: Number(srv.tax_rate || 0),
          lineSubCents,
          currentStock: null
        });
      } else {
        const [prodRows] = await conn.execute(
          'SELECT * FROM products WHERE id = ? AND business_id = ? AND is_active = 1 FOR UPDATE',
          [entry.refId, businessId]
        );
        if (!prodRows.length) {
          throw new AppError('One or more products in the bill were not found.', 404);
        }
        const prod = prodRows[0];
        if (Number(prod.stock_quantity) < entry.quantity) {
          throw new AppError(
            `Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, requested: ${entry.quantity}.`,
            400
          );
        }
        const unitPrice = roundMoney(prod.selling_price);
        const lineSubCents = Math.round(unitPrice * 100) * entry.quantity;
        subtotalCents += lineSubCents;
        resolvedLines.push({
          itemType: 'product',
          productId: prod.id,
          serviceId: null,
          name: prod.name,
          sku: prod.sku,
          category: prod.category,
          quantity: entry.quantity,
          purchasePrice: roundMoney(prod.purchase_price),
          unitPrice,
          gstRate: Number(prod.gst_rate || 0),
          lineSubCents,
          currentStock: Number(prod.stock_quantity)
        });
      }
    }

    const discountCents = Math.min(Math.round(rawDiscount * 100), subtotalCents);
    let totalTaxCents = 0;

    // 4. Compute line-level proportional discount, taxable value, and GST
    for (const line of resolvedLines) {
      const shareCents = subtotalCents > 0
        ? Math.round((discountCents * line.lineSubCents) / subtotalCents)
        : 0;
      const taxableCents = Math.max(0, line.lineSubCents - shareCents);
      const taxCents = Math.round((taxableCents * line.gstRate) / 100);
      totalTaxCents += taxCents;

      line.discountShare = roundMoney(shareCents / 100);
      line.taxableValue = roundMoney(taxableCents / 100);
      line.taxAmount = roundMoney(taxCents / 100);
      line.lineTotal = roundMoney((taxableCents + taxCents) / 100);
    }

    const taxableAmountCents = Math.max(0, subtotalCents - discountCents);
    const grandTotalCents = taxableAmountCents + totalTaxCents;

    const subtotal = roundMoney(subtotalCents / 100);
    const discountAmount = roundMoney(discountCents / 100);
    const taxableAmount = roundMoney(taxableAmountCents / 100);
    const totalTax = roundMoney(totalTaxCents / 100);
    const cgstAmount = supplyType === 'same' ? roundMoney(totalTax / 2) : 0;
    const sgstAmount = supplyType === 'same' ? roundMoney(totalTax - cgstAmount) : 0;
    const igstAmount = supplyType === 'other' ? totalTax : 0;
    const grandTotal = roundMoney(grandTotalCents / 100);

    // 5. Determine amount received & balance due
    let receivedInput;
    if (payload.amountReceived === undefined || payload.amountReceived === null || payload.amountReceived === '') {
      receivedInput = paymentMethod === 'Credit' ? 0 : grandTotal;
    } else {
      receivedInput = Number(payload.amountReceived);
    }
    if (!Number.isFinite(receivedInput) || receivedInput < 0) {
      throw new AppError('Amount received must be 0 or greater.', 400);
    }
    const paidCents = Math.min(grandTotalCents, Math.max(0, Math.round(receivedInput * 100)));
    const balanceCents = Math.max(0, grandTotalCents - paidCents);
    const paidAmount = roundMoney(paidCents / 100);
    const balanceDue = roundMoney(balanceCents / 100);

    const paymentStatus = balanceCents === 0
      ? 'Paid'
      : paidCents > 0
        ? 'Partial'
        : 'Unpaid';

    // 6. Check customer credit limit if there is an unpaid balance
    if (balanceDue > 0 && customerId && customerCreditLimit > 0) {
      const [dueRows] = await conn.execute(
        'SELECT COALESCE(SUM(balance_due), 0) AS current_due FROM invoices WHERE business_id = ? AND customer_id = ?',
        [businessId, customerId]
      );
      const currentDue = Number(dueRows[0]?.current_due || 0);
      const availableCredit = Math.max(0, roundMoney(customerCreditLimit - currentDue));
      if (balanceDue > availableCredit + 0.01) {
        throw new AppError(
          `This bill exceeds ${customerName}'s available credit limit (${availableCredit.toFixed(2)} remaining).`,
          400
        );
      }
    }

    const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 7. Insert invoice header
    const [invResult] = await conn.execute(
      `INSERT INTO invoices (
        business_id, invoice_number, customer_id, customer_name, supply_type,
        subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount,
        total_tax, grand_total, paid_amount, balance_due, payment_method, payment_status,
        notes, invoice_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        businessId, invoiceNumber, customerId, customerName, supplyType,
        subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount,
        totalTax, grandTotal, paidAmount, balanceDue, paymentMethod, paymentStatus,
        notes, nowIso, userId
      ]
    );
    const invoiceId = invResult.insertId;

    // 8. Insert invoice line items, deduct product stock, and log stock movements
    for (const line of resolvedLines) {
      await conn.execute(
        `INSERT INTO invoice_items (
          business_id, invoice_id, product_id, service_id, item_type,
          product_name, sku, category, quantity, purchase_price, unit_price,
          gst_rate, discount_share, taxable_value, tax_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessId, invoiceId, line.productId, line.serviceId, line.itemType,
          line.name, line.sku, line.category, line.quantity, line.purchasePrice, line.unitPrice,
          line.gstRate, line.discountShare, line.taxableValue, line.taxAmount, line.lineTotal
        ]
      );

      if (line.itemType === 'product' && line.productId) {
        const newStock = line.currentStock - line.quantity;
        await conn.execute(
          'UPDATE products SET stock_quantity = ? WHERE id = ? AND business_id = ?',
          [newStock, line.productId, businessId]
        );
        await conn.execute(
          `INSERT INTO stock_movements (
            business_id, product_id, product_name, sku, movement_type,
            quantity_change, balance_after, reference, created_by
          ) VALUES (?, ?, ?, ?, 'Sale', ?, ?, ?, ?)`,
          [
            businessId, line.productId, line.name, line.sku,
            -line.quantity, newStock, invoiceNumber, userId
          ]
        );
      }
    }

    // 9. Record initial payment in payments ledger if paidAmount > 0
    if (paidAmount > 0) {
      const paymentCode = `PAY-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
      await conn.execute(
        `INSERT INTO payments (
          business_id, payment_code, invoice_id, invoice_number,
          customer_id, customer_name, amount, payment_method, reference, payment_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Initial POS payment', ?, ?)`,
        [
          businessId, paymentCode, invoiceId, invoiceNumber,
          customerId, customerName, paidAmount, paymentMethod, nowIso, userId
        ]
      );
    }

    // 10. Increment next_invoice_number on business
    await conn.execute(
      'UPDATE businesses SET next_invoice_number = ? WHERE id = ?',
      [seq + 1, businessId]
    );

    await logAudit(
      conn,
      businessId,
      userId,
      'Invoice created',
      `${invoiceNumber} · ${customerName} · ${grandTotal.toFixed(2)}`
    );

    return {
      id: invoiceId,
      invoiceNumber,
      customerId,
      customerName,
      supplyType,
      subtotal,
      discountAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      grandTotal,
      paidAmount,
      balanceDue,
      paymentMethod,
      paymentStatus,
      invoiceDate: nowIso,
      items: resolvedLines
    };
  });
}

/**
 * Record a customer payment against an existing invoice inside a transaction.
 */
async function recordInvoicePayment(businessId, userId, payload) {
  const invoiceId = Number(payload.invoiceId);
  const amount = roundMoney(payload.amount);
  const paymentMethod = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Credit'].includes(payload.paymentMethod)
    ? payload.paymentMethod
    : 'Cash';
  const reference = String(payload.reference || '').trim().slice(0, 150);

  if (!invoiceId || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Select a valid invoice and enter a payment amount greater than 0.', 400);
  }

  return withTransaction(async (conn) => {
    const [invRows] = await conn.execute(
      'SELECT * FROM invoices WHERE id = ? AND business_id = ? FOR UPDATE',
      [invoiceId, businessId]
    );
    if (!invRows.length) {
      throw new AppError('Invoice not found in your business.', 404);
    }

    const invoice = invRows[0];
    const currentDue = roundMoney(Number(invoice.grand_total) - Number(invoice.paid_amount));
    if (currentDue <= 0) {
      throw new AppError('This invoice is already fully paid.', 400);
    }
    if (amount > currentDue + 0.01) {
      throw new AppError(`Payment amount (${amount.toFixed(2)}) cannot exceed the invoice balance (${currentDue.toFixed(2)}).`, 400);
    }

    const appliedAmount = Math.min(amount, currentDue);
    const newPaid = roundMoney(Number(invoice.paid_amount) + appliedAmount);
    const newBalance = Math.max(0, roundMoney(Number(invoice.grand_total) - newPaid));
    const newStatus = newBalance <= 0.005 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

    const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const paymentCode = `PAY-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

    const [payRes] = await conn.execute(
      `INSERT INTO payments (
        business_id, payment_code, invoice_id, invoice_number,
        customer_id, customer_name, amount, payment_method, reference, payment_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        businessId, paymentCode, invoice.id, invoice.invoice_number,
        invoice.customer_id, invoice.customer_name, appliedAmount, paymentMethod, reference, nowIso, userId
      ]
    );

    await conn.execute(
      'UPDATE invoices SET paid_amount = ?, balance_due = ?, payment_status = ? WHERE id = ? AND business_id = ?',
      [newPaid, newBalance, newStatus, invoice.id, businessId]
    );

    await logAudit(
      conn,
      businessId,
      userId,
      'Payment received',
      `${invoice.invoice_number} · ${appliedAmount.toFixed(2)} · ${paymentMethod}`
    );

    return {
      paymentId: payRes.insertId,
      paymentCode,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: appliedAmount,
      paidAmount: newPaid,
      balanceDue: newBalance,
      paymentStatus: newStatus
    };
  });
}

module.exports = {
  createInvoice,
  recordInvoicePayment
};
