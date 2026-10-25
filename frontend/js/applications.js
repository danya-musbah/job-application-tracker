import { applicationsApi, ApiError, NetworkError, ensureCsrfToken } from './api.js';
import {
  el, icon, clearNode, debounce, formatDate, salaryRangeLabel, slugifyStatus,
  showToast, setFormMessage, applyFieldErrors, clearFieldErrors, toDateInputValue,
} from './utils.js';
import { settingsApi } from './api.js';
import { openModal, closeModal, confirmAction } from './modals.js';

export const STATUSES = [
  'Wishlist', 'Preparing', 'Applied', 'Screening', 'Interview',
  'Technical Interview', 'Final Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn',
];

const state = {
  page: 1,
  limit: 20,
  sortBy: 'newest',
  search: '',
  filters: {},
  mode: 'table', // or 'card'
  lastResult: null,
};

function statusBadge(status) {
  return el('span', { class: `badge badge-${slugifyStatus(status)}` }, status);
}

function priorityLabel(priority) {
  return el('span', { class: `priority-dot priority-${priority.toLowerCase()}` }, priority);
}

// ------------------------------------------------------------------ options
async function populateStatusOptions() {
  const targets = ['app-status', 'filter-status'];
  for (const id of targets) {
    const select = document.getElementById(id);
    if (!select) continue;
    const keepFirst = id === 'filter-status';
    select.innerHTML = keepFirst ? '<option value="">All</option>' : '';
    for (const status of STATUSES) {
      select.appendChild(el('option', { value: status }, status));
    }
  }
}

async function populateJobSources() {
  try {
    const sources = await settingsApi.listJobSources();
    for (const id of ['app-source', 'filter-source']) {
      const select = document.getElementById(id);
      if (!select) continue;
      const keepFirst = select.firstElementChild;
      select.innerHTML = '';
      if (keepFirst) select.appendChild(keepFirst);
      for (const s of sources) select.appendChild(el('option', { value: s.name }, s.name));
    }
  } catch { /* non-critical */ }
}

// ------------------------------------------------------------------ list load
export async function loadApplications() {
  const loadingEl = document.getElementById('applications-loading');
  const emptyEl = document.getElementById('applications-empty');
  const errorEl = document.getElementById('applications-network-error');
  const tableWrap = document.getElementById('applications-table-wrap');
  const cardsGrid = document.getElementById('applications-cards');
  const pagination = document.getElementById('pagination');

  loadingEl.hidden = false;
  emptyEl.hidden = true;
  errorEl.hidden = true;
  tableWrap.hidden = true;
  cardsGrid.hidden = true;
  pagination.hidden = true;

  const params = {
    page: state.page, limit: state.limit, sortBy: state.sortBy, search: state.search || undefined,
    ...state.filters,
  };

  try {
    const result = await applicationsApi.list(params);
    state.lastResult = result;
    loadingEl.hidden = true;

    if (result.data.length === 0) {
      emptyEl.hidden = false;
      return;
    }

    renderTable(result.data);
    renderCards(result.data);
    renderPagination(result.pagination);

    if (state.mode === 'table') { tableWrap.hidden = false; } else { cardsGrid.hidden = false; }
  } catch (err) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    if (err instanceof ApiError) showToast(err.message, 'error');
  }
}

function renderTable(applications) {
  const tbody = document.getElementById('applications-tbody');
  clearNode(tbody);
  for (const app of applications) {
    const tr = el('tr', { tabindex: '0', role: 'button', 'aria-label': `View ${app.companyName} application` }, [
      el('td', {}, app.companyName),
      el('td', {}, app.jobTitle),
      el('td', {}, statusBadge(app.status)),
      el('td', {}, priorityLabel(app.priority)),
      el('td', {}, app.location || '—'),
      el('td', {}, formatDate(app.applicationDate)),
      el('td', {}, salaryRangeLabel(app) || '—'),
      el('td', {}, el('div', { class: 'row-actions' }, [
        el('button', {
          class: 'btn btn-sm btn-outline', onclick: (e) => { e.stopPropagation(); openApplicationForm(app); },
        }, 'Edit'),
        el('button', {
          class: 'btn btn-sm btn-danger', onclick: (e) => { e.stopPropagation(); handleDelete(app); },
        }, 'Delete'),
      ])),
    ]);
    tr.addEventListener('click', () => openDetail(app.id));
    tbody.appendChild(tr);
  }
}

