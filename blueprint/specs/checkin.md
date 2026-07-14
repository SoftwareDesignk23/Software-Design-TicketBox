# Đặc tả hiện trạng: Soát vé offline và đồng bộ

## Mô tả
Ứng dụng mobile cho phép nhân viên quét QR khi có hoặc không có Wi-Fi. QR là JWT ký RS256 và được xác thực bằng public key cấu hình trong `EXPO_PUBLIC_JWT_PUBLIC_KEY`. Trước khi làm việc offline, ứng dụng tải danh sách vé của sự kiện vào SQLite cục bộ.

## Dữ liệu và điều kiện hiện tại
- Public key được đóng gói qua biến môi trường của ứng dụng, không tải động theo manifest sự kiện.
- SQLite cục bộ lưu danh sách vé và log quét; cơ sở dữ liệu hiện không được mã hóa.
- Vé offline được kiểm tra theo `ticketId`, sự kiện, trạng thái đã check-in và cổng được phân cho nhân viên.
- Chỉ log `VALID` chưa đồng bộ được đưa vào hàng đợi gửi lên server.
- Ứng dụng xem thiết bị là online chỉ khi có kết nối Wi-Fi dùng được; mạng di động không kích hoạt luồng online.

## Luồng quét
1. Nhân viên đăng nhập khi có thể kết nối server và tải danh sách vé của sự kiện.
2. Khi quét QR, ứng dụng:
   - Xác thực chữ ký JWT RS256 bằng public key cục bộ.
   - Đọc `ticketId`, `eventId` và thông tin hiển thị trong payload.
   - Từ chối QR không hợp lệ hoặc vé thuộc sự kiện khác.
3. Nếu có Wi-Fi, ứng dụng gọi API `/checkin/verify`; backend kiểm tra vé, trạng thái check-in và cổng của nhân viên.
4. Nếu không có Wi-Fi, ứng dụng kiểm tra dữ liệu SQLite:
   - Vé phải tồn tại trong dữ liệu đã tải.
   - Vé chưa có trạng thái `CHECKED_IN`.
   - `gateId` của vé phải trùng `assignedGateId` của nhân viên nếu tài khoản được gán cổng.
   - Vé hợp lệ được đánh dấu `CHECKED_IN` cục bộ và tạo log `VALID` chưa đồng bộ.

## Luồng đồng bộ hiện tại
- Cứ 15 giây, ứng dụng thử đồng bộ khi có Wi-Fi.
- Ứng dụng tải thay đổi trạng thái từ server và gửi các log `VALID` chưa đồng bộ.
- Backend trả kết quả cho từng vé như `SYNCED`, `INVALID_GATE`, `NOT_FOUND` hoặc `CONFLICT_ALREADY_CHECKED_IN`.
- Backend áp dụng quy tắc vé đã có log `ACCEPTED` trước thì lần gửi sau bị trả conflict.
- Hiện tại ứng dụng chưa lưu kết quả riêng của từng log; sau khi request thành công, toàn bộ log đã gửi được đánh dấu `synced`.
- Sync hiện chưa có `scanId`, `batchId`, idempotency key hoặc retry backoff.

## Kịch bản lỗi
- QR sai chữ ký hoặc không đọc được payload → từ chối.
- Vé thuộc sự kiện khác → cảnh báo sai sự kiện.
- Vé đã check-in trên thiết bị → từ chối ngay.
- Vé sai cổng → từ chối ở cả online và offline.
- Vé đã được thiết bị khác check-in → backend trả `CONFLICT_ALREADY_CHECKED_IN` khi đồng bộ.
- Có Wi-Fi nhưng không gọi được server → hiển thị lỗi kết nối; không tự chuyển sang ghi nhận offline.
- Dữ liệu offline cũ chưa có `gateId` → yêu cầu tải lại dữ liệu vé.

## Giới hạn hiện tại
- Muốn chuẩn bị offline phải đăng nhập và tải dữ liệu vé trước khi mất kết nối.
- Khôi phục phiên khi mở lại ứng dụng vẫn gọi `/auth/me`, nên chưa hỗ trợ khởi động hoàn toàn khi offline.
- Log SQLite chỉ gồm `ticketId`, `deviceId`, `scannedAt`, `scanResult` và `synced`.
- Conflict được trả về trong response nhưng chưa có bảng conflict hoặc audit log conflict riêng.
