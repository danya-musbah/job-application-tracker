const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidators, loginValidators, changePasswordValidators,
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register', authLimiter, registerValidators, validateRequest, authController.register);
router.post('/login', authLimiter, loginValidators, validateRequest, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.post(
  '/change-password',
  requireAuth,
  authLimiter,
  changePasswordValidators,
  validateRequest,
  authController.changePassword
);

module.exports = router;
