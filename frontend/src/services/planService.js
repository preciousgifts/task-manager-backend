import api from './api.js';

export const planService = {
  list: (params) => api.get('/plan-items', { params }),
  create: (payload) => api.post('/plan-items', payload),
  update: (id, payload) => api.patch(`/plan-items/${id}`, payload),
  remove: (id) => api.delete(`/plan-items/${id}`),
  comment: (id, text) => api.post(`/plan-items/${id}/comments`, { text })
};
