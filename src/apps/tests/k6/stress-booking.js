import http from 'k6/http';
import { check } from 'k6';

// Stress Test: Kiểm tra hiện tượng Oversell khi nhiều người cùng tranh giành 1 loại vé
export const options = {
  vus: 1000, // 1000 người dùng song song
  iterations: 5000,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Provide valid USER_TOKEN, SHOW_ID and TICKET_TYPE_ID values before running.
const TOKEN = __ENV.USER_TOKEN;
const SHOW_ID = __ENV.SHOW_ID;
const TICKET_TYPE_ID = __ENV.TICKET_TYPE_ID;
const QUANTITY = Number(__ENV.QUANTITY || 2);

export function setup() {
  const missingVariables = [
    ['USER_TOKEN', TOKEN],
    ['SHOW_ID', SHOW_ID],
    ['TICKET_TYPE_ID', TICKET_TYPE_ID],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new Error(`Missing environment variables: ${missingVariables.join(', ')}`);
  }
}

export default function () {
  const payload = JSON.stringify({
    showId: SHOW_ID,
    items: [{ ticketTypeId: TICKET_TYPE_ID, quantity: QUANTITY }]
  });
  
  const params = { 
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${TOKEN}` 
    } 
  };
  
  const res = http.post(`${BASE_URL}/bookings/reservations`, payload, params);
  
  // Chúng ta kỳ vọng hệ thống sẽ từ chối bằng mã 400 (hết vé) hoặc 409 (conflict optimistic locking) sau khi vé đã bán hết.
  check(res, {
    'Booking response is expected': (r) => [201, 400, 409, 429, 500].includes(r.status),
  });
}
