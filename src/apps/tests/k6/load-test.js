import http from "k6/http";
import { check } from "k6";

// Cấu hình kịch bản test
export const options = {
  scenarios: {
    traffic_spike: {
      executor: "shared-iterations",
      vus: 100, // 100 người dùng ảo truy cập đồng thời
      iterations: 10000, // Tổng cộng 10.000 request (như bối cảnh mở bán)
      maxDuration: "1m", // Xảy ra trong vòng 1 phút
    },
  },
  // Tùy chọn in ra metrics tóm tắt
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)"],
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000/api/v1";

export default function () {
  // URL của API danh sách concert
  const url = `${BASE_URL}/concerts`;

  const params = {
    headers: {
      "Content-Type": "application/json",
      // Dùng IP giả lập nếu backend của bạn đã cấu hình trust proxy,
      // nếu không thì Rate Limiter sẽ block dựa trên IP gốc (localhost).
      // 'X-Forwarded-For': `192.168.1.${Math.floor(Math.random() * 255)}`
    },
  };

  const res = http.get(url, params);

  // Kiểm tra trạng thái trả về để phân loại
  check(res, {
    "is 200 OK (Thành công qua Cache/DB)": (r) => r.status === 200,
    "is 429 Too Many Requests (Bị chặn bởi Rate Limiter)": (r) =>
      r.status === 429,
    "is 5xx Error (Hệ thống sập/quá tải)": (r) => r.status >= 500,
  });
}
