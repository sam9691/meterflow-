import apiClient from './axios';

export const analyticsApi = {
  getDashboardStats: () => apiClient.get('/analytics/dashboard'),
  getRequestsOverTime: (params) => apiClient.get('/analytics/requests-over-time', { params }),
  getTopEndpoints: (params) => apiClient.get('/analytics/top-endpoints', { params }),
  getStatusCodes: (params) => apiClient.get('/analytics/status-codes', { params }),
  getLatencyStats: (params) => apiClient.get('/analytics/latency', { params }),
  getRecentActivity: (params) => apiClient.get('/analytics/activity', { params }),
  getApiAnalytics: (apiId, params) => apiClient.get(`/analytics/api/${apiId}`, { params }),
};
