const crypto = require('crypto');
const env = require('../config/env');

const CSRF_COOKIE_NAME = 'jat_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Issues a CSRF token cookie (readable by JS, NOT httpOnly) if one doesn't exist yet.
 * The frontend reads this cookie and sends it back as the X-CSRF-Token header on
 * state-changing requests. Combined with SameSite=Strict/Lax on the auth cookie,
 * this implements the double-submit-cookie CSRF defense.
 */
function issueCsrfToken(req, res, next) {
  if (!req.cookies || !req.cookies[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: env.COOKIE_MAX_AGE_MS,
      path: '/',
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies[CSRF_COOKIE_NAME];
  }
  next();
}

/**
 * Verifies the X-CSRF-Token header matches the csrf cookie for any
 * state-changing (non-safe) request. Only enforced when the client is
 * authenticating via cookie (not Authorization header, which is not
 * vulnerable to CSRF).
 */
function verifyCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Bearer-token clients (no cookie auth) are not subject to CSRF.
  const usingCookieAuth = req.cookies && req.cookies[env.SESSION_COOKIE_NAME];
  if (!usingCookieAuth) return next();

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }
  next();
}

module.exports = { issueCsrfToken, verifyCsrfToken, CSRF_COOKIE_NAME };
