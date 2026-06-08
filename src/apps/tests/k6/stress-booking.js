import http from 'k6/http';
import { check } from 'k6';

// Stress Test: Kiểm tra hiện tượng Oversell khi nhiều người cùng tranh giành 1 loại vé
export const options = {
  vus: 1000, // 1000 người dùng song song
  iterations: 5000,
};

const BASE_URL = 'http://localhost:3000/api/v1';

// Provide a valid USER_TOKEN and CONCERT_ID, TICKET_TYPE_ID before running
const TOKEN = 'YOUR_BEARER_TOKEN'; 

export default function () {
  const payload = JSON.stringify({
    concertId: "YOUR_CONCERT_ID",
    items: [{ ticketTypeId: "YOUR_TICKET_TYPE_ID", quantity: 2 }]
  });
  
  const params = { 
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${TOKEN}` 
    } 
  };
  
  const res = http.post(`${BASE_URL}/bookings/reservation`, payload, params);
  
  // Chúng ta kỳ vọng hệ thống sẽ từ chối bằng mã 400 (hết vé) hoặc 409 (conflict optimistic locking) sau khi vé đã bán hết.
  check(res, {
    'Success (201)': (r) => r.status === 201,
    'Sold out or Conflict (400/409)': (r) => r.status === 400 || r.status === 409,
    'Failed to acquire lock (429)': (r) => r.status === 429,
  });
}
