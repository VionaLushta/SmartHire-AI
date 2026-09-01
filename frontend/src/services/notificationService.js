import api from './api';

export const notificationService = {
  list: (params = {}) => api.get('/notifications', { params }),
  markRead: (id) => api.post(`/notifications/read/${id}`),
  markAllRead: () => api.post('/notifications/read-all'),
};
