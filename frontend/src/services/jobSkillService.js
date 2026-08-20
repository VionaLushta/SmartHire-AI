import api from './api';

export const jobSkillService = {
  list: (jobId) => api.get(`/jobs/${jobId}/skills`),
  create: (jobId, payload) => api.post(`/jobs/${jobId}/skills`, payload),
  update: (jobId, skillId, payload) => api.put(`/jobs/${jobId}/skills/${skillId}`, payload),
  remove: (jobId, skillId) => api.delete(`/jobs/${jobId}/skills/${skillId}`),
  candidate: (candidateId, params = {}) => api.get(`/candidates/${candidateId}/skills`, { params }),
  analytics: () => api.get('/analytics/skills'),
};
