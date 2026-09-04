import api from './api';

export const interviewService = {
  schedule: (payload) => api.post('/interviews', payload),
  listForCandidate: (candidateId) => api.get(`/interviews/candidate/${candidateId}`),
};
