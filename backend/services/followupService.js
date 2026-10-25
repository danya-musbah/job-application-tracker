const { get, all, run } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { logEvent } = require('./timelineService');
const { assertOwnership: assertApplicationOwnership } = require('./applicationService');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    applicationId: row.application_id,
    followupDate: row.followup_date,
    followupType: row.followup_type,
    notes: row.notes,
    completed: !!row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertOwnership(id, userId) {
  const row = get('SELECT * FROM followups WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Follow-up not found.');
  if (row.user_id !== userId) throw new ApiError(403, 'You do not have access to this follow-up.');
  return row;
}

function listFollowups(userId, { applicationId, status } = {}) {
  const where = ['user_id = ?'];
  const params = [userId];
  if (applicationId) { where.push('application_id = ?'); params.push(applicationId); }
  if (status === 'overdue') { where.push("completed = 0 AND followup_date < date('now')"); }
  if (status === 'upcoming') { where.push("completed = 0 AND followup_date >= date('now')"); }
  if (status === 'completed') { where.push('completed = 1'); }
  const rows = all(
    `SELECT * FROM followups WHERE ${where.join(' AND ')} ORDER BY followup_date ASC`,
    params
  );
  return rows.map(mapRow);
}

function createFollowup(userId, payload) {
  assertApplicationOwnership(payload.applicationId, userId);
  const { lastInsertRowid } = run(
    `INSERT INTO followups (application_id, user_id, followup_date, followup_type, notes, completed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      payload.applicationId, userId, payload.followupDate, payload.followupType || 'General',
      payload.notes || null, payload.completed ? 1 : 0,
    ]
  );
  logEvent(payload.applicationId, userId, 'followup_added', `Follow-up scheduled for ${payload.followupDate}.`);
  return mapRow(get('SELECT * FROM followups WHERE id = ?', [lastInsertRowid]));
}

function updateFollowup(userId, id, payload) {
  const existing = assertOwnership(id, userId);
  const merged = {
    followupDate: payload.followupDate ?? existing.followup_date,
    followupType: payload.followupType ?? existing.followup_type,
    notes: payload.notes !== undefined ? payload.notes : existing.notes,
    completed: payload.completed !== undefined ? (payload.completed ? 1 : 0) : existing.completed,
  };
  run(
    `UPDATE followups SET followup_date = ?, followup_type = ?, notes = ?, completed = ?,
      updated_at = datetime('now') WHERE id = ?`,
    [merged.followupDate, merged.followupType, merged.notes || null, merged.completed, id]
  );
  if (payload.completed && !existing.completed) {
    logEvent(existing.application_id, userId, 'followup_completed', 'Follow-up marked as completed.');
  }
  return mapRow(get('SELECT * FROM followups WHERE id = ?', [id]));
}

function deleteFollowup(userId, id) {
  assertOwnership(id, userId);
  run('DELETE FROM followups WHERE id = ?', [id]);
}

module.exports = { listFollowups, createFollowup, updateFollowup, deleteFollowup, mapRow };
