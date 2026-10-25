const express = require('express');
const applicationController = require('../controllers/applicationController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  createApplicationValidators, updateApplicationValidators,
  idParamValidator, statusUpdateValidators, listApplicationsValidators,
  importPreviewValidators, importCommitValidators,
} = require('../validators/applicationValidators');

const router = express.Router();
router.use(requireAuth);

router.get('/export/csv', applicationController.exportCsv);
router.get('/export/json', applicationController.exportJson);
router.post('/import/preview', importPreviewValidators, validateRequest, applicationController.importPreview);
router.post('/import/commit', importCommitValidators, validateRequest, applicationController.importCommit);

router.get('/', listApplicationsValidators, validateRequest, applicationController.list);
router.post('/', createApplicationValidators, validateRequest, applicationController.create);
router.get('/:id', idParamValidator, validateRequest, applicationController.getOne);
router.put('/:id', idParamValidator, updateApplicationValidators, validateRequest, applicationController.update);
router.patch('/:id/status', statusUpdateValidators, validateRequest, applicationController.changeStatus);
router.delete('/:id', idParamValidator, validateRequest, applicationController.remove);

module.exports = router;
