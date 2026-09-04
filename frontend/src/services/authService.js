import api from './api';

export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
export const isGoogleOAuthConfigured = Boolean(googleClientId);
export const isGithubOAuthConfigured = Boolean(githubClientId);

function buildOAuthUrl(provider, { roleName = 'Candidate', source = 'login' } = {}) {
  if (provider === 'google' && !isGoogleOAuthConfigured) {
    throw new Error('Google Sign-In is not configured.');
  }
  if (provider === 'github' && !isGithubOAuthConfigured) {
    throw new Error('GitHub Sign-In is not configured.');
  }
  const baseUrl = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const path = provider === 'google' ? `/auth/google/login` : `/auth/oauth/${provider}/start`;
  const url = new URL(`${baseUrl}${path}`, window.location.origin);
  url.searchParams.set('role_name', roleName);
  url.searchParams.set('source', source);
  return url.toString();
}

export const authService = {
  login: (payload) => api.post('/auth/candidate/login', payload),
  adminLogin: (payload) => api.post('/auth/admin/login', payload),
  register: (payload) => api.post('/auth/candidate/register', payload),
  me: () => api.get('/auth/me'),
  refresh: (payload = {}) => api.post('/auth/refresh', payload),
  logout: (payload = {}) => api.post('/auth/logout', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  changePassword: (payload) => api.post('/auth/candidate/change-password', payload),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  googleOAuthUrl: (options) => buildOAuthUrl('google', options),
  githubOAuthUrl: (options) => buildOAuthUrl('github', options),
};
