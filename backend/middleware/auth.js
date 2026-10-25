const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { get } = require('../config/db');

/**
 * Requires a valid auth token (from httpOnly cookie or Authorization header).
 * Attaches req.user = { id, name, email } on success.
 */
function requireAuth(req, res, next) {
  try {
    const cookieToken = req.cookies ? req.cookies[env.SESSION_COOKIE_NAME] : null;
    const header = req.headers.authorization;
    const headerToken = header && header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }

    const user = get('SELECT id, name, email FROM users WHERE id = ?', [payload.sub]);
    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
