import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const baseURL = typeof rawBaseUrl === 'string' && rawBaseUrl.trim() ? rawBaseUrl : 'http://localhost:8080/api';

export const httpClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    return Promise.reject(error);
  },
);
