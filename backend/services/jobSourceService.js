const { all, run, get } = require('../config/db');

const DEFAULT_SOURCES = [
  'LinkedIn', 'Indeed', 'Glassdoor', 'Company Website',
  'Referral', 'University', 'Recruiter', 'Other',
];

function seedDefaultJobSources(userId) {
  for (const name of DEFAULT_SOURCES) {
    run(
      'INSERT OR IGNORE INTO job_sources (user_id, name, is_custom) VALUES (?, ?, 0)',
      [userId, name]
    );
  }
}

function listJobSources(userId) {
  return all('SELECT id, name, is_custom AS isCustom FROM job_sources WHERE user_id = ? ORDER BY is_custom ASC, name ASC', [userId]);
}

function addCustomJobSource(userId, name) {
  const existing = get('SELECT id, name FROM job_sources WHERE user_id = ? AND name = ?', [userId, name]);
  if (existing) return existing;
  const { lastInsertRowid } = run(
    'INSERT INTO job_sources (user_id, name, is_custom) VALUES (?, ?, 1)',
    [userId, name]
  );
  return { id: lastInsertRowid, name };
}

module.exports = { DEFAULT_SOURCES, seedDefaultJobSources, listJobSources, addCustomJobSource };