function renderCards(applications) {
  const grid = document.getElementById('applications-cards');
  clearNode(grid);
  for (const app of applications) {
    const card = el('div', { class: 'app-card', tabindex: '0', role: 'button' }, [
      el('div', { class: 'app-card-header' }, [
        el('div', {}, [
          el('div', { class: 'app-card-title' }, app.companyName),
          el('div', { class: 'app-card-sub' }, app.jobTitle),
        ]),
        statusBadge(app.status),
      ]),
      el('div', { class: 'app-card-meta' }, [
        priorityLabel(app.priority),
        el('span', {}, app.location || 'Location unspecified'),
        el('span', {}, formatDate(app.applicationDate)),
      ]),
      salaryRangeLabel(app) ? el('div', { class: 'app-card-meta' }, salaryRangeLabel(app)) : null,
    ]);
    card.addEventListener('click', () => openDetail(app.id));
    grid.appendChild(card);
  }
}

function renderPagination(pagination) {
  const nav = document.getElementById('pagination');
  clearNode(nav);
  const { page, totalPages } = pagination;
  if (totalPages <= 1) { nav.hidden = true; return; }
  nav.hidden = false;

  const prev = el('button', { disabled: page <= 1 ? '' : undefined, onclick: () => { state.page = page - 1; loadApplications(); } }, '‹');
  nav.appendChild(prev);

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  for (let p = start; p <= end; p += 1) {
    const btn = el('button', {
      class: p === page ? 'is-active' : '',
      onclick: () => { state.page = p; loadApplications(); },
    }, String(p));
    nav.appendChild(btn);
  }

  const next = el('button', { disabled: page >= totalPages ? '' : undefined, onclick: () => { state.page = page + 1; loadApplications(); } }, '›');
  nav.appendChild(next);
}

// ------------------------------------------------------------------ detail view
async function openDetail(id) {
  const body = document.getElementById('detail-modal-body');
  body.innerHTML = '<p class="loading-state">Loading...</p>';
  openModal('detail-modal');
  try {
    const app = await applicationsApi.get(id);
    renderDetail(app);
  } catch (err) {
    body.innerHTML = '';
    body.appendChild(el('p', { class: 'form-message is-error' }, 'Could not load this application.'));
  }
}

function detailField(label, value) {
  return el('div', {}, [
    el('div', { class: 'detail-field-label' }, label),
    el('div', { class: 'detail-field-value' }, value || '—'),
  ]);
}

