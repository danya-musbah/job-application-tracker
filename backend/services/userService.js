const { get, run } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    defaultStatus: row.default_status,
    defaultCurrency: row.default_currency,
    itemsPerPage: row.items_per_page,
    reminderDays: row.reminder_days,
    theme: row.theme,
    createdAt: row.created_at,
  };
}

function getProfile(userId) {
  return mapUser(get('SELECT * FROM users WHERE id = ?', [userId]));
}

function updateProfile(userId, { name, email }) {
  const existing = get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!existing) throw new ApiError(404, 'User not found.');

  if (email && email !== existing.email) {
    const emailTaken = get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (emailTaken) throw new ApiError(409, 'That email is already in use.');
  }

  run(
    'UPDATE users SET name = ?, email = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [name ?? existing.name, email ?? existing.email, userId]
  );
  return getProfile(userId);
}

function updatePreferences(userId, prefs) {
  const existing = get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!existing) throw new ApiError(404, 'User not found.');

  const merged = {
    defaultStatus: prefs.defaultStatus ?? existing.default_status,
    defaultCurrency: prefs.defaultCurrency ?? existing.default_currency,
    itemsPerPage: prefs.itemsPerPage ?? existing.items_per_page,
    reminderDays: prefs.reminderDays ?? existing.reminder_days,
    theme: prefs.theme ?? existing.theme,
  };

  run(
    `UPDATE users SET default_status = ?, default_currency = ?, items_per_page = ?,
      reminder_days = ?, theme = ?, updated_at = datetime('now') WHERE id = ?`,
    [
      merged.defaultStatus,
      merged.defaultCurrency.toUpperCase(),
      merged.itemsPerPage,
      merged.reminderDays,
      merged.theme,
      userId,
    ]
  );
  return getProfile(userId);
}

module.exports = { getProfile, updateProfile, updatePreferences, mapUser };
