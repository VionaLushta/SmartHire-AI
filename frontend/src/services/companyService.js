import api from './api';

export const companyService = {
  list: () => api.get('/companies'),
  detail: (id) => api.get(`/companies/${id}`),
};
