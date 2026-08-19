import api from './api';

export const applicationService = {
  list: () => api.get('/applications'),
  create: (payload) => api.post('/applications', payload),
};
