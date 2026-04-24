// Re-export the single authoritative axios instance so every module
// (services/* and api/*) shares the same baseURL, auth interceptor,
// and Vite-proxy configuration.
import api from '../services/api';

export const httpClient = api;
