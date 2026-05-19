import api from './api.js';

export const userService = {
  list: () => api.get('/users'),
  update: (id, payload) => api.patch(`/users/${id}`, payload),
  remove: (id) => api.delete(`/users/${id}`)
};
