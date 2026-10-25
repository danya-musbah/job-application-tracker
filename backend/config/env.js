const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined || (typeof val === 'string' && val.trim() === '')) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

const NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = {
  NODE_ENV,
  isProduction: NODE_ENV === 'production',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_PATH: process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'app.db'),
  JWT_SECRET: required('JWT_SECRET', NODE_ENV === 'production' ? undefined : 'dev-only-insecure-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'jat_token',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5500',
  COOKIE_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
};