function renderDetail(app) {
  const body = document.getElementById('detail-modal-body');
  clearNode(body);
  document.getElementById('detail-modal-title').textContent = `${app.companyName} — ${app.jobTitle}`;

  const header = el('div', { class: 'detail-header' }, [
    el('div', {}, [statusBadge(app.status), ' ', priorityLabel(app.priority)]),
    el('div', { class: 'detail-actions' }, [
      el('select', {
        'aria-label': 'Change status',
        onchange: (e) => handleStatusChange(app.id, e.target.value),
      }, STATUSES.map((s) => el('option', { value: s, selected: s === app.status ? '' : undefined }, s))),
      el('button', { class: 'btn btn-outline btn-sm', onclick: () => openInterviewFormFor(app) }, [icon('plus'), ' Interview']),
      el('button', { class: 'btn btn-outline btn-sm', onclick: () => openFollowupFormFor(app) }, [icon('plus'), ' Follow-Up']),
      el('button', { class: 'btn btn-outline btn-sm', onclick: () => { closeModal('detail-modal'); openApplicationForm(app); } }, 'Edit'),
      el('button', { class: 'btn btn-danger btn-sm', onclick: () => handleDelete(app, true) }, 'Delete'),
    ]),
  ]);
  body.appendChild(header);

  const grid = el('div', { class: 'detail-grid' }, [
    detailField('Location', app.location),
    detailField('Job URL', app.jobUrl ? el('a', { href: app.jobUrl, target: '_blank', rel: 'noopener noreferrer' }, app.jobUrl) : null),
    detailField('Location type', app.locationType),
    detailField('Employment type', app.employmentType),
    detailField('Salary', salaryRangeLabel(app)),
    detailField('Application date', formatDate(app.applicationDate)),
    detailField('Job source', app.jobSource),
    detailField('Contact', app.contactPerson ? `${app.contactPerson}${app.contactEmail ? ' · ' + app.contactEmail : ''}` : app.contactEmail),
    detailField('Resume version', app.resumeVersion),
    detailField('Cover letter version', app.coverLetterVersion),
  ]);
  body.appendChild(grid);

  if (app.tags && app.tags.length) {
    body.appendChild(el('div', { class: 'detail-field-label' }, 'Tags'));
    body.appendChild(el('ul', { class: 'tag-list', style: 'margin-bottom:16px' }, app.tags.map((t) => el('li', { class: 'tag-pill' }, t))));
  }

  if (app.notes) {
    body.appendChild(el('div', { class: 'detail-field-label' }, 'Notes'));
    body.appendChild(el('p', {}, app.notes));
  }

  body.appendChild(el('h4', { class: 'detail-section-title' }, 'Interviews'));
  if (!app.interviews || app.interviews.length === 0) {
    body.appendChild(el('p', { class: 'mini-empty' }, 'No interviews scheduled yet.'));
  } else {
    body.appendChild(el('ul', { class: 'mini-list' }, app.interviews.map((iv) => el('li', { class: 'mini-item' }, [
      el('div', { class: 'mini-item-main' }, [
        el('div', { class: 'mini-item-title' }, `${iv.interviewType} — ${iv.result}`),
        el('div', { class: 'mini-item-sub' }, `${formatDate(iv.interviewDate)}${iv.interviewTime ? ' · ' + iv.interviewTime : ''}${iv.interviewer ? ' · ' + iv.interviewer : ''}`),
      ]),
      el('button', { class: 'btn btn-sm btn-outline', onclick: () => openInterviewFormFor(app, iv) }, 'Edit'),
    ]))));
  }

  body.appendChild(el('h4', { class: 'detail-section-title' }, 'Follow-Ups'));
  if (!app.followups || app.followups.length === 0) {
    body.appendChild(el('p', { class: 'mini-empty' }, 'No follow-ups scheduled yet.'));
  } else {
    body.appendChild(el('ul', { class: 'mini-list' }, app.followups.map((fu) => el('li', { class: 'mini-item' }, [
      el('div', { class: 'mini-item-main' }, [
        el('div', { class: 'mini-item-title' }, fu.followupType || 'Follow-up'),
        el('div', { class: 'mini-item-sub' }, `Due ${formatDate(fu.followupDate)}${fu.completed ? ' · Completed' : ''}`),
      ]),
      el('button', { class: 'btn btn-sm btn-outline', onclick: () => openFollowupFormFor(app, fu) }, 'Edit'),
    ]))));
  }

  body.appendChild(el('h4', { class: 'detail-section-title' }, 'Timeline'));
  if (!app.timeline || app.timeline.length === 0) {
    body.appendChild(el('p', { class: 'mini-empty' }, 'No activity recorded yet.'));
  } else {
    body.appendChild(el('ul', { class: 'timeline' }, app.timeline.slice().reverse().map((t) => el('li', {}, [
      el('div', { class: 'timeline-desc' }, t.description),
      el('div', { class: 'timeline-date' }, formatDate(t.createdAt)),
    ]))));
  }
}

async function handleStatusChange(id, status) {
  try {
    await ensureCsrfToken();
    await applicationsApi.changeStatus(id, status);
    showToast('Status updated.', 'success');
    openDetail(id);
    loadApplications();
    window.dispatchEvent(new CustomEvent('jat:data-changed'));
  } catch (err) {
    showToast(err.message || 'Could not update status.', 'error');
  }
}

async function handleDelete(app, fromDetail = false) {
  const ok = await confirmAction(`Delete the application to ${app.companyName} for ${app.jobTitle}? This cannot be undone.`);
  if (!ok) return;
  try {
    await ensureCsrfToken();
    await applicationsApi.remove(app.id);
    showToast('Application deleted.', 'success');
    if (fromDetail) closeModal('detail-modal');
    loadApplications();
    window.dispatchEvent(new CustomEvent('jat:data-changed'));
  } catch (err) {
    showToast(err.message || 'Could not delete application.', 'error');
  }
}

// ------------------------------------------------------------------ create/edit form
function openApplicationForm(app = null) {
  const form = document.getElementById('application-form');
  form.reset();
  clearFieldErrors(form);
  setFormMessage('application-form-message', '');
  document.getElementById('app-id').value = app ? app.id : '';
  document.getElementById('application-modal-title').textContent = app ? 'Edit Application' : 'Add Application';

  if (app) {
    form.companyName.value = app.companyName || '';
    form.jobTitle.value = app.jobTitle || '';
    form.jobUrl.value = app.jobUrl || '';
    form.location.value = app.location || '';
    form.locationType.value = app.locationType || 'onsite';
    form.employmentType.value = app.employmentType || 'full-time';
    form.salaryMin.value = app.salaryMin ?? '';
    form.salaryMax.value = app.salaryMax ?? '';
    form.currency.value = app.currency || 'USD';
    form.applicationDate.value = toDateInputValue(app.applicationDate);
    form.jobSource.value = app.jobSource || '';
    form.status.value = app.status || 'Wishlist';
    form.priority.value = app.priority || 'Medium';
    form.contactPerson.value = app.contactPerson || '';
    form.contactEmail.value = app.contactEmail || '';
    form.resumeVersion.value = app.resumeVersion || '';
    form.coverLetterVersion.value = app.coverLetterVersion || '';
    form.tagsInput.value = (app.tags || []).join(', ');
    form.notes.value = app.notes || '';
  } else {
    form.currency.value = 'USD';
    form.applicationDate.value = new Date().toISOString().slice(0, 10);
  }
  openModal('application-modal');
}

