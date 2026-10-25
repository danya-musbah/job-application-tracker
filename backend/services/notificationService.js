const { all, run, get } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

function mapRow(row) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    relatedApplicationId: row.related_application_id,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

function listNotifications(userId, { unreadOnly } = {}) {
  const where = ['user_id = ?'];
  const params = [userId];
  if (unreadOnly) where.push('is_read = 0');
  const rows = all(
    `SELECT * FROM notifications WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
    params
  );
  return rows.map(mapRow);
}

function markAsRead(userId, id) {
  const notification = get('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
  if (!notification) throw new ApiError(404, 'Notification not found.');
  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
}

function markAllAsRead(userId) {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
}

function createNotification(userId, type, message, relatedApplicationId = null) {
  // Avoid duplicate unread notifications with the exact same message.
  const existing = get(
    'SELECT id FROM notifications WHERE user_id = ? AND type = ? AND message = ? AND is_read = 0',
    [userId, type, message]
  );
  if (existing) return;
  run(
    'INSERT INTO notifications (user_id, type, message, related_application_id) VALUES (?, ?, ?, ?)',
    [userId, type, message, relatedApplicationId]
  );
}

/**
 * Scans a user's data and generates fresh in-app notifications for:
 *  - interviews happening within the next 3 days
 *  - overdue follow-ups
 *  - applications with no activity for `staleDays` days (excludes closed statuses)
 * Safe to call on every dashboard/notifications load; duplicates are skipped.
 */
function generateReminders(userId, staleDays = 7) {
  const upcomingInterviews = all(
    `SELECT i.*, a.company_name, a.job_title FROM interviews i
     JOIN applications a ON a.id = i.application_id
     WHERE i.user_id = ? AND i.interview_date BETWEEN date('now') AND date('now', '+3 day')
       AND i.result = 'Pending'`,
    [userId]
  );
  for (const iv of upcomingInterviews) {
    createNotification(
      userId,
      'upcoming_interview',
      `Upcoming ${iv.interview_type} with ${iv.company_name} (${iv.job_title}) on ${iv.interview_date}.`,
      iv.application_id
    );
  }

  const overdueFollowups = all(
    `SELECT f.*, a.company_name, a.job_title FROM followups f
     JOIN applications a ON a.id = f.application_id
     WHERE f.user_id = ? AND f.completed = 0 AND f.followup_date < date('now')`,
    [userId]
  );
  for (const fu of overdueFollowups) {
    createNotification(
      userId,
      'overdue_followup',
      `Overdue follow-up for ${fu.company_name} (${fu.job_title}) was due ${fu.followup_date}.`,
      fu.application_id
    );
  }

  const staleApplications = all(
    `SELECT * FROM applications
     WHERE user_id = ? AND status NOT IN ('Rejected','Withdrawn','Accepted')
       AND updated_at < datetime('now', ?)`,
    [userId, `-${staleDays} day`]
  );
  for (const app of staleApplications) {
    createNotification(
      userId,
      'stale_application',
      `No activity on ${app.company_name} (${app.job_title}) in over ${staleDays} days.`,
      app.id
    );
  }
}

module.exports = { listNotifications, markAsRead, markAllAsRead, createNotification, generateReminders };
