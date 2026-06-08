import http from 'k6/http';
import { check, sleep } from 'k6';

// Spike Test: Kiểm tra khả năng chịu tải của API Xem danh sách sự kiện khi hàng nghìn người refresh liên tục
export const options = {
  stages: [
    { duration: '10s', target: 100 }, // Ramping up fast
    { duration: '1m', target: 20000 }, // Spike to 20k users
    { duration: '3m', target: 20000 }, // Hold for 3 mins
    { duration: '10s', target: 0 },     // Ramp down
  ],
};

const BASE_URL = 'http://localhost:3000/api/v1';

export default function () {
  // Request 1: Get all concerts
  const res1 = http.get(`${BASE_URL}/concerts`);
  check(res1, {
    'GET /concerts status is 200': (r) => r.status === 200,
    'GET /concerts response time < 200ms': (r) => r.timings.duration < 200, // Ensure Redis Cache is working
  });

  sleep(1);

  // Request 2: Get specific concert (Assume 'cmc-concert-id' exists from seed data)
  // To make this dynamic, you could extract an ID from res1
  if (res1.status === 200 && res1.json().data && res1.json().data.length > 0) {
    const concertId = res1.json().data[0].id;
    const res2 = http.get(`${BASE_URL}/concerts/${concertId}`);
    
    check(res2, {
      'GET /concerts/:id status is 200': (r) => r.status === 200,
    });
  }
}
