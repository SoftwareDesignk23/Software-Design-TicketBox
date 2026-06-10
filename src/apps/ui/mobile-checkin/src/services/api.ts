import axios from 'axios';
import { deleteToken, getToken, setToken } from './tokenStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.19:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Attach access token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Token storage read error', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response interceptors ----

// 1) Unwrap the { code, message, data } envelope
api.interceptors.response.use(
  (response) => {
    // Backend wraps all responses in { code, message, data }
    if (response.data && response.data.code === 'SUCCESS' && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => Promise.reject(error)
);

// 2) Auto-refresh when receiving 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getToken('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        // Use raw axios to avoid the interceptor loop
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const responseData = res.data?.data || res.data;
        const newAccessToken = responseData.accessToken;
        const newRefreshToken = responseData.refreshToken;

        await setToken('accessToken', newAccessToken);
        if (newRefreshToken) {
          await setToken('refreshToken', newRefreshToken);
        }

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await deleteToken('accessToken');
        await deleteToken('refreshToken');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ---- Service exports ----

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    // After unwrapping: response.data = { accessToken, refreshToken, user, ... }
    const { accessToken, refreshToken } = response.data;
    if (accessToken) {
      await setToken('accessToken', accessToken);
    }
    if (refreshToken) {
      await setToken('refreshToken', refreshToken);
    }
    return response.data;
  },
  logout: async () => {
    await deleteToken('accessToken');
    await deleteToken('refreshToken');
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    // After unwrapping: response.data = { id, displayName, role, ... }
    return response.data;
  }
};

export const checkinService = {
  getEvents: async () => {
    const response = await api.get('/checkin/events');
    return response.data;
  },
  getTickets: async (eventId: string) => {
    const response = await api.get(`/checkin/tickets?eventId=${eventId}`);
    return response.data;
  },
  syncDown: async (lastUpdated: string) => {
    const response = await api.get(`/checkin/sync-down?lastUpdated=${lastUpdated}`);
    return response.data;
  },
  verifyTicket: async (ticketId: string) => {
    const response = await api.post('/checkin/verify', { ticketId });
    return response.data;
  },
  syncCheckins: async (logs: any[]) => {
    const response = await api.post('/checkin/sync', { logs });
    return response.data;
  }
};
