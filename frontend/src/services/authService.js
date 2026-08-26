import api from './api';

export const authService = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  refresh: (payload = {}) => api.post('/auth/refresh', payload),
  logout: (payload = {}) => api.post('/auth/logout', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  googleOAuthUrl: (roleName = 'Candidate') => `${api.defaults.baseURL}/auth/oauth/google/start?role_name=${encodeURIComponent(roleName)}`,
  githubOAuthUrl: (roleName = 'Candidate') => `${api.defaults.baseURL}/auth/oauth/github/start?role_name=${encodeURIComponent(roleName)}`,
};
