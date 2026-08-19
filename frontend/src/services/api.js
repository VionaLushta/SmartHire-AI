import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const AUTH_STORAGE_KEY = 'smarthire-auth';

export function readStoredAuth() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeStoredAuth(payload) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!payload) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

api.interceptors.request.use((config) => {
  const persistedAuth = readStoredAuth();
  const token = persistedAuth?.token ?? null;

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  if (!navigator.onLine) {
    return Promise.reject(new Error('You appear to be offline. Please check your connection and try again.'));
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const message = error.message || 'Request failed';

    if (!navigator.onLine) {
      return Promise.reject(new Error('You appear to be offline. Please check your connection and try again.'));
    }

    if (status === 401 || status === 403) {
      clearStoredAuth();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }

    if (
      !originalRequest.__retried &&
      [408, 429, 500, 502, 503, 504].includes(status)
    ) {
      originalRequest.__retried = true;
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      return api(originalRequest);
    }

    if (error.code === 'ECONNABORTED' || status === 408) {
      return Promise.reject(new Error('The request timed out. Please try again.'));
    }

    if (typeof message === 'string' && message.includes('Network Error')) {
      return Promise.reject(new Error('Network error. Please check your connection and try again.'));
    }

    return Promise.reject(error);
  },
);

export default api;
