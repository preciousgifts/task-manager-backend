import api from './api.js';

export const taskService = {
  list: (params) => api.get('/tasks', { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (payload) => api.post('/tasks', payload),
  update: (id, payload) => api.patch(`/tasks/${id}`, payload),
  remove: (id) => api.delete(`/tasks/${id}`),
  comment: (id, text) => api.post(`/tasks/${id}/comments`, { text })
};
