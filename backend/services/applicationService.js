const { get, all, run, transaction } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { setApplicationTags, getApplicationTags } = require('./tagService');
const { logEvent } = require('./timelineService');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    jobUrl: row.job_url,
    location: row.location,
    locationType: row.location_type,
    employmentType: row.employment_type,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    currency: row.currency,
    applicationDate: row.application_date,
    jobSource: row.job_source,
    status: row.status,
    priority: row.priority,
    contactPerson: row.contact_person,
    contactEmail: row.contact_email,
    notes: row.notes,
    resumeVersion: row.resume_version,
    coverLetterVersion: row.cover_letter_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: getApplicationTags(row.id),
  };
}

function assertOwnership(applicationId, userId) {
  const row = get('SELECT * FROM applications WHERE id = ?', [applicationId]);
  if (!row) throw new ApiError(404, 'Application not found.');
  if (row.user_id !== userId) throw new ApiError(403, 'You do not have access to this application.');
  return row;
}

const SORT_MAP = {
  newest: 'a.created_at DESC',
  oldest: 'a.created_at ASC',
  company: 'a.company_name ASC',
  jobTitle: 'a.job_title ASC',
  status: 'a.status ASC',
  priority: "CASE a.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END ASC",
  salary: 'a.salary_max DESC',
  applicationDate: 'a.application_date DESC',
};

