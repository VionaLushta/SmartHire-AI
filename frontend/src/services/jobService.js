import api from './api';

export const jobService = {
  list: (params = {}) => api.get('/jobs', { params }),
  detail: (id) => api.get(`/jobs/${id}`),
  create: (payload) => api.post('/jobs', payload),
  update: (id, payload) => api.put(`/jobs/${id}`, payload),
  remove: (id) => api.delete(`/jobs/${id}`),
};
