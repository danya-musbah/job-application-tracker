const { run, all } = require('../config/db');

function logEvent(applicationId, userId, eventType, description) {
  run(
    'INSERT INTO application_events (application_id, user_id, event_type, description) VALUES (?, ?, ?, ?)',
    [applicationId, userId, eventType, description]
  );
}

function getTimeline(applicationId) {
  return all(
    `SELECT id, event_type AS eventType, description, created_at AS createdAt
     FROM application_events WHERE application_id = ? ORDER BY created_at ASC, id ASC`,
    [applicationId]
  );
}

module.exports = { logEvent, getTimeline };
