import api from './api';

export const certificateService = {
  list: (params = {}) => api.get('/certificates', { params }),
  // Let Axios/browser set the multipart boundary automatically.
  create: (payload) => api.post('/certificates', payload, {
    headers: { 'Content-Type': undefined },
  }),
  remove: (id) => api.delete(`/certificates/${id}`),
  download: (id) => api.get(`/certificates/${id}/download`, { responseType: 'blob' }),
};
