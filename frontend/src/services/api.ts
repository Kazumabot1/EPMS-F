import axios from 'axios';
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

  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

    if (status === 502) {
      console.error(
        '502 Bad Gateway: Vite proxy cannot reach the Spring Boot API. Run EPMS on the port in vite.config (default 8081), ensure MySQL is up if the server requires it, or set VITE_API_PROXY_TARGET to your API base URL.',
      );
    }

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