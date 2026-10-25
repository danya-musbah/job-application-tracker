import { settingsApi, authApi, ApiError, ensureCsrfToken } from './api.js';
import { el, clearNode, showToast, setFormMessage, applyFieldErrors, clearFieldErrors } from './utils.js';
import { STATUSES } from './applications.js';

const THEME_STORAGE_KEY = 'jat-theme'; // used only as a same-session fallback before profile loads

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function populateDefaultStatusSelect(current) {
  const select = document.getElementById('pref-default-status');
  select.innerHTML = '';
  for (const status of STATUSES) {
    select.appendChild(el('option', { value: status, selected: status === current ? '' : undefined }, status));
  }
}

async function loadProfile() {
  const profile = await settingsApi.getProfile();
  document.getElementById('settings-name').value = profile.name;
  document.getElementById('settings-email').value = profile.email;
  populateDefaultStatusSelect(profile.defaultStatus);
  document.getElementById('pref-currency').value = profile.defaultCurrency;
  document.getElementById('pref-reminder-days').value = profile.reminderDays;
  document.getElementById('pref-items-per-page').value = profile.itemsPerPage;

  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.checked = input.value === profile.theme;
  });
  applyTheme(profile.theme);
  return profile;
}

async function loadJobSources() {
  const list = document.getElementById('job-sources-list');
  clearNode(list);
  const sources = await settingsApi.listJobSources();
  for (const s of sources) {
    list.appendChild(el('li', { class: 'tag-pill' }, s.name));
  }
}

function initProfileForm() {
  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFormMessage('profile-message', '');
    try {
      await ensureCsrfToken();
      await settingsApi.updateProfile({ name: form.name.value.trim(), email: form.email.value.trim() });
      setFormMessage('profile-message', 'Profile updated.', false);
      showToast('Profile updated.', 'success');
    } catch (err) {
      setFormMessage('profile-message', err.message || 'Could not update profile.');
    }
  });
}

function initPasswordForm() {
  const form = document.getElementById('password-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    setFormMessage('password-message', '');
    try {
      await ensureCsrfToken();
      await authApi.changePassword({
        currentPassword: form.currentPassword.value,
        newPassword: form.newPassword.value,
      });
      setFormMessage('password-message', 'Password updated.', false);
      showToast('Password updated.', 'success');
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details) {
        applyFieldErrors(form, err.details);
        setFormMessage('password-message', 'Please fix the highlighted fields.');
      } else {
        setFormMessage('password-message', err.message || 'Could not update password.');
      }
    }
  });
}

function initPreferencesForm() {
  const form = document.getElementById('preferences-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFormMessage('preferences-message', '');
    try {
      await ensureCsrfToken();
      await settingsApi.updatePreferences({
        defaultStatus: document.getElementById('pref-default-status').value,
        defaultCurrency: form.defaultCurrency.value.toUpperCase(),
        reminderDays: Number(form.reminderDays.value),
        itemsPerPage: Number(form.itemsPerPage.value),
      });
      setFormMessage('preferences-message', 'Preferences saved.', false);
      showToast('Preferences saved.', 'success');
    } catch (err) {
      setFormMessage('preferences-message', err.message || 'Could not save preferences.');
    }
  });
}

function initThemeControls() {
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener('change', async () => {
      const theme = input.value;
      applyTheme(theme);
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      try {
        await ensureCsrfToken();
        await settingsApi.updatePreferences({ theme });
      } catch (err) {
        showToast(err.message || 'Theme changed temporarily but could not be saved.', 'error');
      }
    });
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const checked = document.querySelector('input[name="theme"]:checked');
    if (checked && checked.value === 'system') applyTheme('system');
  });
}

function initJobSourceForm() {
  const form = document.getElementById('job-source-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-job-source');
    const name = input.value.trim();
    if (!name) return;
    try {
      await ensureCsrfToken();
      await settingsApi.addJobSource(name);
      input.value = '';
      showToast('Job source added.', 'success');
      loadJobSources().catch((err) => {
        showToast(`Source added, but the list could not refresh: ${err.message}`, 'error');
      });
    } catch (err) {
      showToast(err.message || 'Could not add job source.', 'error');
    }
  });
}

export async function initSettingsModule() {
  initProfileForm();
  initPasswordForm();
  initPreferencesForm();
  initThemeControls();
  initJobSourceForm();
}

export async function loadSettingsView() {
  try {
    await loadProfile();
    await loadJobSources();
  } catch (err) {
    showToast('Could not load settings.', 'error');
  }
}

export async function loadInitialTheme() {
  try {
    const profile = await settingsApi.getProfile();
    applyTheme(profile.theme);
  } catch {
    applyTheme('system');
  }
}
