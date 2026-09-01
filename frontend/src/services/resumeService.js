import api from './api';

export const resumeService = {
  list: () => api.get('/resume'),
  upload: (payload) => api.post('/resume/upload', payload),
  remove: (id) => api.delete(`/resume/${id}`),
  download: (id) => api.get(`/resume/${id}/download`, { responseType: 'blob' }),
};
