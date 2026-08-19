import api from './api';

export const savedJobService = {
  list: () => api.get('/saved-jobs'),
  create: (payload) => api.post('/saved-jobs', payload),
  remove: (jobId) => api.delete(`/saved-jobs/${jobId}`),
};
