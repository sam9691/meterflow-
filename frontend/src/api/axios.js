import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// attach token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// handle token expiry - try to refresh once, then redirect to login
let refreshing = false;
let queue = [];

const drain = (err, token = null) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    refreshing = true;

    try {
      const res = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true });
      const { accessToken } = res.data.data;
      useAuthStore.getState().setAccessToken(accessToken);
      drain(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(original);
    } catch (e) {
      drain(e);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(e);
    } finally {
      refreshing = false;
    }
  }
);

export default apiClient;
