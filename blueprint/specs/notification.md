# Đặc tả hiện trạng: Notification System

## Mô tả
Hệ thống hỗ trợ notification `IN_APP` và `EMAIL`, nhận sự kiện thanh toán qua RabbitMQ, gửi reminder T-24h bằng cron và phát notification in-app qua Socket.IO.

## Luồng hiện tại
- Payment success publish event `payment.success`.
- Consumer tạo đồng thời notification in-app và email.
- Mỗi notification được lưu PostgreSQL với trạng thái `PENDING`, sau đó `SENT` hoặc `FAILED`.
- Provider được gọi tối đa 3 lần với exponential backoff.
- Message consumer lỗi được đưa vào DLX/DLQ và handler thử publish lại tối đa theo `x-death`.
- Reminder chạy mỗi giờ, tìm show bắt đầu trong cửa sổ 24–25 giờ và gửi email cho chủ vé `ISSUED`.
- API cho phép lấy 50 notification gần nhất và đánh dấu đã đọc.

## Giới hạn hiện tại
- Không có idempotency theo event/recipient/channel; retry hoặc reminder có thể tạo bản ghi trùng.
- Không có bảng audit attempt; chỉ lưu trạng thái cuối và log console.
- Template/routing còn hard-code, chưa có user preference.
- In-app provider chỉ mock thành công; realtime được emit sau khi DB cập nhật.
- Chưa có SMS/Zalo provider.
- Không có unread-count endpoint riêng hoặc API hủy reminder đã lên lịch.

## Điểm cần lưu ý
Socket.IO cho phép client tự gửi `userId` để join room mà không xác thực socket, có nguy cơ xem notification realtime của người dùng khác.
