# Đặc tả hiện trạng: Kiến trúc hệ thống

## Mô tả
Backend NestJS là modular monolith dùng PostgreSQL, Redis, RabbitMQ, cron và Socket.IO. Frontend gồm web khách hàng, admin dashboard và mobile check-in.

## Thành phần hiện có
- PostgreSQL/Prisma lưu dữ liệu giao dịch.
- Redis dùng cho cache concert, mutex booking và khóa ghế.
- RabbitMQ dùng cho payment-success notification, AI Bio job và CSV job.
- Socket.IO phát cập nhật trạng thái ghế và notification in-app.
- Cron giải phóng booking hết hạn, gửi reminder và chạy CSV nightly.
- Global throttler giới hạn 100 request/phút trong mỗi instance.

## Giới hạn hiện tại
- Chưa có waiting queue hoặc admission control.
- Inventory cập nhật trong PostgreSQL transaction, không dùng Redis atomic script.
- Event availability qua WebSocket không có version/order key.
- Không có outbox; publish RabbitMQ thất bại sau transaction có thể làm mất event notification.
- Redis/rate limit/circuit breaker chủ yếu giữ state theo instance hoặc phụ thuộc một Redis chung, chưa có bằng chứng vận hành ở quy mô 80.000 user/5 phút.
- Không có reconciliation job tổng quát giữa Redis và PostgreSQL.

## Điểm cần lưu ý
Mục tiêu high-throughput là định hướng, chưa phải mức đã được kiểm chứng bằng load test hoặc hạ tầng production.
