import axios from 'axios';
import { authStorage } from './authStorage';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();

  /*
   * This project API instance already uses baseURL '/api'.
   *
   * Correct:
   *   api.get('/departments') -> /api/departments
   *
   * If old code calls:
   *   api.get('/api/departments') -> /api/api/departments
   *
   * This normalizes it safely.
   */
  if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
    config.url = config.url.substring('/api'.length);
  }

  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      authStorage.clearSession();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;