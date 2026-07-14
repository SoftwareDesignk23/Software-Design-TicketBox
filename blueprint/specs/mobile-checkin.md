# Đặc tả hiện trạng: Mobile Check-in App

## Mô tả
Ứng dụng Expo/React Native hỗ trợ tải vé về SQLite, xác thực QR JWT RS256, quét online hoặc offline và đồng bộ log qua Wi-Fi.

## Luồng hiện tại
- `CHECK_IN_STAFF`, `ORGANIZER`, `ADMIN` có thể đăng nhập ứng dụng.
- App gọi `/auth/me`, tải sự kiện và danh sách vé; public key QR lấy từ biến môi trường.
- Online chỉ được nhận diện khi có Wi-Fi. Khi online, app gọi `/checkin/verify`.
- Offline, app kiểm tra vé trong SQLite, trạng thái duplicate và gate của staff.
- Phản hồi dùng rung và thẻ trạng thái; không có âm thanh riêng.
- Cứ 15 giây app thử tải trạng thái và gửi log `VALID` chưa đồng bộ.

## Giới hạn hiện tại
- Không có event manifest hoặc key tải động.
- SQLite không mã hóa.
- Không có trạng thái connectivity `degraded` riêng.
- Không có retry backoff hoặc outcome được lưu theo từng scan.
- Khởi động lại hoàn toàn offline không hoạt động vì restore session gọi `/auth/me`.
- Không có cam kết/đo lường phản hồi dưới 1 giây.

## Điểm cần lưu ý
Sau khi request sync thành công, app đánh dấu toàn bộ log đã gửi là `synced` mà không xử lý các outcome `INVALID_GATE`, `NOT_FOUND` hoặc conflict riêng lẻ.
