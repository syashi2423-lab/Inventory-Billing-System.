const { AppError } = require('./errorHandler');

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function requireNonEmptyString(value, fieldName, maxLength = 255) {
  const str = String(value ?? '').trim();
  if (!str) {
    throw new AppError(`${fieldName} is required.`, 400);
  }
  return str.slice(0, maxLength);
}

function optionalString(value, maxLength = 255) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function requireNonNegativeNumber(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new AppError(`${fieldName} must be a valid number greater than or equal to 0.`, 400);
  }
  return roundMoney(num);
}

function requirePositiveNumber(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(`${fieldName} must be greater than 0.`, 400);
  }
  return roundMoney(num);
}

function requireNonNegativeInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new AppError(`${fieldName} must be a whole number (0 or greater).`, 400);
  }
  return num;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function isValidGstin(gstin) {
  const g = String(gstin || '').trim().toUpperCase();
  if (!g) return true;
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g);
}

module.exports = {
  roundMoney,
  requireNonEmptyString,
  optionalString,
  requireNonNegativeNumber,
  requirePositiveNumber,
  requireNonNegativeInt,
  isValidEmail,
  isValidGstin
};
