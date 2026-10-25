// Small modal helper: open/close by id, backdrop + ESC + close-button wiring,
// and a promise-based confirm() dialog used in place of window.confirm for
// destructive actions so styling stays consistent with the rest of the app.

let lastFocusedElement = null;

export function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  lastFocusedElement = document.activeElement;
  overlay.hidden = false;
  const focusable = overlay.querySelector('input, select, textarea, button');
  if (focusable) focusable.focus();
}

export function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.hidden = true;
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

export function initModalChrome() {
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay:not([hidden])').forEach((overlay) => closeModal(overlay.id));
  });
}

let confirmResolver = null;

export function initConfirmDialog() {
  document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    closeModal('confirm-modal');
    if (confirmResolver) { confirmResolver(false); confirmResolver = null; }
  });
  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    closeModal('confirm-modal');
    if (confirmResolver) { confirmResolver(true); confirmResolver = null; }
  });
}

export function confirmAction(message, title = 'Are you sure?') {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  openModal('confirm-modal');
  return new Promise((resolve) => { confirmResolver = resolve; });
}
