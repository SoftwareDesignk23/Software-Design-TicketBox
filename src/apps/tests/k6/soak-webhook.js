import http from 'k6/http';
import { check } from 'k6';

// Soak Test: Bắn tải ổn định vào hệ thống trong thời gian dài để kiểm tra memory leak và webhook processing
export const options = {
  stages: [
    { duration: '2m', target: 500 }, // Ramping up to 500 virtual users
    { duration: '5m', target: 500 }, // Hold for 5 mins
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export default function () {
  // Generate a random transaction reference and verify invalid signatures are rejected.
  const transactionRef = `VNPAY_TEST_${Math.floor(Math.random() * 1000000000)}`;
  const query = [
    `vnp_TxnRef=${encodeURIComponent(transactionRef)}`,
    'vnp_ResponseCode=00',
    'vnp_Amount=10000000',
    'vnp_SecureHash=invalid_signature',
  ].join('&');

  const res = http.get(`${BASE_URL}/payments/webhook/vnpay_ipn?${query}`);
  
  // Chúng ta kỳ vọng 200 OK
  check(res, {
    'Webhook processed (200)': (r) => r.status === 200,
    'Invalid signature rejected (RspCode 97)': (r) => {
      const body = r.json();
      const data = body.data || body;
      return data.RspCode === '97';
    },
  });
}
