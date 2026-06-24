import apiClient from './apiClient';

export const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export async function fetchEvents() {
  const response = await apiClient.get('/concerts');
  // API structure might return { data: [...] } or just an array
  return response.data?.data || response.data || [];
}

export async function fetchEventById(eventId) {
  const response = await apiClient.get(`/concerts/${eventId}`);
  return response.data?.data || response.data || null;
}

// Authentication
export async function login(email, password) {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data; // { access_token, user }
}

export async function register(displayName, email, password) {
  const response = await apiClient.post('/auth/register', { displayName, email, password });
  return response.data; // { access_token, user }
}

// Bookings
export async function lockSeat(showSeatId) {
  const response = await apiClient.post('/bookings/seats/lock', { showSeatId });
  return response.data;
}

export async function unlockSeat(showSeatId) {
  const response = await apiClient.post('/bookings/seats/unlock', { showSeatId });
  return response.data;
}

export async function fetchBookings() {
  const response = await apiClient.get('/bookings');
  return response.data?.data || response.data || [];
}

export async function fetchBookingById(bookingId) {
  const response = await apiClient.get(`/bookings/${bookingId}`);
  return response.data?.data || response.data || null;
}

export async function applyCoupon(bookingId, code) {
  const response = await apiClient.post(`/bookings/${bookingId}/coupon`, { code });
  return response.data?.data || response.data;
}

// Renamed internally but keeping the same function name to avoid breaking many files
export async function createReservation(showId, items, idempotencyKey) {
  const response = await apiClient.post('/bookings/reservations', {
    showId,
    items,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });
  return response.data?.data || response.data;
}

export async function createPaymentUrl(bookingId, method, attendeeInfo) {
  const response = await apiClient.post('/payments/create', {
    bookingId,
    provider: method,
    returnUrl: `${window.location.origin}/payment/return`,
    attendeeInfo,
  });
  return response.data?.data || response.data;
}

// Tickets
export async function fetchTickets() {
  const response = await apiClient.get('/tickets');
  return response.data?.data || response.data || [];
}

// Notifications
export async function fetchNotifications() {
  const response = await apiClient.get('/notifications');
  return response.data?.data || response.data || [];
}

export async function markNotificationAsRead(notificationId) {
  const response = await apiClient.post(`/notifications/${notificationId}/read`);
  return response.data?.data || response.data || null;
}
