const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../config/db');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');
const { seedDefaultJobSources } = require('./jobSourceService');

const SALT_ROUNDS = 12;

async function registerUser({ name, email, password }) {
  const existing = get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { lastInsertRowid } = run(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );

  seedDefaultJobSources(lastInsertRowid);

  return get('SELECT id, name, email FROM users WHERE id = ?', [lastInsertRowid]);
}

async function authenticateUser({ email, password }) {
  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  return { id: user.id, name: user.name, email: user.email };
}

function issueToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) throw new ApiError(404, 'User not found.');

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) throw new ApiError(401, 'Current password is incorrect.');

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  run('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?', [newHash, userId]);
}

module.exports = { registerUser, authenticateUser, issueToken, changePassword };
