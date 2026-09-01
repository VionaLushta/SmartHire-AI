import api from './api';

function buildParams(filters = {}) {
  const params = {};
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }
    params[key] = value;
  });
  return params;
}

async function downloadBlob(response, fallbackName) {
  const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const disposition = response.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackName;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return filename;
}

export const reportService = {
  list: (filters = {}) => api.get('/reports', { params: buildParams(filters) }),
  analytics: (filters = {}) => api.get('/reports/analytics', { params: buildParams(filters) }),
  exportPdf: (filters = {}) => api.get('/reports/export/pdf', { params: buildParams(filters), responseType: 'blob' }),
  exportExcel: (filters = {}) => api.get('/reports/export/excel', { params: buildParams(filters), responseType: 'blob' }),
  exportCsv: (filters = {}) => api.get('/reports/export/csv', { params: buildParams(filters), responseType: 'blob' }),
  download: (reportId) => api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
  delete: (reportId) => api.delete(`/reports/${reportId}`),
  downloadBlob,
};
