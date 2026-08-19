import api from './api';

export const jobDashboardService = {
  dashboard: (jobId) => api.get(`/jobs/${jobId}/dashboard`),
};
