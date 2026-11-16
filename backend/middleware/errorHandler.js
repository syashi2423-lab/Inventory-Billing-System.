class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : err.code === 'ER_DUP_ENTRY'
      ? 'A record with this unique identifier already exists.'
      : err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error('[MUNNEM API Error]:', err);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = {
  AppError,
  errorHandler
};
