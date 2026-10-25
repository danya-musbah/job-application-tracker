const { all, get } = require('../config/db');

function getStats(userId) {
  const byStatus = all(
    'SELECT status, COUNT(*) AS count FROM applications WHERE user_id = ? GROUP BY status',
    [userId]
  );
  const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.count]));

  const total = byStatus.reduce((sum, r) => sum + r.count, 0);
  const interviewStatuses = ['Interview', 'Technical Interview', 'Final Interview'];
  const interviewCount = interviewStatuses.reduce((sum, s) => sum + (statusMap[s] || 0), 0);

  return {
    total,
    applied: statusMap['Applied'] || 0,
    inReview: statusMap['Screening'] || 0,
    interviews: interviewCount,
    offers: (statusMap['Offer'] || 0) + (statusMap['Accepted'] || 0),
    rejected: statusMap['Rejected'] || 0,
    withdrawn: statusMap['Withdrawn'] || 0,
    byStatus: statusMap,
  };
}

function getAnalytics(userId) {
  // Applications over time (last 12 months, by month).
  const overTime = all(
    `SELECT strftime('%Y-%m', application_date) AS month, COUNT(*) AS count
     FROM applications WHERE user_id = ?
     GROUP BY month ORDER BY month ASC`,
    [userId]
  );

  const byStatus = all(
    'SELECT status, COUNT(*) AS count FROM applications WHERE user_id = ? GROUP BY status',
    [userId]
  );

  const bySource = all(
    `SELECT COALESCE(NULLIF(job_source, ''), 'Unspecified') AS source, COUNT(*) AS count
     FROM applications WHERE user_id = ? GROUP BY source ORDER BY count DESC`,
    [userId]
  );

  const totalRow = get('SELECT COUNT(*) AS count FROM applications WHERE user_id = ?', [userId]);
  const total = totalRow ? totalRow.count : 0;

  const interviewedRow = get(
    `SELECT COUNT(DISTINCT application_id) AS count FROM interviews WHERE user_id = ?`,
    [userId]
  );
  const offersRow = get(
    `SELECT COUNT(*) AS count FROM applications WHERE user_id = ? AND status IN ('Offer','Accepted')`,
    [userId]
  );
  const rejectedRow = get(
    `SELECT COUNT(*) AS count FROM applications WHERE user_id = ? AND status = 'Rejected'`,
    [userId]
  );

  const rate = (num) => (total > 0 ? Math.round((num / total) * 1000) / 10 : 0);

  return {
    applicationsOverTime: overTime,
    applicationsByStatus: byStatus,
    applicationsBySource: bySource,
    interviewRate: rate(interviewedRow ? interviewedRow.count : 0),
    offerRate: rate(offersRow ? offersRow.count : 0),
    rejectionRate: rate(rejectedRow ? rejectedRow.count : 0),
  };
}

module.exports = { getStats, getAnalytics };