function buildApplicationPayload(form) {
  const data = new FormData(form);
  const tags = String(data.get('tagsInput') || '').split(',').map((t) => t.trim()).filter(Boolean);
  return {
    companyName: data.get('companyName')?.trim(),
    jobTitle: data.get('jobTitle')?.trim(),
    jobUrl: data.get('jobUrl')?.trim() || undefined,
    location: data.get('location')?.trim() || undefined,
    locationType: data.get('locationType'),
    employmentType: data.get('employmentType'),
    salaryMin: data.get('salaryMin') ? Number(data.get('salaryMin')) : null,
    salaryMax: data.get('salaryMax') ? Number(data.get('salaryMax')) : null,
    currency: (data.get('currency') || 'USD').toUpperCase(),
    applicationDate: data.get('applicationDate'),
    jobSource: data.get('jobSource') || undefined,
    status: data.get('status'),
    priority: data.get('priority'),
    contactPerson: data.get('contactPerson')?.trim() || undefined,
    contactEmail: data.get('contactEmail')?.trim() || undefined,
    notes: data.get('notes')?.trim() || undefined,
    resumeVersion: data.get('resumeVersion')?.trim() || undefined,
    coverLetterVersion: data.get('coverLetterVersion')?.trim() || undefined,
    tags,
  };
}

