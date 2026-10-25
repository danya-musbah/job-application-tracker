const express = require('express');
const followupController = require('../controllers/followupController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  createFollowupValidators, updateFollowupValidators, idParamValidator,
} = require('../validators/followupValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/', followupController.list);
router.post('/', createFollowupValidators, validateRequest, followupController.create);
router.put('/:id', updateFollowupValidators, validateRequest, followupController.update);
router.delete('/:id', idParamValidator, validateRequest, followupController.remove);

module.exports = router;
