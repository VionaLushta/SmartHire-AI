import api from './api';

export const certificateService = {
  list: (params = {}) => api.get('/certificates', { params }),
  create: (payload) => api.post('/certificates', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  remove: (id) => api.delete(`/certificates/${id}`),
};
