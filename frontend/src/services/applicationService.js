import api from './api';

export const applicationService = {
  list: () => api.get('/applications'),
  create: (payload) => api.post('/applications', payload),
  updateStatus: (applicationId, status) => api.patch(`/applications/${applicationId}/status`, { status }),
  remove: (applicationId) => api.delete(`/applications/${applicationId}`),
};
