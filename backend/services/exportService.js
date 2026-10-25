const { all } = require('../config/db');
const { mapRow } = require('./applicationService');
const { stringifyCsv } = require('./csvUtils');

const EXPORT_COLUMNS = [
  'companyName', 'jobTitle', 'jobUrl', 'location', 'locationType', 'employmentType',
  'salaryMin', 'salaryMax', 'currency', 'applicationDate', 'jobSource', 'status',
  'priority', 'contactPerson', 'contactEmail', 'notes', 'resumeVersion',
  'coverLetterVersion', 'tags',
];

function getExportData(userId) {
  const rows = all('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at ASC', [userId]);
  return rows.map(mapRow).map((app) => ({ ...app, tags: app.tags.join('; ') }));
}

function exportAsJson(userId) {
  const rows = all('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at ASC', [userId]);
  return rows.map(mapRow);
}

function exportAsCsv(userId) {
  const data = getExportData(userId);
  return stringifyCsv(data, EXPORT_COLUMNS);
}

module.exports = { exportAsJson, exportAsCsv, EXPORT_COLUMNS };
