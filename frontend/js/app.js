import { initAuthForms, tryResumeSession, logout, getCurrentUser } from './auth.js';
import { initModalChrome, initConfirmDialog } from './modals.js';
import { loadApplications, initApplicationsModule } from './applications.js';
import { initInterviewsModule, loadInterviews } from './interviews.js';
import { initFollowupsModule, loadFollowups } from './followups.js';
import { loadDashboard } from './dashboard.js';
import { loadAnalytics } from './analytics.js';
import { initSettingsModule, loadSettingsView, loadInitialTheme } from './settings.js';
import { notificationsApi, ensureCsrfToken } from './api.js';
import { el, clearNode, formatDateTime, showToast } from './utils.js';

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  applications: 'Applications',
  interviews: 'Interviews',
  followups: 'Follow-Ups',
  analytics: 'Analytics',
  settings: 'Settings',
};

const viewLoaders = {
  dashboard: loadDashboard,
  applications: loadApplications,
  interviews: loadInterviews,
  followups: loadFollowups,
  analytics: loadAnalytics,
  settings: loadSettingsView,
};

function showView(viewName) {
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.dataset.viewPanel !== viewName; });
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.view === viewName);
  });
  document.getElementById('topbar-title').textContent = VIEW_TITLES[viewName] || '';
  document.getElementById('sidebar').classList.remove('is-open');
  document.getElementById('sidebar-toggle').setAttribute('aria-expanded', 'false');

  const loader = viewLoaders[viewName];
  if (loader) loader();
}

function initNav() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
    location.reload();
  });
}

// --------------------------------------------------------------- notifications
async function refreshNotificationBadge() {
  try {
    const unread = await notificationsApi.list(true);
    const badge = document.getElementById('notif-badge');
    if (unread.length > 0) {
      badge.hidden = false;
      badge.textContent = unread.length > 99 ? '99+' : String(unread.length);
    } else {
      badge.hidden = true;
    }
  } catch { /* silent — notifications are non-critical */ }
}

function notificationItem(n) {
  return el('div', { class: `notif-item${n.isRead ? '' : ' is-unread'}` }, [
    el('div', {}, n.message),
    el('div', { style: 'color:var(--color-text-muted);font-size:0.75rem;margin-top:2px' }, formatDateTime(n.createdAt)),
  ]);
}

async function openNotificationsPanel() {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-btn');
  const isOpen = !panel.hidden;
  if (isOpen) {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    return;
  }
  panel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  panel.innerHTML = '<p class="notif-empty">Loading...</p>';
  try {
    const notifications = await notificationsApi.list(false);
    clearNode(panel);
    if (notifications.length === 0) {
      panel.appendChild(el('p', { class: 'notif-empty' }, 'No notifications yet.'));
      return;
    }
    for (const n of notifications) panel.appendChild(notificationItem(n));
    panel.appendChild(el('div', { class: 'notif-panel-footer' }, el('button', {
      class: 'btn btn-sm btn-outline',
      onclick: async () => {
        try {
          await ensureCsrfToken();
          await notificationsApi.markAllRead();
          panel.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          await openNotificationsPanel();
          await refreshNotificationBadge();
        } catch { showToast('Could not update notifications.', 'error'); }
      },
    }, 'Mark all as read')));
  } catch {
    clearNode(panel);
    panel.appendChild(el('p', { class: 'notif-empty' }, 'Could not load notifications.'));
  }
}

function initNotifications() {
  document.getElementById('notif-btn').addEventListener('click', openNotificationsPanel);
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.notif-wrap');
    if (!wrap.contains(e.target)) {
      document.getElementById('notif-panel').hidden = true;
      document.getElementById('notif-btn').setAttribute('aria-expanded', 'false');
    }
  });
  refreshNotificationBadge();
  setInterval(refreshNotificationBadge, 60000);
  window.addEventListener('jat:data-changed', refreshNotificationBadge);
}

// --------------------------------------------------------------- offline handling
function initOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  const update = () => { banner.hidden = navigator.onLine; };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// --------------------------------------------------------------- bootstrap
async function enterApp() {
  document.getElementById('auth-view').hidden = true;
  const shell = document.getElementById('app-shell');
  shell.hidden = false;

  await loadInitialTheme();
  await initApplicationsModule();
  initInterviewsModule();
  initFollowupsModule();
  await initSettingsModule();
  initNotifications();

  showView('dashboard');
}

async function bootstrap() {
  initModalChrome();
  initConfirmDialog();
  initNav();
  initOfflineBanner();

  initAuthForms({ onAuthenticated: enterApp });

  const user = await tryResumeSession();
  if (user) {
    await enterApp();
  } else {
    document.getElementById('auth-view').hidden = false;
  }
}

bootstrap();
