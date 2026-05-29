# TicketBox — Project Proposal

## Bối cảnh và vấn đề
Các concert lớn tại Việt Nam thu hút hàng chục nghìn người truy cập cùng thời điểm khi mở bán vé. Hệ thống hiện tại thường sập trong vài phút đầu, phát sinh tình trạng trừ tiền nhưng không có vé, và scalper dùng bot vét vé để bán lại. Nhiều kênh bán vé thủ công (Zalo OA, Google Form, chuyển khoản tay) thiếu minh bạch và dễ gian lận. TicketBox được xây dựng để số hóa toàn bộ quy trình bán vé, đảm bảo công bằng và vận hành ổn định trong tải cực lớn.

## Mục tiêu
- Số hóa end-to-end: từ mở bán, thanh toán, nhận e-ticket đến soát vé tại cổng.
- Chịu tải đột biến: tối thiểu 80.000 người/5 phút đầu mở bán, đặc biệt 70% dồn vào phút đầu.
- Công bằng và chống gian lận: chặn bot, giới hạn vé per-user, chống oversell.
- An toàn thanh toán: không trừ tiền hai lần, xử lý timeout ổn định, có cơ chế suy giảm chức năng hợp lý.
- Mở rộng kênh thông báo và tích hợp (Zalo OA/SMS trong tương lai) mà không thay đổi lớn.
- Tăng tiện ích sử dụng
## Người dùng và nhu cầu
- **Khán giả**: xem concert, chọn vé theo sơ đồ chỗ ngồi, thanh toán, nhận QR e-ticket, nhận thông báo.
- **Ban tổ chức**: tạo/điều chỉnh/hủy concert, cấu hình loại vé, xem doanh thu, quản lý nội dung và tài nguyên (artist bio, guest list).
- **Nhân sự soát vé**: quét QR tại cổng, làm việc được trong điều kiện mất mạng và đồng bộ về sau.

## Phạm vi
Bao gồm:
- Web App mua vé với sơ đồ ghế SVG và cập nhật vé theo thời gian thực.
- Admin Dashboard quản trị concert, cấu hình vé, thống kê doanh thu, audit log.
- Mobile App soát vé offline-first, đồng bộ sau khi có mạng.
- Booking/Reservation/Queueing chống tranh chấp vé, giới hạn per-user chính xác.
- Tích hợp thanh toán VNPAY/MoMo với idempotency, timeout, circuit breaker.
- Notification hệ thống: in-app, email, nhắc nhở trước sự kiện.
- AI Artist Bio: upload PDF, trích xuất, làm sạch, sinh bio bằng AI, lưu bản nháp.
- CSV guestlist import theo lịch + thủ công, xử lý lỗi/dup.
- Bảo vệ API: rate limiting + anti-bot.
- Caching Redis cho danh sách/chi tiết concert và số vé còn lại.

Không bao gồm:
- Hạ tầng production đầy đủ (K8s, autoscaling thực tế, monitoring cấp doanh nghiệp).
- Kết nối hệ thống ngân hàng thật ở môi trường production; chỉ mô phỏng/điều hướng theo chuẩn tích hợp VNPAY/MoMo trong môi trường dev.
- Hệ thống chống gian lận nâng cao ngoài phạm vi bot/rate limit (ví dụ device fingerprinting phức tạp, ML fraud).

## Rủi ro và ràng buộc
- Tải đột biến dẫn đến quá tải API và DB.
- Tranh chấp vé khi nhiều người đặt cùng lúc.
- Cổng thanh toán không ổn định dẫn đến treo giao dịch hoặc trừ tiền hai lần.
- Soát vé offline có nguy cơ trùng vé nếu không có cơ chế đồng bộ và conflict resolution.
- Import CSV một chiều phải chịu lỗi dữ liệu và trùng lặp mà không gián đoạn hệ thống.
- Caching sai TTL hoặc invalidation làm hiển thị sai vé còn lại.

