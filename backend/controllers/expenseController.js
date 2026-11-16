const { pool, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { requireNonEmptyString, optionalString, requirePositiveNumber } = require('../middleware/validate');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.listExpenses = async (req, res, next) => {
  try {
    const [expenses] = await pool.execute(
      'SELECT * FROM expenses WHERE business_id = ? ORDER BY expense_date DESC, id DESC',
      [req.user.businessId]
    );
    res.json({ success: true, expenses });
  } catch (err) {
    next(err);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const body = req.body || {};

    const title = requireNonEmptyString(body.title, 'Expense title', 150);
    const amount = requirePositiveNumber(body.amount, 'Expense amount');
    const category = optionalString(body.category || 'Other', 60) || 'Other';
    const date = String(body.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const notes = optionalString(body.notes, 255);
    const expenseCode = `EXP-${Date.now()}`;

    await pool.execute(
      `INSERT INTO expenses (business_id, expense_code, title, category, amount, expense_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [businessId, expenseCode, title, category, amount, date, notes, req.user.id]
    );

    await logAudit(pool, businessId, req.user.id, 'Expense recorded', `${title} · ${amount.toFixed(2)}`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({ success: true, message: 'Expense saved.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const expenseId = Number(req.params.id);

    const [rows] = await pool.execute(
      'SELECT * FROM expenses WHERE id = ? AND business_id = ? LIMIT 1',
      [expenseId, businessId]
    );
    if (!rows.length) {
      throw new AppError('Expense not found.', 404);
    }

    await pool.execute('DELETE FROM expenses WHERE id = ? AND business_id = ?', [expenseId, businessId]);
    await logAudit(pool, businessId, req.user.id, 'Expense deleted', rows[0].title);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Expense removed.', workspace });
  } catch (err) {
    next(err);
  }
};