function initApplicationForm() {
  const form = document.getElementById('application-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    setFormMessage('application-form-message', '');
    const submitBtn = document.getElementById('application-form-submit');
    const id = document.getElementById('app-id').value;
    const payload = buildApplicationPayload(form);

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    try {
      await ensureCsrfToken();
      if (id) {
        await applicationsApi.update(id, payload);
        showToast('Application updated.', 'success');
      } else {
        await applicationsApi.create(payload);
        showToast('Application added.', 'success');
      }
      closeModal('application-modal');
      loadApplications();
      window.dispatchEvent(new CustomEvent('jat:data-changed'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details) {
        applyFieldErrors(form, err.details);
        setFormMessage('application-form-message', 'Please fix the highlighted fields.');
      } else if (err instanceof NetworkError || err instanceof ApiError) {
        setFormMessage('application-form-message', err.message);
      } else {
        setFormMessage('application-form-message', 'Something went wrong. Please try again.');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}

// ------------------------------------------------------------------ interview/followup quick-open
let interviewFormOpener = null;
let followupFormOpener = null;
export function registerInterviewFormOpener(fn) { interviewFormOpener = fn; }
export function registerFollowupFormOpener(fn) { followupFormOpener = fn; }
function openInterviewFormFor(app, interview = null) { if (interviewFormOpener) interviewFormOpener(app, interview); }
function openFollowupFormFor(app, followup = null) { if (followupFormOpener) followupFormOpener(app, followup); }

// ------------------------------------------------------------------ export / import
function initExportImport() {
  document.getElementById('export-btn').addEventListener('click', () => {
    const choice = window.confirm('Click OK to export as CSV, or Cancel to export as JSON.');
    const url = choice ? applicationsApi.exportCsvUrl() : applicationsApi.exportJsonUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = choice ? 'applications.csv' : 'applications.json';
    a.rel = 'noopener';
    a.click();
  });

  const importBtn = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file-input');
  const importConfirmBtn = document.getElementById('import-confirm-btn');
  let previewRows = [];

  importBtn.addEventListener('click', () => {
    document.getElementById('import-step-upload').hidden = false;
    document.getElementById('import-step-preview').hidden = true;
    importConfirmBtn.hidden = true;
    importFileInput.value = '';
    setFormMessage('import-message', '');
    openModal('import-modal');
  });

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files[0];
    if (!file) return;
    setFormMessage('import-message', '');
    try {
      const text = await file.text();
      const preview = await applicationsApi.importPreview(text);
      previewRows = preview.valid.map((r) => r.data);
      renderImportPreview(preview);
      document.getElementById('import-step-upload').hidden = true;
      document.getElementById('import-step-preview').hidden = false;
      importConfirmBtn.hidden = previewRows.length === 0;
    } catch (err) {
      setFormMessage('import-message', err.message || 'Could not read this CSV file.');
    }
  });

  importConfirmBtn.addEventListener('click', async () => {
    importConfirmBtn.disabled = true;
    try {
      await ensureCsrfToken();
      const result = await applicationsApi.importCommit(previewRows);
      showToast(`Imported ${result.imported} application(s). Skipped ${result.skipped} duplicate(s).`, 'success');
      closeModal('import-modal');
      loadApplications();
      window.dispatchEvent(new CustomEvent('jat:data-changed'));
    } catch (err) {
      showToast(err.message || 'Import failed.', 'error');
    } finally {
      importConfirmBtn.disabled = false;
    }
  });
}

function renderImportPreview(preview) {
  document.getElementById('import-summary').textContent =
    `${preview.totalRows} row(s) found — ${preview.valid.length} ready to import, ${preview.duplicates.length} duplicate(s), ${preview.invalid.length} invalid.`;

  const container = document.getElementById('import-preview-body');
  clearNode(container);
  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, [el('th', {}, 'Row'), el('th', {}, 'Company'), el('th', {}, 'Job Title'), el('th', {}, 'Status')])),
  ]);
  const tbody = el('tbody');

  for (const r of preview.valid) {
    tbody.appendChild(el('tr', {}, [el('td', {}, String(r.rowNumber)), el('td', {}, r.data.companyName), el('td', {}, r.data.jobTitle), el('td', {}, 'Ready')]));
  }
  for (const r of preview.duplicates) {
    tbody.appendChild(el('tr', { class: 'import-row-duplicate' }, [el('td', {}, String(r.rowNumber)), el('td', {}, r.data.companyName), el('td', {}, r.data.jobTitle), el('td', {}, 'Duplicate (skipped)')]));
  }
  for (const r of preview.invalid) {
    tbody.appendChild(el('tr', { class: 'import-row-invalid' }, [el('td', {}, String(r.rowNumber)), el('td', {}, r.data.companyName || '—'), el('td', {}, r.data.jobTitle || '—'), el('td', {}, r.errors.join('; '))]));
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

// ------------------------------------------------------------------ filters/search/sort/view toggle
function initToolbar() {
  document.getElementById('app-search').addEventListener('input', debounce((e) => {
    state.search = e.target.value.trim();
    state.page = 1;
    loadApplications();
  }, 400));

  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    state.page = 1;
    loadApplications();
  });

  document.querySelectorAll('.view-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-toggle-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.mode = btn.dataset.mode;
      document.getElementById('applications-table-wrap').hidden = state.mode !== 'table';
      document.getElementById('applications-cards').hidden = state.mode !== 'card';
    });
  });

  const filtersPanel = document.getElementById('filters-panel');
  document.getElementById('filters-toggle-btn').addEventListener('click', () => {
    filtersPanel.hidden = !filtersPanel.hidden;
  });

  document.getElementById('apply-filters-btn').addEventListener('click', () => {
    state.filters = {
      status: document.getElementById('filter-status').value || undefined,
      priority: document.getElementById('filter-priority').value || undefined,
      locationType: document.getElementById('filter-location-type').value || undefined,
      employmentType: document.getElementById('filter-employment-type').value || undefined,
      jobSource: document.getElementById('filter-source').value || undefined,
      dateFrom: document.getElementById('filter-date-from').value || undefined,
      dateTo: document.getElementById('filter-date-to').value || undefined,
      salaryMin: document.getElementById('filter-salary-min').value || undefined,
      salaryMax: document.getElementById('filter-salary-max').value || undefined,
    };
    state.page = 1;
    loadApplications();
  });

  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    state.filters = {};
    filtersPanel.querySelectorAll('select').forEach((s) => { s.value = ''; });
    filtersPanel.querySelectorAll('input').forEach((i) => { i.value = ''; });
    state.page = 1;
    loadApplications();
  });

  document.getElementById('retry-applications-btn').addEventListener('click', loadApplications);
  document.getElementById('quick-add-btn').addEventListener('click', () => openApplicationForm());
  document.getElementById('empty-add-btn').addEventListener('click', () => openApplicationForm());
}

export async function fetchApplicationsForSelect() {
  const firstPage = await applicationsApi.list({ page: 1, limit: 100, sortBy: 'company' });
  const applications = [...firstPage.data];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await applicationsApi.list({ page, limit: 100, sortBy: 'company' });
    applications.push(...result.data);
  }
  return applications;
}

export async function initApplicationsModule() {
  await populateStatusOptions();
  await populateJobSources();
  initToolbar();
  initApplicationForm();
  initExportImport();
}
