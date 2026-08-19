import api from './api';

export const analyticsService = {
  overview: () => api.get('/ai/dashboard/overview'),
  trends: () => api.get('/ai/dashboard/trends'),
  skills: () => api.get('/ai/dashboard/skills'),
  candidate: (candidateId) => api.get(`/ai/dashboard/candidate/${candidateId}`),
  company: (companyId) => api.get(`/ai/dashboard/company/${companyId}`),
};
