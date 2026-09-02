import api from './api';

export const resumeAdvisorService = {
  report: () => api.get('/resume-advisor/report'),
  regenerate: () => api.post('/resume-advisor/regenerate'),
};
