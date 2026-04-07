import apiClient from './axios';

export const apisApi = {
  // APIs
  getMyApis: (params) => apiClient.get('/apis', { params }),
  getPublicApis: (params) => apiClient.get('/apis/public', { params }),
  getApiById: (id) => apiClient.get(`/apis/${id}`),
  createApi: (data) => apiClient.post('/apis', data),
  updateApi: (id, data) => apiClient.patch(`/apis/${id}`, data),
  deleteApi: (id) => apiClient.delete(`/apis/${id}`),
  getApiStats: (id) => apiClient.get(`/apis/${id}/stats`),

  // API Keys
  getApiKeys: (apiId, params) => apiClient.get(`/apis/${apiId}/keys`, { params }),
  createApiKey: (apiId, data) => apiClient.post(`/apis/${apiId}/keys`, data),

  // My Keys (all keys across APIs)
  getMyKeys: (params) => apiClient.get('/keys', { params }),
  revokeKey: (keyId) => apiClient.post(`/keys/${keyId}/revoke`),
  rotateKey: (keyId) => apiClient.post(`/keys/${keyId}/rotate`),
  updateKey: (keyId, data) => apiClient.patch(`/keys/${keyId}`, data),
};
