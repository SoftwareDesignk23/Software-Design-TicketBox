# TicketBox — Phạm vi dự án hiện tại

## Bối cảnh
TicketBox là hệ thống bán và soát vé concert phục vụ mục tiêu học tập/demo full-stack. Dự án mô phỏng quy trình từ quản lý concert, đặt chỗ, thanh toán, phát hành QR đến check-in online/offline.

## Người dùng
- **AUDIENCE**: đăng ký/đăng nhập, xem concert, chọn vé/ghế, tạo booking, thanh toán, xem booking và vé.
- **ORGANIZER**: quản lý concert thuộc organizer, ticket type, show, gate, artist, staff, AI Bio và CSV guestlist.
- **CHECK_IN_STAFF**: tải dữ liệu vé, quét QR theo gate, làm việc offline sau khi chuẩn bị dữ liệu và đồng bộ qua Wi-Fi.
- **ADMIN**: quản lý toàn hệ thống, organizer, staff, venue, concert và job.

## Phạm vi đã triển khai
- Web khách hàng, Admin Dashboard và Mobile Check-in.
- Concert, show, ticket type, seat, gate và coupon.
- Booking 15 phút, khóa ghế Redis, PostgreSQL transaction, cron hoàn tài nguyên và Socket.IO cập nhật ghế.
- VNPAY sandbox: tạo URL, xác thực IPN, cập nhật booking và phát hành QR ticket.
- MoMo ở mức test/mock, chưa hoàn tất IPN.
- Notification in-app/email qua RabbitMQ, retry/DLQ và reminder T-24h.
- Check-in QR RS256, SQLite offline, kiểm tra event/duplicate/gate và sync Wi-Fi.
- CSV guestlist job theo lịch/thủ công và AI Artist Bio job.
- Cache Redis cho list/detail concert; global throttling cố định.
- Upload tài nguyên qua Cloudinary.

## Ngoài phạm vi hoặc chưa hoàn chỉnh
- Hạ tầng production, Kubernetes/autoscaling, monitoring/tracing và load test quy mô lớn.
- Waiting room/queue admission, distributed rate limiting, CAPTCHA/anti-bot.
- MoMo production và chống replay/freshness đầy đủ cho payment.
- Read model analytics, audit log immutable và event outbox.
- Idempotency đầy đủ cho payment create, notification, CSV file và check-in batch.
- Offline cold start của mobile, encrypted SQLite và sync outcome theo từng scan.
- AI draft/review/publish và import-ledger/reprocess CSV chuyên biệt.

## Rủi ro chính
- Cạnh tranh booking được giảm bằng Redis lock và DB transaction nhưng chưa được kiểm chứng ở tải mục tiêu lớn.
- Booking không lưu `showId`; vé không có ghế có thể bị gán sang show đầu tiên.
- Một số API organizer thiếu ownership check; CSV URL chưa có allowlist.
- Notification Socket.IO chưa xác thực quyền join room.
- State phân tán và idempotency chưa đầy đủ khi chạy nhiều backend instance.

## Mục tiêu phát triển tiếp theo
Hoàn thiện tính đúng đắn và bảo mật của payment/authorization trước, sau đó bổ sung idempotency, observability, distributed protection và kiểm thử tải nếu đưa hệ thống gần production.
