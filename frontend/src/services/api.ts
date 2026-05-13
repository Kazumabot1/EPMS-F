import axios, { AxiosHeaders } from 'axios';
import { authStorage } from './authStorage';

const api = axios.create({
  baseURL: '/api',
});

const isAuthEndpoint = (url?: string) => {
  if (!url) return false;

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
};

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();

  if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
    config.url = config.url.substring('/api'.length);
  }

  config.headers = AxiosHeaders.from(config.headers);

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  if (!token && !isAuthEndpoint(config.url)) {
    authStorage.clearSession();
    window.location.href = '/login';
    throw new Error('Missing authentication token. Please log in again.');
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? '';
    const hasToken = Boolean(authStorage.getAccessToken());
    const hasAuthorizationHeader = Boolean(error?.config?.headers?.Authorization);

    console.error(
      `API request failed: status=${status}, url=${url}, hasToken=${hasToken}, hasAuthorizationHeader=${hasAuthorizationHeader}`,
      error?.response?.data,
    );

    if (status === 401) {
      authStorage.clearSession();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (status === 403 && !hasToken) {
      authStorage.clearSession();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;