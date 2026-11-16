const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { initializeDatabase } = require('./database/initDb');

const app = express();

// Middleware
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount REST APIs under /api
app.use('/api', apiRoutes);

// Serve static frontend files from /frontend
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// Fallback to frontend/index.html for SPA navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `API endpoint not found: ${req.method} ${req.path}` });
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(env.PORT, () => {
      console.log(`============================================================`);
      console.log(`  MUNNEM — Smart Retail ERP Full-Stack Server`);
      console.log(`  URL: http://localhost:${env.PORT}`);
      console.log(`  Database: MySQL (${env.DB_NAME} @ ${env.DB_HOST}:${env.DB_PORT})`);
      console.log(`============================================================`);
    });
  } catch (err) {
    console.error('[MUNNEM Server] Failed to initialize database or start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
