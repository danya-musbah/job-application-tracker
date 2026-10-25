const express = require('express');
const { body } = require('express-validator');
const settingsController = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const { STATUSES } = require('../validators/applicationValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/profile', settingsController.getProfile);
router.put(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('email').optional().trim().isEmail().normalizeEmail(),
  ],
  validateRequest,
  settingsController.updateProfile
);

router.put(
  '/preferences',
  [
    body('defaultStatus').optional().isIn(STATUSES).withMessage('Invalid default status.'),
    body('defaultCurrency').optional().matches(/^[A-Za-z]{3}$/).withMessage('Currency must be a 3-letter code.'),
    body('itemsPerPage').optional().isInt({ min: 5, max: 100 }),
    body('reminderDays').optional().isInt({ min: 1, max: 90 }),
    body('theme').optional().isIn(['light', 'dark', 'system']),
  ],
  validateRequest,
  settingsController.updatePreferences
);

router.get('/job-sources', settingsController.listJobSources);
router.post(
  '/job-sources',
  [body('name').isString().withMessage('Source name must be text.').bail().trim().notEmpty().withMessage('Source name is required.').isLength({ max: 100 }).withMessage('Source name must be at most 100 characters.')],
  validateRequest,
  settingsController.addJobSource
);
router.get('/tags', settingsController.listTags);

module.exports = router;
