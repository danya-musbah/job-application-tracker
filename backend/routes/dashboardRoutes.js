const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/overview', dashboardController.overview);
router.get('/stats', dashboardController.stats);
router.get('/analytics', dashboardController.analytics);

module.exports = router;
