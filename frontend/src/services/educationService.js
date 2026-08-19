import api from './api';

export const educationService = {
  list: (params = {}) => api.get('/education', { params }),
  detail: (id) => api.get(`/education/${id}`),
  create: (payload) => api.post('/education', payload),
  update: (id, payload) => api.put(`/education/${id}`, payload),
  remove: (id) => api.delete(`/education/${id}`),
};
