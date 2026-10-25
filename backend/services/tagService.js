const { run, get, all } = require('../config/db');

function getOrCreateTag(userId, name) {
  const clean = name.trim();
  if (!clean) return null;
  const existing = get('SELECT id FROM tags WHERE user_id = ? AND name = ?', [userId, clean]);
  if (existing) return existing.id;
  const { lastInsertRowid } = run('INSERT INTO tags (user_id, name) VALUES (?, ?)', [userId, clean]);
  return lastInsertRowid;
}

function setApplicationTags(userId, applicationId, tagNames = []) {
  run('DELETE FROM application_tags WHERE application_id = ?', [applicationId]);
  const uniqueNames = [...new Set((tagNames || []).map((t) => String(t).trim()).filter(Boolean))];
  for (const name of uniqueNames) {
    const tagId = getOrCreateTag(userId, name);
    if (tagId) {
      run('INSERT OR IGNORE INTO application_tags (application_id, tag_id) VALUES (?, ?)', [applicationId, tagId]);
    }
  }
}

function getApplicationTags(applicationId) {
  return all(
    `SELECT t.name FROM tags t
     JOIN application_tags at ON at.tag_id = t.id
     WHERE at.application_id = ? ORDER BY t.name ASC`,
    [applicationId]
  ).map((r) => r.name);
}

function listAllTags(userId) {
  return all('SELECT name FROM tags WHERE user_id = ? ORDER BY name ASC', [userId]).map((r) => r.name);
}

module.exports = { setApplicationTags, getApplicationTags, listAllTags };
