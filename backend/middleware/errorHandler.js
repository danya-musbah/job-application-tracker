const env = require('../config/env');

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Resource not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Never leak stack traces, SQL errors, or internal details to the client.
  const safeMessage = statusCode < 500
    ? err.message
    : 'An unexpected error occurred. Please try again.';

  if (!env.isProduction && statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const payload = { error: safeMessage };
  if (err.details) payload.details = err.details;
  res.status(statusCode).json(payload);
}

module.exports = { ApiError, notFoundHandler, errorHandler };
