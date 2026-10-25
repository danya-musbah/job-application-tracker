import { followupsApi, ApiError, ensureCsrfToken } from './api.js';
import { el, clearNode, formatDate, showToast, setFormMessage, applyFieldErrors, clearFieldErrors } from './utils.js';
import { openModal, closeModal, confirmAction } from './modals.js';
import { fetchApplicationsForSelect, registerFollowupFormOpener } from './applications.js';

async function populateApplicationSelect(selectedId = null) {
  const select = document.getElementById('followup-application');
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

function openFollowupForm(app = null, followup = null) {
  const form = document.getElementById('followup-form');
  form.reset();
  clearFieldErrors(form);
  setFormMessage('followup-form-message', '');
  document.getElementById('followup-id').value = followup ? followup.id : '';
  document.getElementById('followup-modal-title').textContent = followup ? 'Edit Follow-Up' : 'Add Follow-Up';

  populateApplicationSelect(app ? app.id : (followup ? followup.applicationId : null))
    .then(() => {
      if (followup) {
        form.applicationId.value = followup.applicationId;
        form.followupDate.value = followup.followupDate?.slice(0, 10);
        form.followupType.value = followup.followupType || '';
        form.notes.value = followup.notes || '';
        document.getElementById('followup-completed').checked = !!followup.completed;
      } else if (app) {
        form.applicationId.value = app.id;
        form.followupDate.value = new Date().toISOString().slice(0, 10);
      }
    })
    .catch((err) => setFormMessage('followup-form-message', err.message || 'Could not load applications.'));

  openModal('followup-modal');
}

function buildFollowupPayload(form) {
  const data = new FormData(form);
  return {
    applicationId: Number(data.get('applicationId')),
    followupDate: data.get('followupDate'),
    followupType: data.get('followupType')?.trim() || 'General',
    notes: data.get('notes')?.trim() || undefined,
    completed: document.getElementById('followup-completed').checked,
  };
}

function initFollowupForm() {
  const form = document.getElementById('followup-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    setFormMessage('followup-form-message', '');
    const id = document.getElementById('followup-id').value;
    const payload = buildFollowupPayload(form);
    try {
      await ensureCsrfToken();
      if (id) {
        await followupsApi.update(id, payload);
        showToast('Follow-up updated.', 'success');
      } else {
        await followupsApi.create(payload);
        showToast('Follow-up scheduled.', 'success');
      }
      closeModal('followup-modal');
      loadFollowups();
      window.dispatchEvent(new CustomEvent('jat:data-changed'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details) {
        applyFieldErrors(form, err.details);
        setFormMessage('followup-form-message', 'Please fix the highlighted fields.');
      } else {
        setFormMessage('followup-form-message', err.message || 'Something went wrong.');
      }
    }
  });
}

function followupItem(fu) {
  const isOverdue = !fu.completed && new Date(fu.followupDate) < new Date(new Date().toDateString());
  return el('li', { class: 'mini-item' }, [
    el('div', { class: 'mini-item-main' }, [
      el('div', { class: 'mini-item-title' }, fu.followupType || 'Follow-up'),
      el('div', { class: 'mini-item-sub' }, `Due ${formatDate(fu.followupDate)}${fu.completed ? ' · Completed' : isOverdue ? ' · Overdue' : ''}`),
    ]),
    el('div', { class: 'row-actions' }, [
      !fu.completed ? el('button', { class: 'btn btn-sm btn-outline', onclick: () => markCompleted(fu) }, 'Mark done') : null,
      el('button', { class: 'btn btn-sm btn-outline', onclick: () => openFollowupForm(null, fu) }, 'Edit'),
      el('button', { class: 'btn btn-sm btn-danger', onclick: () => handleDeleteFollowup(fu) }, 'Delete'),
    ]),
  ]);
}

async function markCompleted(fu) {
  try {
    await ensureCsrfToken();
    await followupsApi.update(fu.id, { completed: true });
    showToast('Follow-up marked as completed.', 'success');
    loadFollowups();
    window.dispatchEvent(new CustomEvent('jat:data-changed'));
  } catch (err) {
    showToast(err.message || 'Could not update follow-up.', 'error');
  }
}

async function handleDeleteFollowup(fu) {
  const ok = await confirmAction('Delete this follow-up? This cannot be undone.');
  if (!ok) return;
  try {
    await ensureCsrfToken();
    await followupsApi.remove(fu.id);
    showToast('Follow-up deleted.', 'success');
    loadFollowups();
    window.dispatchEvent(new CustomEvent('jat:data-changed'));
  } catch (err) {
    showToast(err.message || 'Could not delete follow-up.', 'error');
  }
}

export async function loadFollowups() {
  const list = document.getElementById('followups-list');
  const empty = document.getElementById('followups-empty');
  const status = document.getElementById('followups-filter').value;
  try {
    const followups = await followupsApi.list({ status: status || undefined });
    clearNode(list);
    if (followups.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    for (const fu of followups) list.appendChild(followupItem(fu));
  } catch (err) {
    showToast('Could not load follow-ups.', 'error');
  }
}

export function initFollowupsModule() {
  registerFollowupFormOpener((app, followup) => openFollowupForm(app, followup));
  document.getElementById('add-followup-btn').addEventListener('click', () => openFollowupForm());
  document.getElementById('followups-filter').addEventListener('change', loadFollowups);
  initFollowupForm();
}
