import api from './api';

export const candidateService = {
  dashboard: () => api.get('/candidate/dashboard'),
  profile: () => api.get('/candidate/profile'),
  get: (candidateId) => api.get(`/candidate/${candidateId}`),
  update: (payload) => api.put('/candidate/profile', payload),
};
