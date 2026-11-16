const { pool, withTransaction, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const {
  requireNonEmptyString,
  optionalString,
  requireNonNegativeNumber,
  requireNonNegativeInt
} = require('../middleware/validate');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.listProducts = async (req, res, next) => {
  try {
    const [products] = await pool.execute(
      'SELECT * FROM products WHERE business_id = ? AND is_active = 1 ORDER BY name ASC, id ASC',
      [req.user.businessId]
    );
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const body = req.body || {};

    const name = requireNonEmptyString(body.name, 'Product name', 150);
    const category = optionalString(body.category || 'Groceries', 80) || 'Groceries';
    const purchasePrice = requireNonNegativeNumber(body.purchasePrice, 'Purchase price');
    const sellingPrice = requireNonNegativeNumber(body.sellingPrice, 'Selling price');
    const openingStock = requireNonNegativeInt(body.openingStock ?? body.stock ?? 0, 'Opening stock');
    const minStockLevel = body.minStockLevel !== undefined
      ? requireNonNegativeInt(body.minStockLevel, 'Minimum stock level')
      : 10;
    const gstRate = requireNonNegativeNumber(body.gstRate ?? 0, 'GST rate');
    const hsnCode = optionalString(body.hsnCode || '', 30);

    if (sellingPrice < purchasePrice) {
      throw new AppError('Selling price cannot be lower than purchase price.', 400);
    }

    await withTransaction(async (conn) => {
      let sku = optionalString(body.sku, 60);
      if (!sku) {
        const prefix = category.slice(0, 3).toUpperCase();
        sku = `${prefix}-${Date.now().toString().slice(-5)}`;
      }

      const [dup] = await conn.execute(
        'SELECT id FROM products WHERE business_id = ? AND sku = ? LIMIT 1',
        [businessId, sku]
      );
      if (dup.length) {
        throw new AppError(`A product with SKU "${sku}" already exists in your catalogue.`, 409);
      }

      const [resProd] = await conn.execute(
        `INSERT INTO products (
          business_id, name, sku, category, hsn_code, purchase_price,
          selling_price, stock_quantity, min_stock_level, gst_rate, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [businessId, name, sku, category, hsnCode, purchasePrice, sellingPrice, openingStock, minStockLevel, gstRate]
      );

      const productId = resProd.insertId;

      if (openingStock > 0) {
        await conn.execute(
          `INSERT INTO stock_movements (
            business_id, product_id, product_name, sku, movement_type,
            quantity_change, balance_after, reference, created_by
          ) VALUES (?, ?, ?, ?, 'Opening Stock', ?, ?, 'Initial opening stock', ?)`,
          [businessId, productId, name, sku, openingStock, openingStock, req.user.id]
        );
      }

      await logAudit(conn, businessId, req.user.id, 'Product added', `${name} (${sku}) · Stock ${openingStock}`);
    });

    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({ success: true, message: 'Product added successfully.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const productId = Number(req.params.id);
    const body = req.body || {};

    const name = requireNonEmptyString(body.name, 'Product name', 150);
    const category = optionalString(body.category || 'Groceries', 80) || 'Groceries';
    const purchasePrice = requireNonNegativeNumber(body.purchasePrice, 'Purchase price');
    const sellingPrice = requireNonNegativeNumber(body.sellingPrice, 'Selling price');
    const stockQuantity = requireNonNegativeInt(body.openingStock ?? body.stock ?? 0, 'Stock quantity');
    const minStockLevel = body.minStockLevel !== undefined
      ? requireNonNegativeInt(body.minStockLevel, 'Minimum stock level')
      : 10;
    const gstRate = requireNonNegativeNumber(body.gstRate ?? 0, 'GST rate');
    const hsnCode = optionalString(body.hsnCode || '', 30);

    if (sellingPrice < purchasePrice) {
      throw new AppError('Selling price cannot be lower than purchase price.', 400);
    }

    await withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT * FROM products WHERE id = ? AND business_id = ? FOR UPDATE',
        [productId, businessId]
      );
      if (!rows.length) {
        throw new AppError('Product not found in your business.', 404);
      }
      const existing = rows[0];
      const sku = optionalString(body.sku, 60) || existing.sku;

      const [dup] = await conn.execute(
        'SELECT id FROM products WHERE business_id = ? AND sku = ? AND id != ? LIMIT 1',
        [businessId, sku, productId]
      );
      if (dup.length) {
        throw new AppError(`Another product already uses SKU "${sku}".`, 409);
      }

      const oldStock = Number(existing.stock_quantity);
      const stockDiff = stockQuantity - oldStock;

      await conn.execute(
        `UPDATE products
            SET name = ?, sku = ?, category = ?, hsn_code = ?,
                purchase_price = ?, selling_price = ?, stock_quantity = ?,
                min_stock_level = ?, gst_rate = ?
          WHERE id = ? AND business_id = ?`,
        [name, sku, category, hsnCode, purchasePrice, sellingPrice, stockQuantity, minStockLevel, gstRate, productId, businessId]
      );

      if (stockDiff !== 0) {
        await conn.execute(
          `INSERT INTO stock_movements (
            business_id, product_id, product_name, sku, movement_type,
            quantity_change, balance_after, reference, created_by
          ) VALUES (?, ?, ?, ?, 'Adjustment', ?, ?, 'Product edit stock update', ?)`,
          [businessId, productId, name, sku, stockDiff, stockQuantity, req.user.id]
        );
      }

      await logAudit(conn, businessId, req.user.id, 'Product updated', `${name} (${sku})`);
    });

    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Product updated successfully.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const productId = Number(req.params.id);

    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ? AND business_id = ? LIMIT 1',
      [productId, businessId]
    );
    if (!rows.length) {
      throw new AppError('Product not found in your business.', 404);
    }
    const prod = rows[0];

    if (Number(prod.stock_quantity) > 0) {
      throw new AppError('Adjust stock to zero before deleting this product.', 400);
    }

    const [usedRows] = await pool.execute(
      'SELECT id FROM invoice_items WHERE business_id = ? AND product_id = ? LIMIT 1',
      [businessId, productId]
    );
    if (usedRows.length) {
      throw new AppError('This product is used in an invoice and must be retained for history.', 400);
    }

    await pool.execute('DELETE FROM products WHERE id = ? AND business_id = ?', [productId, businessId]);
    await logAudit(pool, businessId, req.user.id, 'Product deleted', prod.name);

    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Product deleted.', workspace });
  } catch (err) {
    next(err);
  }
};
