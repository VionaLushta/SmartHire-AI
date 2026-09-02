import api from './api';

export const contactMessageService = {
  create: (payload) => api.post('/contact-messages', payload),
  list: () => api.get('/contact-messages'),
  updateStatus: (id, status) => api.patch(`/contact-messages/${id}/status`, { status }),
};
