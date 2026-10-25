const { body, query, param } = require('express-validator');

const STATUSES = [
  'Wishlist', 'Preparing', 'Applied', 'Screening', 'Interview',
  'Technical Interview', 'Final Interview', 'Offer', 'Accepted',
  'Rejected', 'Withdrawn',
];
const LOCATION_TYPES = ['remote', 'hybrid', 'onsite'];
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'internship', 'temporary'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const createApplicationValidators = [
  body('companyName').trim().notEmpty().withMessage('Company name is required.').isLength({ max: 200 }),
  body('jobTitle').trim().notEmpty().withMessage('Job title is required.').isLength({ max: 200 }),
  body('jobUrl').optional({ values: 'falsy' }).trim().isURL({ require_protocol: true }).withMessage('Job URL must be a valid URL.'),
  body('location').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('locationType').optional().isIn(LOCATION_TYPES).withMessage('Invalid location type.'),
  body('employmentType').optional().isIn(EMPLOYMENT_TYPES).withMessage('Invalid employment type.'),
  body('salaryMin').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Salary min must be a positive number.'),
  body('salaryMax').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Salary max must be a positive number.')
    .custom((value, { req }) => {
      if (req.body.salaryMin != null && value != null && Number(value) < Number(req.body.salaryMin)) {
        throw new Error('Salary max cannot be less than salary min.');
      }
      return true;
    }),
  body('currency').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code.'),
  body('applicationDate').notEmpty().withMessage('Application date is required.').isISO8601().withMessage('Application date must be a valid date.'),
  body('jobSource').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status.'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority.'),
  body('contactPerson').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('contactEmail').optional({ values: 'falsy' }).trim().isEmail().withMessage('Contact email must be valid.'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('resumeVersion').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('coverLetterVersion').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('tags').optional().isArray().withMessage('Tags must be an array.'),
  body('tags.*').optional().trim().isLength({ max: 50 }),
];

const updateApplicationValidators = createApplicationValidators;

const idParamValidator = [param('id').isInt({ min: 1 }).withMessage('Invalid id.')];

const statusUpdateValidators = [
  ...idParamValidator,
  body('status').isIn(STATUSES).withMessage('Invalid status.'),
];

const importPreviewValidators = [
  body('csvText').isString().withMessage('CSV content must be text.').bail()
    .notEmpty().withMessage('CSV content is required.'),
];

const importCommitValidators = [
  body('rows').isArray({ min: 1, max: 2000 }).withMessage('Rows must contain between 1 and 2000 items.'),
  body('rows.*').isObject({ strict: true }).withMessage('Each row must be an object.'),
];

const listApplicationsValidators = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
  query('priority').optional().isIn(PRIORITIES),
  query('locationType').optional().isIn(LOCATION_TYPES),
  query('employmentType').optional().isIn(EMPLOYMENT_TYPES),
  query('jobSource').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('salaryMin').optional().isFloat({ min: 0 }),
  query('salaryMax').optional().isFloat({ min: 0 }),
  query('search').optional().isString().isLength({ max: 200 }),
  query('sortBy').optional().isIn(['newest', 'oldest', 'company', 'jobTitle', 'status', 'priority', 'salary', 'applicationDate']),
];

module.exports = {
  STATUSES,
  LOCATION_TYPES,
  EMPLOYMENT_TYPES,
  PRIORITIES,
  createApplicationValidators,
  updateApplicationValidators,
  idParamValidator,
  statusUpdateValidators,
  importPreviewValidators,
  importCommitValidators,
  listApplicationsValidators,
};
