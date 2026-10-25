const { get, all, run } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { logEvent } = require('./timelineService');
const { assertOwnership: assertApplicationOwnership } = require('./applicationService');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    applicationId: row.application_id,
    interviewType: row.interview_type,
    interviewDate: row.interview_date,
    interviewTime: row.interview_time,
    interviewer: row.interviewer,
    locationOrUrl: row.location_or_url,
    notes: row.notes,
    prepNotes: row.prep_notes,
    result: row.result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertOwnership(id, userId) {
  const row = get('SELECT * FROM interviews WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Interview not found.');
  if (row.user_id !== userId) throw new ApiError(403, 'You do not have access to this interview.');
  return row;
}

function listInterviews(userId, { applicationId, upcoming } = {}) {
  const where = ['user_id = ?'];
  const params = [userId];
  if (applicationId) { where.push('application_id = ?'); params.push(applicationId); }
  if (upcoming) { where.push("interview_date >= date('now')"); }
  const rows = all(
    `SELECT * FROM interviews WHERE ${where.join(' AND ')} ORDER BY interview_date ASC, interview_time ASC`,
    params
  );
  return rows.map(mapRow);
}

function createInterview(userId, payload) {
  assertApplicationOwnership(payload.applicationId, userId);
  const { lastInsertRowid } = run(
    `INSERT INTO interviews (
      application_id, user_id, interview_type, interview_date, interview_time,
      interviewer, location_or_url, notes, prep_notes, result
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.applicationId, userId, payload.interviewType, payload.interviewDate,
      payload.interviewTime || null, payload.interviewer || null, payload.locationOrUrl || null,
      payload.notes || null, payload.prepNotes || null, payload.result || 'Pending',
    ]
  );
  logEvent(payload.applicationId, userId, 'interview_scheduled', `${payload.interviewType} scheduled for ${payload.interviewDate}.`);
  return mapRow(get('SELECT * FROM interviews WHERE id = ?', [lastInsertRowid]));
}

function updateInterview(userId, id, payload) {
  const existing = assertOwnership(id, userId);
  const merged = {
    interviewType: payload.interviewType ?? existing.interview_type,
    interviewDate: payload.interviewDate ?? existing.interview_date,
    interviewTime: payload.interviewTime !== undefined ? payload.interviewTime : existing.interview_time,
    interviewer: payload.interviewer !== undefined ? payload.interviewer : existing.interviewer,
    locationOrUrl: payload.locationOrUrl !== undefined ? payload.locationOrUrl : existing.location_or_url,
    notes: payload.notes !== undefined ? payload.notes : existing.notes,
    prepNotes: payload.prepNotes !== undefined ? payload.prepNotes : existing.prep_notes,
    result: payload.result ?? existing.result,
  };
  run(
    `UPDATE interviews SET interview_type = ?, interview_date = ?, interview_time = ?,
      interviewer = ?, location_or_url = ?, notes = ?, prep_notes = ?, result = ?,
      updated_at = datetime('now') WHERE id = ?`,
    [
      merged.interviewType, merged.interviewDate, merged.interviewTime || null, merged.interviewer || null,
      merged.locationOrUrl || null, merged.notes || null, merged.prepNotes || null, merged.result, id,
    ]
  );
  if (payload.result && payload.result !== existing.result) {
    logEvent(existing.application_id, userId, 'interview_completed', `Interview result updated to ${payload.result}.`);
  }
  return mapRow(get('SELECT * FROM interviews WHERE id = ?', [id]));
}

function deleteInterview(userId, id) {
  assertOwnership(id, userId);
  run('DELETE FROM interviews WHERE id = ?', [id]);
}

module.exports = { listInterviews, createInterview, updateInterview, deleteInterview, mapRow };
