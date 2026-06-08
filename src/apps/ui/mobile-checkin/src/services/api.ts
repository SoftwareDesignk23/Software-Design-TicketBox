import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.19:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('SecureStore error', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      await SecureStore.setItemAsync('token', response.data.accessToken);
    }
    return response.data;
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('token');
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
