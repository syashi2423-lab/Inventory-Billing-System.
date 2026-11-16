const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: 'Z'
});

/**
 * Execute a callback inside a MySQL database transaction.
 * Automatically commits on success or rolls back on error.
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Record an audit log entry for a business workspace.
 */
async function logAudit(executor, businessId, userId, action, detail = '') {
  const db = executor || pool;
  await db.execute(
    'INSERT INTO audit_logs (business_id, user_id, action, detail) VALUES (?, ?, ?, ?)',
    [businessId, userId || null, String(action).slice(0, 120), String(detail || '').slice(0, 255)]
  );
}

module.exports = {
  pool,
  withTransaction,
  logAudit
};
