// Centralized API communication layer.
// Handles base URL config, credentials, CSRF header injection, timeouts,
// request cancellation, and consistent error shapes for the rest of the app.

const API_BASE = window.__API_BASE__ || 'http://localhost:4000/api';
const DEFAULT_TIMEOUT_MS = 15000;

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class NetworkError extends Error {}

/**
 * Core request function. Returns parsed JSON (or null for 204/empty bodies).
 * Automatically attaches the CSRF token for state-changing requests and
 * aborts after `timeoutMs` with a NetworkError.
 */
async function request(path, { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort());

  const headers = { 'Content-Type': 'application/json' };
  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = readCookie('jat_csrf');
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new NetworkError('The request timed out. Please check your connection and try again.');
    }
    throw new NetworkError('Could not reach the server. Please check your connection.');
  }
  clearTimeout(timeoutId);

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  if (!response.ok) {
    const message = (data && data.error) || `Request failed (${response.status}).`;
    throw new ApiError(message, response.status, data && data.details);
  }

  return data;
}

// Fetch (and cache) a CSRF cookie before the first mutating request if needed.
export async function ensureCsrfToken() {
  if (!readCookie('jat_csrf')) {
    try { await request('/csrf-token'); } catch { /* handled by caller's next request */ }
  }
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

// --- Auth ------------------------------------------------------------------
export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (payload) => api.post('/auth/change-password', payload),
};

// --- Applications ------------------------------------------------------------
export const applicationsApi = {
  list: (params) => api.get(`/applications?${new URLSearchParams(cleanParams(params))}`),
  get: (id) => api.get(`/applications/${id}`),
  create: (payload) => api.post('/applications', payload),
  update: (id, payload) => api.put(`/applications/${id}`, payload),
  changeStatus: (id, status) => api.patch(`/applications/${id}/status`, { status }),
  remove: (id) => api.delete(`/applications/${id}`),
  exportCsvUrl: () => `${API_BASE}/applications/export/csv`,
  exportJsonUrl: () => `${API_BASE}/applications/export/json`,
  importPreview: (csvText) => api.post('/applications/import/preview', { csvText }),
  importCommit: (rows) => api.post('/applications/import/commit', { rows }),
};

// --- Interviews ---------------------------------------------------------------
export const interviewsApi = {
  list: (params) => api.get(`/interviews?${new URLSearchParams(cleanParams(params))}`),
  create: (payload) => api.post('/interviews', payload),
  update: (id, payload) => api.put(`/interviews/${id}`, payload),
  remove: (id) => api.delete(`/interviews/${id}`),
};

// --- Follow-ups ------------------------------------------------------------------
export const followupsApi = {
  list: (params) => api.get(`/followups?${new URLSearchParams(cleanParams(params))}`),
  create: (payload) => api.post('/followups', payload),
  update: (id, payload) => api.put(`/followups/${id}`, payload),
  remove: (id) => api.delete(`/followups/${id}`),
};

// --- Dashboard ---------------------------------------------------------------------
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
  stats: () => api.get('/dashboard/stats'),
  analytics: () => api.get('/dashboard/analytics'),
};

// --- Notifications -------------------------------------------------------------------
export const notificationsApi = {
  list: (unreadOnly) => api.get(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// --- Settings -----------------------------------------------------------------------------
export const settingsApi = {
  getProfile: () => api.get('/settings/profile'),
  updateProfile: (payload) => api.put('/settings/profile', payload),
  updatePreferences: (payload) => api.put('/settings/preferences', payload),
  listJobSources: () => api.get('/settings/job-sources'),
  addJobSource: (name) => api.post('/settings/job-sources', { name }),
  listTags: () => api.get('/settings/tags'),
};

function cleanParams(params = {}) {
  const out = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}
