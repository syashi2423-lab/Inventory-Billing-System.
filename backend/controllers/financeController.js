const { pool, withTransaction, logAudit } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const {
  requireNonEmptyString,
  optionalString,
  requirePositiveNumber,
  roundMoney
} = require('../middleware/validate');
const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.createBankAccount = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const name = requireNonEmptyString(req.body?.name, 'Account name', 100);
    const accountType = ['Bank', 'Cash', 'Wallet'].includes(req.body?.type) ? req.body.type : 'Bank';
    const openingBalance = Number(req.body?.openingBalance);
    if (!Number.isFinite(openingBalance)) {
      throw new AppError('Enter a valid opening balance (0 if none).', 400);
    }

    await pool.execute(
      'INSERT INTO bank_accounts (business_id, name, account_type, opening_balance) VALUES (?, ?, ?, ?)',
      [businessId, name, accountType, roundMoney(openingBalance)]
    );

    await logAudit(pool, businessId, req.user.id, 'Bank account added', name);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({ success: true, message: 'Account added.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.deleteBankAccount = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const accountId = Number(req.params.id);

    const [txRows] = await pool.execute(
      'SELECT id FROM bank_transactions WHERE business_id = ? AND account_id = ? LIMIT 1',
      [businessId, accountId]
    );
    if (txRows.length) {
      throw new AppError('This account has transactions and cannot be deleted.', 400);
    }

    await pool.execute('DELETE FROM bank_accounts WHERE id = ? AND business_id = ?', [accountId, businessId]);
    await logAudit(pool, businessId, req.user.id, 'Bank account deleted', `ID ${accountId}`);
    const workspace = await getWorkspaceSnapshot(businessId);
    res.json({ success: true, message: 'Account deleted.', workspace });
  } catch (err) {
    next(err);
  }
};

exports.createBankTransaction = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const accountId = Number(req.body?.accountId);
    const txType = String(req.body?.type || 'Deposit');
    const amount = requirePositiveNumber(req.body?.amount, 'Amount');
    const txDate = String(req.body?.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const note = optionalString(req.body?.note, 255);

    if (!accountId) {
      throw new AppError('Choose an account.', 400);
    }

    await withTransaction(async (conn) => {
      if (txType === 'Transfer') {
        const toAccountId = Number(req.body?.toAccountId);
        if (!toAccountId || toAccountId === accountId) {
          throw new AppError('Choose two different accounts for a transfer.', 400);
        }
        await conn.execute(
          `INSERT INTO bank_transactions (business_id, account_id, tx_type, amount, tx_date, note)
           VALUES (?, ?, 'Transfer out', ?, ?, ?)`,
          [businessId, accountId, amount, txDate, note]
        );
        await conn.execute(
          `INSERT INTO bank_transactions (business_id, account_id, tx_type, amount, tx_date, note)
           VALUES (?, ?, 'Transfer in', ?, ?, ?)`,
          [businessId, toAccountId, amount, txDate, note]
        );
      } else if (['Deposit', 'Withdrawal'].includes(txType)) {
        await conn.execute(
          `INSERT INTO bank_transactions (business_id, account_id, tx_type, amount, tx_date, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [businessId, accountId, txType, amount, txDate, note]
        );
      } else {
        throw new AppError('Invalid transaction type.', 400);
      }

      await logAudit(conn, businessId, req.user.id, 'Bank transaction', `${txType} · ${amount.toFixed(2)}`);
    });

    const workspace = await getWorkspaceSnapshot(businessId);
    res.status(201).json({ success: true, message: 'Transaction saved.', workspace });
  } catch (err) {
    next(err);
  }
};