function listApplications(userId, filters) {
  const {
    page = 1, limit = 20, status, priority, locationType, employmentType,
    jobSource, dateFrom, dateTo, salaryMin, salaryMax, search, sortBy = 'newest',
  } = filters;

  const where = ['a.user_id = ?'];
  const params = [userId];

  if (status) { where.push('a.status = ?'); params.push(status); }
  if (priority) { where.push('a.priority = ?'); params.push(priority); }
  if (locationType) { where.push('a.location_type = ?'); params.push(locationType); }
  if (employmentType) { where.push('a.employment_type = ?'); params.push(employmentType); }
  if (jobSource) { where.push('a.job_source = ?'); params.push(jobSource); }
  if (dateFrom) { where.push('a.application_date >= ?'); params.push(dateFrom); }
  if (dateTo) { where.push('a.application_date <= ?'); params.push(dateTo); }
  if (salaryMin) { where.push('(a.salary_max IS NULL OR a.salary_max >= ?)'); params.push(salaryMin); }
  if (salaryMax) { where.push('(a.salary_min IS NULL OR a.salary_min <= ?)'); params.push(salaryMax); }
  if (search) {
    where.push(`(
      a.company_name LIKE ? OR a.job_title LIKE ? OR a.location LIKE ? OR
      a.contact_person LIKE ? OR EXISTS (
        SELECT 1 FROM application_tags at JOIN tags t ON t.id = at.tag_id
        WHERE at.application_id = a.id AND t.name LIKE ?
      )
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }

  const whereSql = where.join(' AND ');
  const orderSql = SORT_MAP[sortBy] || SORT_MAP.newest;

  const totalRow = get(`SELECT COUNT(*) AS count FROM applications a WHERE ${whereSql}`, params);
  const total = totalRow ? totalRow.count : 0;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const rows = all(
    `SELECT a.* FROM applications a WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    data: rows.map(mapRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    },
  };
}

function getApplication(userId, id) {
  const row = assertOwnership(id, userId);
  return mapRow(row);
}

function createApplication(userId, payload) {
  return transaction(() => {
    const {
      companyName, jobTitle, jobUrl, location, locationType = 'onsite',
      employmentType = 'full-time', salaryMin, salaryMax, currency = 'USD',
      applicationDate, jobSource, status = 'Wishlist', priority = 'Medium',
      contactPerson, contactEmail, notes, resumeVersion, coverLetterVersion, tags,
    } = payload;

    const { lastInsertRowid } = run(
      `INSERT INTO applications (
        user_id, company_name, job_title, job_url, location, location_type,
        employment_type, salary_min, salary_max, currency, application_date,
        job_source, status, priority, contact_person, contact_email, notes,
        resume_version, cover_letter_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, companyName, jobTitle, jobUrl || null, location || null, locationType,
        employmentType, salaryMin ?? null, salaryMax ?? null, currency, applicationDate,
        jobSource || null, status, priority, contactPerson || null, contactEmail || null,
        notes || null, resumeVersion || null, coverLetterVersion || null,
      ]
    );

    setApplicationTags(userId, lastInsertRowid, tags);
    logEvent(lastInsertRowid, userId, 'created', `Application to ${companyName} for ${jobTitle} created.`);

    return getApplication(userId, lastInsertRowid);
  });
}

function updateApplication(userId, id, payload) {
  return transaction(() => {
    const existing = assertOwnership(id, userId);

    const merged = {
      companyName: payload.companyName ?? existing.company_name,
      jobTitle: payload.jobTitle ?? existing.job_title,
      jobUrl: payload.jobUrl ?? existing.job_url,
      location: payload.location ?? existing.location,
      locationType: payload.locationType ?? existing.location_type,
      employmentType: payload.employmentType ?? existing.employment_type,
      salaryMin: payload.salaryMin !== undefined ? payload.salaryMin : existing.salary_min,
      salaryMax: payload.salaryMax !== undefined ? payload.salaryMax : existing.salary_max,
      currency: payload.currency ?? existing.currency,
      applicationDate: payload.applicationDate ?? existing.application_date,
      jobSource: payload.jobSource ?? existing.job_source,
      priority: payload.priority ?? existing.priority,
      contactPerson: payload.contactPerson ?? existing.contact_person,
      contactEmail: payload.contactEmail ?? existing.contact_email,
      notes: payload.notes ?? existing.notes,
      resumeVersion: payload.resumeVersion ?? existing.resume_version,
      coverLetterVersion: payload.coverLetterVersion ?? existing.cover_letter_version,
    };

    run(
      `UPDATE applications SET
        company_name = ?, job_title = ?, job_url = ?, location = ?, location_type = ?,
        employment_type = ?, salary_min = ?, salary_max = ?, currency = ?, application_date = ?,
        job_source = ?, priority = ?, contact_person = ?, contact_email = ?, notes = ?,
        resume_version = ?, cover_letter_version = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        merged.companyName, merged.jobTitle, merged.jobUrl || null, merged.location || null,
        merged.locationType, merged.employmentType, merged.salaryMin ?? null, merged.salaryMax ?? null,
        merged.currency, merged.applicationDate, merged.jobSource || null, merged.priority,
        merged.contactPerson || null, merged.contactEmail || null, merged.notes || null,
        merged.resumeVersion || null, merged.coverLetterVersion || null, id,
      ]
    );

    if (payload.tags !== undefined) {
      setApplicationTags(userId, id, payload.tags);
    }

    // Handle status change separately so it's timeline-tracked and validated.
    if (payload.status && payload.status !== existing.status) {
      run('UPDATE applications SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [payload.status, id]);
      logEvent(id, userId, 'status_changed', `Status changed from ${existing.status} to ${payload.status}.`);
    }

    logEvent(id, userId, 'updated', 'Application details updated.');
    return getApplication(userId, id);
  });
}

function changeStatus(userId, id, status) {
  const existing = assertOwnership(id, userId);
  if (existing.status === status) return mapRow(existing);
  run('UPDATE applications SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [status, id]);
  logEvent(id, userId, 'status_changed', `Status changed from ${existing.status} to ${status}.`);
  return getApplication(userId, id);
}

function deleteApplication(userId, id) {
  assertOwnership(id, userId);
  run('DELETE FROM applications WHERE id = ?', [id]);
}

module.exports = {
  mapRow,
  assertOwnership,
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  changeStatus,
  deleteApplication,
};
