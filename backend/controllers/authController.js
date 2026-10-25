const authService = require('../services/authService');
const env = require('../config/env');

function setAuthCookie(res, token) {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: env.COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const user = await authService.registerUser({ name, email, password });
    const token = authService.issueToken(user.id);
    setAuthCookie(res, token);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.authenticateUser({ email, password });
    const token = authService.issueToken(user.id);
    setAuthCookie(res, token);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' });
  res.json({ success: true });
}

function me(req, res) {
  res.json({ user: req.user });
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me, changePassword };
