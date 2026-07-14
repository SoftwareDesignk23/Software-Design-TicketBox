# Đặc tả: Notification System

## Mô tả
Hệ thống lưu và gửi thông báo qua hai kênh `IN_APP` và `EMAIL`, xử lý sự kiện thanh toán thành công bằng RabbitMQ, phát thông báo realtime qua Socket.IO và gửi email nhắc lịch concert trước 24 giờ.

## Yêu cầu chi tiết
- Admin hoặc Organizer có thể gửi notification qua API.
- Notification được lưu trong PostgreSQL trước khi gọi provider.
- Trạng thái notification gồm `PENDING`, `SENT` và `FAILED`.
- Provider được chọn theo channel `IN_APP` hoặc `EMAIL`.
- Lời gọi provider được retry tối đa 3 lần với exponential backoff.
- Notification in-app gửi thành công được phát qua namespace Socket.IO `/notifications`.
- Người dùng có thể lấy 50 notification gần nhất của mình.
- Người dùng có thể đánh dấu notification của mình là đã đọc.
- Consumer `payment.success` tạo đồng thời notification xác nhận booking qua email và in-app.
- Queue xử lý payment success sử dụng dead-letter exchange và dead-letter queue.
- Reminder cron chạy mỗi giờ để gửi email cho concert sắp bắt đầu trong 24 giờ.

## Luồng gửi thông báo
1. Hệ thống nhận dữ liệu gồm user, type, channel và payload.
2. Backend kiểm tra dữ liệu và sự tồn tại của user.
3. Notification được tạo ở trạng thái `PENDING`.
4. Factory chọn provider theo channel.
5. Provider gửi notification với cơ chế retry.
6. Thành công → cập nhật `SENT` và `sentAt`.
7. Thất bại → cập nhật `FAILED`.
8. Với kênh in-app thành công, gateway emit sự kiện `new_notification` vào room của user.

## Luồng sự kiện thanh toán
1. Consumer nhận message `payment.success` từ RabbitMQ.
2. Hệ thống tạo notification `BOOKING_CONFIRMED` cho hai kênh `IN_APP` và `EMAIL`.
3. Nếu xử lý message thất bại, consumer trả `Nack(false)` để chuyển message sang dead-letter exchange.
4. DLQ handler đọc số lần chết từ header `x-death`.
5. Message dưới 3 lần retry được chờ 5 giây rồi publish lại vào exchange chính.

## Luồng reminder
1. Cron chạy mỗi giờ.
2. Hệ thống tìm show `PUBLISHED` bắt đầu trong khoảng từ 24 đến 25 giờ tiếp theo.
3. Hệ thống lấy các chủ vé `ISSUED` khác nhau của từng show.
4. Mỗi chủ vé nhận một email `SYSTEM_ALERT` chứa thông tin concert và thời gian bắt đầu.

## Kịch bản lỗi
- Dữ liệu gửi notification không hợp lệ → từ chối yêu cầu.
- User nhận notification không tồn tại → từ chối yêu cầu.
- Provider gửi thất bại sau các lần retry → notification chuyển sang `FAILED`.
- Người dùng đánh dấu notification không thuộc sở hữu → từ chối yêu cầu.
- Consumer payment success lỗi → chuyển message sang DLQ.
- DLQ xử lý lỗi → trả `Nack(false)`.

## Ràng buộc
- API gửi thủ công yêu cầu JWT và role `ADMIN` hoặc `ORGANIZER`.
- API xem và đánh dấu đã đọc yêu cầu JWT.
- Email ưu tiên `attendeeEmail` trong payload, sau đó dùng email của user.
- Danh sách notification được sắp xếp mới nhất trước và giới hạn 50 bản ghi.
- Socket client tham gia room theo tên `user_{userId}`.
- DLQ dừng publish lại khi `x-death` đạt 3 lần.

## Tiêu chí chấp nhận
- Notification hợp lệ được lưu và có trạng thái gửi cuối cùng.
- Thanh toán thành công tạo cả email và notification in-app.
- Người dùng chỉ đọc và cập nhật notification của mình qua HTTP API.
- Notification in-app thành công được phát realtime tới room của user.
- Show sắp diễn ra tạo email reminder cho các chủ vé hợp lệ.
