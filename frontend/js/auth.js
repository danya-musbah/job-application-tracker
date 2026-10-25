import { authApi, ApiError, NetworkError, ensureCsrfToken } from './api.js';
import { setFormMessage, applyFieldErrors, clearFieldErrors, showToast } from './utils.js';

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
}

async function withSubmitState(button, fn) {
  const original = button.querySelector('.btn-label')?.textContent || button.textContent;
  button.disabled = true;
  button.textContent = 'Please wait...';
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function handleAuthError(err, form, messageId) {
  if (err instanceof ApiError) {
    if (err.status === 422 && err.details) {
      applyFieldErrors(form, err.details);
      setFormMessage(messageId, 'Please fix the highlighted fields.');
    } else {
      setFormMessage(messageId, err.message);
    }
  } else if (err instanceof NetworkError) {
    setFormMessage(messageId, err.message);
  } else {
    setFormMessage(messageId, 'Something went wrong. Please try again.');
  }
}

export function initAuthForms({ onAuthenticated }) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('is-active'); tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('is-active'); tabRegister.setAttribute('aria-selected', 'false');
    loginForm.hidden = false; registerForm.hidden = true;
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('is-active'); tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('is-active'); tabLogin.setAttribute('aria-selected', 'false');
    registerForm.hidden = false; loginForm.hidden = true;
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(loginForm);
    setFormMessage('login-message', '');
    const submitBtn = document.getElementById('login-submit');
    const formData = new FormData(loginForm);
    try {
      await ensureCsrfToken();
      const { user } = await withSubmitState(submitBtn, () => authApi.login({
        email: formData.get('email'),
        password: formData.get('password'),
      }));
      setCurrentUser(user);
      onAuthenticated(user);
    } catch (err) {
      handleAuthError(err, loginForm, 'login-message');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(registerForm);
    setFormMessage('register-message', '');
    const submitBtn = document.getElementById('register-submit');
    const formData = new FormData(registerForm);
    try {
      await ensureCsrfToken();
      const { user } = await withSubmitState(submitBtn, () => authApi.register({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
      }));
      setCurrentUser(user);
      showToast('Account created — welcome!', 'success');
      onAuthenticated(user);
    } catch (err) {
      handleAuthError(err, registerForm, 'register-message');
    }
  });
}

export async function tryResumeSession() {
  try {
    const { user } = await authApi.me();
    setCurrentUser(user);
    return user;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await authApi.logout();
  } catch {
    /* proceed with client-side logout regardless */
  }
  setCurrentUser(null);
}
