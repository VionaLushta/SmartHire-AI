import api from './api';

export const resumeService = {
  list: () => api.get('/resumes'),
  upload: (payload) => api.post('/resumes', payload),
};
