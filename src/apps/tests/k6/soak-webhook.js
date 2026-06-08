import http from 'k6/http';
import { check } from 'k6';
import crypto from 'k6/crypto';

// Soak Test: Bắn tải ổn định vào hệ thống trong thời gian dài để kiểm tra memory leak và webhook processing
export const options = {
  stages: [
    { duration: '2m', target: 500 }, // Ramping up to 500 requests/s
    { duration: '5m', target: 500 }, // Hold for 5 mins
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

const BASE_URL = 'http://localhost:3000/api/v1';

export default function () {
  // Generate random provider ref to simulate different payments
  const providerRef = `VNPAY_TEST_${Math.floor(Math.random() * 1000000000)}`;
  
  const payload = JSON.stringify({
    providerRef: providerRef,
    status: "SUCCESS",
    signature: "mock_signature"
  });
  
  const params = { 
    headers: { 'Content-Type': 'application/json' } 
  };
  
  const res = http.post(`${BASE_URL}/payments/webhook/VNPAY`, payload, params);
  
  // Chúng ta kỳ vọng 200 OK
  check(res, {
    'Webhook processed (200)': (r) => r.status === 200,
    'Bad request/Signature (400)': (r) => r.status === 400,
  });
}
