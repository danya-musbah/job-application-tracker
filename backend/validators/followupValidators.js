const { body, param } = require('express-validator');

const createFollowupValidators = [
  body('applicationId').isInt({ min: 1 }).withMessage('A valid application is required.'),
  body('followupDate').isISO8601().withMessage('A valid follow-up date is required.'),
  body('followupType').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('completed').optional().isBoolean().withMessage('Completed must be true or false.'),
];

const updateFollowupValidators = [
  param('id').isInt({ min: 1 }).withMessage('Invalid id.'),
  body('followupDate').optional().isISO8601(),
  body('followupType').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('completed').optional().isBoolean(),
];

const idParamValidator = [param('id').isInt({ min: 1 }).withMessage('Invalid id.')];

module.exports = { createFollowupValidators, updateFollowupValidators, idParamValidator };
