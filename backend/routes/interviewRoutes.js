const express = require('express');
const interviewController = require('../controllers/interviewController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  createInterviewValidators, updateInterviewValidators, idParamValidator,
} = require('../validators/interviewValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/', interviewController.list);
router.post('/', createInterviewValidators, validateRequest, interviewController.create);
router.put('/:id', updateInterviewValidators, validateRequest, interviewController.update);
router.delete('/:id', idParamValidator, validateRequest, interviewController.remove);

module.exports = router;
