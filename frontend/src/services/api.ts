import axios from 'axios';
import { authStorage } from './authStorage';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();

  /*
    This project's API instance already has baseURL '/api'.

    Correct:
      api.get('/department-head/dashboard')
      -> /api/department-head/dashboard

    Old components sometimes do:
      api.get('/api/permissions')
      -> /api/api/permissions

    This fixes old calls without forcing you to edit every component now.
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

    if (status === 401) {
      authStorage.clearSession();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;