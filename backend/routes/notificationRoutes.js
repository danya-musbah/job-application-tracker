const express = require('express');
const { param } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();
router.use(requireAuth);

router.get('/', notificationController.list);
router.patch(
  '/:id/read',
  [param('id').isInt({ min: 1 }).withMessage('Invalid id.')],
  validateRequest,
  notificationController.markRead
);
router.patch('/read-all', notificationController.markAllRead);

module.exports = router;
