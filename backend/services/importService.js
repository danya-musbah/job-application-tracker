const { get } = require('../config/db');
const { parseCsv } = require('./csvUtils');
const { createApplication } = require('./applicationService');
const { STATUSES, LOCATION_TYPES, EMPLOYMENT_TYPES, PRIORITIES } = require('../validators/applicationValidators');
const { ApiError } = require('../middleware/errorHandler');

const REQUIRED_FIELDS = ['companyName', 'jobTitle', 'applicationDate'];

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function trimText(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeRow(raw) {
  const locationType = trimText(firstValue(raw.locationType, raw['Location Type'], 'onsite'));
  const employmentType = trimText(firstValue(raw.employmentType, raw['Employment Type'], 'full-time'));
  const currency = trimText(firstValue(raw.currency, raw.Currency, 'USD'));
  const tags = firstValue(raw.tags, raw.Tags, '');
  return {
    companyName: trimText(firstValue(raw.companyName, raw['Company Name'], raw.company, '')),
    jobTitle: trimText(firstValue(raw.jobTitle, raw['Job Title'], raw.title, '')),
    jobUrl: trimText(firstValue(raw.jobUrl, raw['Job URL'], '')),
    location: trimText(firstValue(raw.location, raw.Location, '')),
    locationType: typeof locationType === 'string' ? locationType.toLowerCase() : locationType,
    employmentType: typeof employmentType === 'string' ? employmentType.toLowerCase() : employmentType,
    salaryMin: firstValue(raw.salaryMin, raw['Salary Min'], ''),
    salaryMax: firstValue(raw.salaryMax, raw['Salary Max'], ''),
    currency: typeof currency === 'string' ? currency.toUpperCase() : currency,
    applicationDate: trimText(firstValue(raw.applicationDate, raw['Application Date'], '')),
    jobSource: trimText(firstValue(raw.jobSource, raw['Job Source'], '')),
    status: trimText(firstValue(raw.status, raw.Status, 'Applied')),
    priority: trimText(firstValue(raw.priority, raw.Priority, 'Medium')),
    contactPerson: trimText(firstValue(raw.contactPerson, raw['Contact Person'], '')),
    contactEmail: trimText(firstValue(raw.contactEmail, raw['Contact Email'], '')),
    notes: trimText(firstValue(raw.notes, raw.Notes, '')),
    resumeVersion: trimText(firstValue(raw.resumeVersion, raw['Resume Version'], '')),
    coverLetterVersion: trimText(firstValue(raw.coverLetterVersion, raw['Cover Letter Version'], '')),
    tags: Array.isArray(tags) ? tags.map(trimText) : trimText(tags),
  };
}

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return ['Row must be an object.'];
  }

  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (typeof row[field] !== 'string' || !row[field].trim()) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const textLimits = {
    companyName: 200,
    jobTitle: 200,
    jobUrl: 2048,
    location: 200,
    currency: 3,
    jobSource: 100,
    contactPerson: 150,
    contactEmail: 200,
    notes: 5000,
    resumeVersion: 150,
    coverLetterVersion: 150,
  };
  for (const [field, maxLength] of Object.entries(textLimits)) {
    const value = row[field];
    if (value !== undefined && value !== null && value !== '' && (
      typeof value !== 'string' || value.length > maxLength
    )) {
      errors.push(`${field} must be text of at most ${maxLength} characters.`);
    }
  }

  if (row.applicationDate && !isValidDateOnly(row.applicationDate)) {
    errors.push('Invalid application date.');
  }
  if (row.status && !STATUSES.includes(row.status)) {
    errors.push(`Invalid status "${row.status}".`);
  }
  if (row.locationType && !LOCATION_TYPES.includes(row.locationType)) {
    errors.push(`Invalid location type "${row.locationType}".`);
  }
  if (row.employmentType && !EMPLOYMENT_TYPES.includes(row.employmentType)) {
    errors.push(`Invalid employment type "${row.employmentType}".`);
  }
  if (row.priority && !PRIORITIES.includes(row.priority)) {
    errors.push(`Invalid priority "${row.priority}".`);
  }

  for (const field of ['salaryMin', 'salaryMax']) {
    const value = row[field];
    if (value === undefined || value === null || value === '') continue;
    if (
      (typeof value !== 'string' && typeof value !== 'number')
      || (typeof value === 'string' && !value.trim())
      || !Number.isFinite(Number(value))
      || Number(value) < 0
    ) {
      errors.push(`${field} must be a non-negative number.`);
    }
  }
  if (
    row.salaryMin !== undefined && row.salaryMin !== null && row.salaryMin !== ''
    && row.salaryMax !== undefined && row.salaryMax !== null && row.salaryMax !== ''
    && Number.isFinite(Number(row.salaryMin)) && Number.isFinite(Number(row.salaryMax))
    && Number(row.salaryMax) < Number(row.salaryMin)
  ) {
    errors.push('Salary max cannot be less than salary min.');
  }

  if (row.jobUrl) {
    try {
      const url = new URL(row.jobUrl);
      if (!['http:', 'https:'].includes(url.protocol)) errors.push('Job URL must use HTTP or HTTPS.');
    } catch {
      errors.push('Job URL must be a valid URL.');
    }
  }
  if (row.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.contactEmail)) {
    errors.push('Contact email must be valid.');
  }
  if (
    row.currency !== undefined && row.currency !== null && row.currency !== ''
    && !/^[A-Za-z]{3}$/.test(row.currency)
  ) {
    errors.push('Currency must be a 3-letter code.');
  }
  if (row.tags !== undefined && row.tags !== null && row.tags !== '') {
    if (typeof row.tags === 'string') {
      if (row.tags.length > 5000) errors.push('Tags must be at most 5000 characters.');
    } else if (
      !Array.isArray(row.tags)
      || row.tags.some((tag) => typeof tag !== 'string' || tag.length > 50)
    ) {
      errors.push('Tags must be text or an array of tags up to 50 characters each.');
    }
  }
  return errors;
}

