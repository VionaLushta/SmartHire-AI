import api from './api';

export const interviewService = {
  schedule: (payload) => api.post('/interviews', payload),
};
