const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    console.log(`[MUNNEM DB] Connecting to MySQL at ${env.DB_HOST}:${env.DB_PORT}...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${env.DB_NAME}\`;`);

    const statements = sql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !/^CREATE DATABASE/i.test(s) && !/^USE /i.test(s));

    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`[MUNNEM DB] Database "${env.DB_NAME}" and all 18 tables initialized successfully.`);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[MUNNEM DB] Initialization failed:', err.message);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
