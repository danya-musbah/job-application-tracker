const { body } = require('express-validator');

const registerValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must be under 100 characters.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('A valid email is required.')
    .isLength({ max: 200 }).withMessage('Email must be under 200 characters.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain a number.'),
];

const loginValidators = [
  body('email').trim().notEmpty().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('New password must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('New password must contain a number.'),
];

module.exports = { registerValidators, loginValidators, changePasswordValidators };
