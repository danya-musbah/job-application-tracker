// Shared, dependency-free utility helpers used across the app.

export function debounce(fn, wait = 350) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function formatDate(isoDateOrString) {
  if (!isoDateOrString) return '—';
  const d = new Date(isoDateOrString);
  if (Number.isNaN(d.getTime())) return isoDateOrString;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(isoDateOrString) {
  if (!isoDateOrString) return '—';
  const d = new Date(isoDateOrString.replace(' ', 'T') + (isoDateOrString.endsWith('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return isoDateOrString;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined || amount === '') return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function salaryRangeLabel(app) {
  const { salaryMin, salaryMax, currency } = app;
  if (salaryMin == null && salaryMax == null) return '—';
  if (salaryMin != null && salaryMax != null) {
    return `${formatCurrency(salaryMin, currency)} – ${formatCurrency(salaryMax, currency)}`;
  }
  return formatCurrency(salaryMin ?? salaryMax, currency);
}

export function slugifyStatus(status) {
  return String(status).toLowerCase().replace(/\s+/g, '-');
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value; // only used with trusted, static strings
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function icon(name, className = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  use.setAttribute('href', `icons/lucide.svg#${name}`);
  svg.appendChild(use);
  return svg;
}

export function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

let toastId = 0;
export function showToast(message, type = 'info', timeout = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const id = `toast-${toastId += 1}`;
  const toast = el('div', { class: `toast${type === 'error' ? ' is-error' : type === 'success' ? ' is-success' : ''}`, id }, message);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), timeout);
}

export function setFormMessage(elementOrId, message, isError = true) {
  const node = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!node) return;
  node.textContent = message || '';
  node.classList.toggle('is-error', !!message && isError);
  node.classList.toggle('is-success', !!message && !isError);
}

export function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach((n) => { n.textContent = ''; });
}

export function applyFieldErrors(form, details = []) {
  clearFieldErrors(form);
  for (const { field, message } of details) {
    const target = form.querySelector(`[data-error-for="${field}"]`);
    if (target) target.textContent = message;
  }
}

export function toDateInputValue(isoString) {
  if (!isoString) return '';
  return String(isoString).slice(0, 10);
}

export function escapeCsvGuardText(text) {
  // Not used for storage (we use textContent everywhere), kept only for
  // situations where we must build an HTML string from trusted static markup.
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
