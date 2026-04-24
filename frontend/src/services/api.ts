import axios from 'axios';
import { authStorage } from './authStorage';
import type { ApiEnvelope, AuthResponse } from '../types/auth';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const resolveQueue = (token: string | null) => {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      const refreshToken = authStorage.getRefreshToken();

      if (!refreshToken) {
        authStorage.clearSession();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken) => {
            if (!newToken) {
              reject(error);
              return;
            }

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const res = await axios.post<ApiEnvelope<AuthResponse>>('/api/auth/refresh', {
          refreshToken,
        });

        const payload = res.data.data;
        authStorage.setSession(payload);

        api.defaults.headers.common.Authorization = `Bearer ${payload.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${payload.accessToken}`;

        resolveQueue(payload.accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        resolveQueue(null);
        authStorage.clearSession();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;