function isDuplicate(userId, row) {
  const existing = get(
    `SELECT id FROM applications WHERE user_id = ? AND company_name = ? AND job_title = ? AND application_date = ?`,
    [userId, row.companyName, row.jobTitle, row.applicationDate]
  );
  return !!existing;
}

/**
 * Parses raw CSV text and returns a preview: valid rows (ready to import),
 * invalid rows (with error messages), and rows flagged as likely duplicates.
 * Nothing is written to the database at this stage.
 */
function previewImport(userId, csvText) {
  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
    throw new ApiError(422, 'CSV file is empty or unreadable.');
  }

  let parsed;
  try {
    parsed = parseCsv(csvText);
  } catch (err) {
    throw new ApiError(422, 'Could not parse CSV file. Please check its formatting.');
  }

  if (parsed.length === 0) {
    throw new ApiError(422, 'No rows found in the CSV file.');
  }
  if (parsed.length > 2000) {
    throw new ApiError(422, 'CSV file has too many rows (max 2000 per import).');
  }

  const valid = [];
  const invalid = [];
  const duplicates = [];
  const seenInBatch = new Set();

  parsed.forEach((raw, index) => {
    const row = normalizeRow(raw);
    const errors = validateRow(row);
    if (errors.length > 0) {
      invalid.push({ rowNumber: index + 2, data: row, errors });
      return;
    }
    const batchKey = JSON.stringify([row.companyName, row.jobTitle, row.applicationDate]);
    if (isDuplicate(userId, row) || seenInBatch.has(batchKey)) {
      duplicates.push({ rowNumber: index + 2, data: row });
      return;
    }
    seenInBatch.add(batchKey);
    valid.push({ rowNumber: index + 2, data: row });
  });

  return { totalRows: parsed.length, valid, invalid, duplicates };
}

/**
 * Commits a previously-previewed set of rows. Only rows explicitly passed in
 * `rows` are inserted; duplicates are re-checked at commit time as a safety net.
 */
function commitImport(userId, rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 2000) {
    throw new ApiError(422, 'Import must contain between 1 and 2000 rows.');
  }
  let imported = 0;
  let skipped = 0;
  const errors = [];
  const seenInBatch = new Set();

  for (const inputRow of rows) {
    const row = normalizeRow(inputRow);
    const errs = validateRow(row);
    if (errs.length > 0) {
      errors.push({ row, errors: errs });
      continue;
    }
    const batchKey = JSON.stringify([row.companyName, row.jobTitle, row.applicationDate]);
    if (isDuplicate(userId, row) || seenInBatch.has(batchKey)) {
      skipped += 1;
      continue;
    }
    seenInBatch.add(batchKey);
    const tags = row.tags ? String(row.tags).split(/[;,]/).map((t) => t.trim()).filter(Boolean) : [];
    const normalizedTags = Array.isArray(row.tags)
      ? row.tags.map((tag) => tag.trim()).filter(Boolean)
      : tags;
    createApplication(userId, {
      companyName: row.companyName.trim(),
      jobTitle: row.jobTitle.trim(),
      jobUrl: row.jobUrl?.trim() || undefined,
      location: row.location?.trim() || undefined,
      locationType: row.locationType || 'onsite',
      employmentType: row.employmentType || 'full-time',
      salaryMin: row.salaryMin !== '' && row.salaryMin != null ? Number(row.salaryMin) : undefined,
      salaryMax: row.salaryMax !== '' && row.salaryMax != null ? Number(row.salaryMax) : undefined,
      currency: row.currency?.trim().toUpperCase() || 'USD',
      applicationDate: row.applicationDate,
      jobSource: row.jobSource || undefined,
      status: row.status || 'Applied',
      priority: row.priority || 'Medium',
      contactPerson: row.contactPerson?.trim() || undefined,
      contactEmail: row.contactEmail?.trim() || undefined,
      notes: row.notes?.trim() || undefined,
      resumeVersion: row.resumeVersion?.trim() || undefined,
      coverLetterVersion: row.coverLetterVersion?.trim() || undefined,
      tags: normalizedTags,
    });
    imported += 1;
  }

  return { imported, skipped, errors };
}

module.exports = { previewImport, commitImport };
