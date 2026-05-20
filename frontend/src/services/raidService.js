import api from './api.js';

export const raidService = {
  list: (params) => api.get('/raids', { params }),
  create: (payload) => api.post('/raids', payload),
  update: (id, payload) => api.patch(`/raids/${id}`, payload),
  remove: (id) => api.delete(`/raids/${id}`)
};
