const { body, param } = require('express-validator');

const INTERVIEW_TYPES = [
  'Phone Screen', 'HR Interview', 'Technical Interview',
  'Coding Interview', 'Behavioral Interview', 'Final Interview',
];
const RESULTS = ['Pending', 'Passed', 'Failed', 'Cancelled', 'Rescheduled'];

const createInterviewValidators = [
  body('applicationId').isInt({ min: 1 }).withMessage('A valid application is required.'),
  body('interviewType').isIn(INTERVIEW_TYPES).withMessage('Invalid interview type.'),
  body('interviewDate').isISO8601().withMessage('A valid interview date is required.'),
  body('interviewTime').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Time must be HH:MM.'),
  body('interviewer').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('locationOrUrl').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('prepNotes').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('result').optional().isIn(RESULTS).withMessage('Invalid result.'),
];

const updateInterviewValidators = [
  param('id').isInt({ min: 1 }).withMessage('Invalid id.'),
  body('interviewType').optional().isIn(INTERVIEW_TYPES).withMessage('Invalid interview type.'),
  body('interviewDate').optional().isISO8601().withMessage('A valid interview date is required.'),
  body('interviewTime').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Time must be HH:MM.'),
  body('interviewer').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('locationOrUrl').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('prepNotes').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('result').optional().isIn(RESULTS).withMessage('Invalid result.'),
];

const idParamValidator = [param('id').isInt({ min: 1 }).withMessage('Invalid id.')];

module.exports = { INTERVIEW_TYPES, RESULTS, createInterviewValidators, updateInterviewValidators, idParamValidator };
