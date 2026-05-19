import api from './api.js';

export const dashboardService = {
  summary: () => api.get('/dashboard/summary')
};
