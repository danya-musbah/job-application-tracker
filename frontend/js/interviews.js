import { interviewsApi, ApiError, ensureCsrfToken } from './api.js';
import { el, clearNode, formatDate, showToast, setFormMessage, applyFieldErrors, clearFieldErrors } from './utils.js';
import { openModal, closeModal, confirmAction } from './modals.js';
import { fetchApplicationsForSelect, registerInterviewFormOpener } from './applications.js';

async function populateApplicationSelect(selectedId = null) {
  const select = document.getElementById('interview-application');
  const applications = await fetchApplicationsForSelect();
  select.innerHTML = '';
  if (applications.length === 0) {
    select.appendChild(el('option', { value: '' }, 'No applications yet — add one first'));
    return;
  }
  for (const app of applications) {
    select.appendChild(el('option', { value: app.id, selected: app.id === selectedId ? '' : undefined }, `${app.companyName} — ${app.jobTitle}`));
  }
}

function openInterviewForm(app = null, interview = null) {
  const form = document.getElementById('interview-form');
  form.reset();
  clearFieldErrors(form);
  setFormMessage('interview-form-message', '');
  document.getElementById('interview-id').value = interview ? interview.id : '';
  document.getElementById('interview-modal-title').textContent = interview ? 'Edit Interview' : 'Schedule Interview';

  populateApplicationSelect(app ? app.id : (interview ? interview.applicationId : null))
    .then(() => {
      if (interview) {
        form.applicationId.value = interview.applicationId;
        form.interviewType.value = interview.interviewType;
        form.interviewDate.value = interview.interviewDate?.slice(0, 10);
        form.interviewTime.value = interview.interviewTime || '';
        form.interviewer.value = interview.interviewer || '';
        form.locationOrUrl.value = interview.locationOrUrl || '';
        form.prepNotes.value = interview.prepNotes || '';
        form.notes.value = interview.notes || '';
        form.result.value = interview.result || 'Pending';
      } else if (app) {
        form.applicationId.value = app.id;
        form.interviewDate.value = new Date().toISOString().slice(0, 10);
      }
    })
    .catch((err) => setFormMessage('interview-form-message', err.message || 'Could not load applications.'));

  openModal('interview-modal');
}

function buildInterviewPayload(form) {
  const data = new FormData(form);
  return {
    applicationId: Number(data.get('applicationId')),
    interviewType: data.get('interviewType'),
    interviewDate: data.get('interviewDate'),
    interviewTime: data.get('interviewTime') || undefined,
    interviewer: data.get('interviewer')?.trim() || undefined,
    locationOrUrl: data.get('locationOrUrl')?.trim() || undefined,
    prepNotes: data.get('prepNotes')?.trim() || undefined,
    notes: data.get('notes')?.trim() || undefined,
    result: data.get('result'),
  };
}

function initInterviewForm() {
  const form = document.getElementById('interview-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    setFormMessage('interview-form-message', '');
    const id = document.getElementById('interview-id').value;
    const payload = buildInterviewPayload(form);
    try {
      await ensureCsrfToken();
      if (id) {
        await interviewsApi.update(id, payload);
        showToast('Interview updated.', 'success');
      } else {
        await interviewsApi.create(payload);
        showToast('Interview scheduled.', 'success');
      }
      closeModal('interview-modal');
      loadInterviews();
      window.dispatchEvent(new CustomEvent('jat:data-changed'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details) {
        applyFieldErrors(form, err.details);
        setFormMessage('interview-form-message', 'Please fix the highlighted fields.');
      } else {
        setFormMessage('interview-form-message', err.message || 'Something went wrong.');
      }
    }
  });
}

function interviewCard(iv) {
  return el('div', { class: 'interview-card' }, [
    el('div', { class: 'app-card-header' }, [
      el('div', {}, [
        el('div', { class: 'app-card-title' }, iv.interviewType),
        el('div', { class: 'app-card-sub' }, `${formatDate(iv.interviewDate)}${iv.interviewTime ? ' · ' + iv.interviewTime : ''}`),
      ]),
      el('span', { class: `badge badge-${iv.result.toLowerCase()}` }, iv.result),
    ]),
    iv.interviewer ? el('p', { class: 'app-card-sub' }, `Interviewer: ${iv.interviewer}`) : null,
    iv.locationOrUrl ? el('p', { class: 'app-card-sub' }, iv.locationOrUrl) : null,
    el('div', { class: 'row-actions' }, [
      el('button', { class: 'btn btn-sm btn-outline', onclick: () => openInterviewForm(null, iv) }, 'Edit'),
      el('button', { class: 'btn btn-sm btn-danger', onclick: () => handleDeleteInterview(iv) }, 'Delete'),
    ]),
  ]);
}

async function handleDeleteInterview(iv) {
  const ok = await confirmAction(`Delete this ${iv.interviewType.toLowerCase()}? This cannot be undone.`);
  if (!ok) return;
  try {
    await ensureCsrfToken();
    await interviewsApi.remove(iv.id);
    showToast('Interview deleted.', 'success');
    loadInterviews();
    window.dispatchEvent(new CustomEvent('jat:data-changed'));
  } catch (err) {
    showToast(err.message || 'Could not delete interview.', 'error');
  }
}

export async function loadInterviews() {
  const list = document.getElementById('interviews-list');
  const empty = document.getElementById('interviews-empty');
  const upcomingOnly = document.getElementById('interviews-upcoming-only').checked;
  try {
    const interviews = await interviewsApi.list({ upcoming: upcomingOnly });
    clearNode(list);
    if (interviews.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    for (const iv of interviews) list.appendChild(interviewCard(iv));
  } catch (err) {
    showToast('Could not load interviews.', 'error');
  }
}

export function initInterviewsModule() {
  registerInterviewFormOpener((app, interview) => openInterviewForm(app, interview));
  document.getElementById('add-interview-btn').addEventListener('click', () => openInterviewForm());
  document.getElementById('interviews-upcoming-only').addEventListener('change', loadInterviews);
  initInterviewForm();
}
