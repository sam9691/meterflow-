import apiClient from './axios';

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.patch('/auth/profile', data),
  changePassword: (data) => apiClient.patch('/auth/change-password', data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  refreshToken: () => apiClient.post('/auth/refresh'),
};
