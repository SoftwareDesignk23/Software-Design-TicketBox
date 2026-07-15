# Đặc tả: Soát vé online, offline và đồng bộ

## Mô tả
Ứng dụng mobile cho phép nhân viên quét vé khi online hoặc offline. Mã QR là JWT ký bằng RS256 và được xác thực bằng public key cấu hình trong ứng dụng. Dữ liệu vé được tải về SQLite để phục vụ kiểm tra khi thiết bị không có kết nối Wi-Fi.

## Yêu cầu chi tiết
- Các API check-in yêu cầu JWT và vai trò `CHECK_IN_STAFF`, `ORGANIZER` hoặc `ADMIN`.
- Ứng dụng xác thực chữ ký QR bằng `EXPO_PUBLIC_JWT_PUBLIC_KEY`.
- Vé phải thuộc sự kiện đang được quét.
- Khi online, backend kiểm tra vé, trạng thái check-in và cổng được phân cho nhân viên.
- Khi offline, ứng dụng kiểm tra vé trong SQLite, trạng thái vé và cổng được phân cho nhân viên.
- Chỉ lượt quét offline có kết quả `VALID` được đưa vào hàng đợi đồng bộ.
- Ứng dụng sử dụng kết nối Wi-Fi khả dụng để thực hiện luồng online và đồng bộ.

## Chuẩn bị dữ liệu offline
1. Nhân viên đăng nhập và chọn sự kiện được phép truy cập.
2. Ứng dụng gọi `GET /checkin/tickets?eventId=...` để tải danh sách vé.
3. Mỗi vé được lưu trong SQLite với mã vé, sự kiện, cổng, người tham dự và trạng thái hiện tại.
4. Dữ liệu đã tải được dùng để kiểm tra và hiển thị vé khi offline.

## Luồng quét vé
1. Ứng dụng xác thực chữ ký JWT RS256 và đọc payload QR.
2. QR không hợp lệ hoặc không có `ticketId` bị từ chối.
3. Vé có `eventId` khác sự kiện đang quét bị cảnh báo sai sự kiện.
4. Nếu có Wi-Fi khả dụng, ứng dụng gọi `POST /checkin/verify`.
5. Nếu không có Wi-Fi, ứng dụng kiểm tra vé trong SQLite.

## Kiểm tra online
1. Backend tìm vé theo `ticketId` trong Prisma transaction.
2. Nếu nhân viên có `assignedGateId`, cổng của vé phải trùng cổng được phân công.
3. Vé có trạng thái `CHECKED_IN` bị từ chối.
4. Vé hợp lệ được ghi một `CheckInLog` có trạng thái `ACCEPTED`.
5. Vé được cập nhật thành `CHECKED_IN` cùng thời điểm check-in.
6. Ứng dụng cập nhật trạng thái vé trong SQLite và lưu log cục bộ đã đồng bộ.

## Kiểm tra offline
1. Vé phải tồn tại trong dữ liệu SQLite đã tải.
2. Vé chưa được mang trạng thái `CHECKED_IN`.
3. Nếu nhân viên có `assignedGateId`, dữ liệu vé phải có `gateId` và cổng này phải trùng cổng được phân công.
4. Vé hợp lệ được cập nhật thành `CHECKED_IN` trong SQLite.
5. Ứng dụng tạo log `VALID` chưa đồng bộ để gửi lên server khi có Wi-Fi.

## Đồng bộ dữ liệu
- Khi màn hình quét hoạt động, ứng dụng thử đồng bộ định kỳ mỗi 15 giây và cho phép nhân viên đồng bộ thủ công.
- `GET /checkin/sync-down?lastUpdated=...` trả về trạng thái mới nhất của các vé có log sau mốc thời gian đã gửi.
- Ứng dụng cập nhật trạng thái vé cục bộ từ dữ liệu sync-down.
- `POST /checkin/sync` nhận các log quét offline chưa đồng bộ.
- Backend kiểm tra lại sự tồn tại của vé, cổng nhân viên và các log check-in đã được chấp nhận.
- Quy tắc xử lý xung đột là lượt check-in hợp lệ đầu tiên được chấp nhận.
- Kết quả từng vé có thể là `SYNCED`, `INVALID_GATE`, `NOT_FOUND` hoặc `CONFLICT_ALREADY_CHECKED_IN`.
- Sau khi request đồng bộ thành công, ứng dụng đánh dấu các log đã gửi là đã đồng bộ.

## Kịch bản lỗi
- QR sai chữ ký hoặc không đọc được payload → từ chối quét.
- Vé thuộc sự kiện khác → cảnh báo sai sự kiện.
- Vé không tồn tại trong dữ liệu offline → cảnh báo chưa có dữ liệu vé.
- Vé đã check-in → từ chối quét.
- Vé không có dữ liệu cổng khi nhân viên được phân cổng → yêu cầu tải lại dữ liệu vé.
- Vé sai cổng → từ chối ở cả luồng online và offline.
- Vé đã được thiết bị khác check-in trước → trả `CONFLICT_ALREADY_CHECKED_IN` khi đồng bộ.
- Thiết bị có Wi-Fi nhưng không gọi được server → thông báo lỗi kết nối.

## Tiêu chí chấp nhận
- Vé hợp lệ được chấp nhận và chuyển thành `CHECKED_IN` khi quét online.
- Vé hợp lệ có trong SQLite được ghi nhận khi quét offline.
- Vé sai sự kiện, sai cổng hoặc đã check-in không được chấp nhận.
- Log hợp lệ được đồng bộ lên server khi thiết bị có Wi-Fi.
- Khi nhiều thiết bị gửi cùng một vé, backend chỉ chấp nhận lượt check-in hợp lệ đầu tiên.
