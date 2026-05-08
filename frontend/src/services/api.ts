import axios from 'axios';
import { authStorage } from './authStorage';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();

  /*
   * This project API instance already has baseURL '/api'.
   *
   * Correct:
   *   api.get('/employees') -> /api/employees
   *
   * Old code sometimes calls:
   *   api.get('/api/employees') -> /api/api/employees
   *
   * This fixes old calls safely.
   */
  if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
    config.url = config.url.substring('/api'.length);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    /*
     * 401 definitely means unauthenticated.
     * 403 can mean either invalid auth OR wrong role,
     * so AuthContext verifies /auth/me separately.
     */
    if (status === 401) {
      authStorage.clearSession();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;