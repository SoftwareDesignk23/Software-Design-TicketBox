import axios from 'axios';
import { loadStoredTokens, refreshSession, clearStoredTokens, getAccessToken } from './auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const tokens = loadStoredTokens();
      if (tokens?.refreshToken) {
        try {
          const refreshed = await refreshSession(tokens.refreshToken);
          processQueue(null, refreshed.accessToken);
          originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          clearStoredTokens();
          window.location.href = '/'; // Redirect to login
        } finally {
          isRefreshing = false;
        }
      } else {
        isRefreshing = false;
        clearStoredTokens();
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
