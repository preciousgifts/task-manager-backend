import api from './api.js';

export const updateService = {
  list: () => api.get('/updates')
};
