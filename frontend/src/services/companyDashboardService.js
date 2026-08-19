import api from './api';

export const companyDashboardService = {
  dashboard: (companyId) => api.get(`/companies/${companyId}/dashboard`),
};
