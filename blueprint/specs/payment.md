# Đặc tả hiện trạng: Thanh toán

## Mô tả
Backend tạo bản ghi `Payment` cho booking đang `PENDING_PAYMENT` và chọn provider `VNPAY` hoặc `MOMO`. Luồng hoàn tất booking/tạo ticket hiện chỉ được triển khai qua webhook VNPAY.

## VNPAY hiện tại
- Sinh URL thanh toán có HMAC SHA-512.
- Endpoint GET `/payments/webhook/vnpay_ipn` xác thực checksum, payment ID, amount và trạng thái `PENDING`.
- Giao dịch thành công cập nhật payment/booking, tạo ticket QR, gán gate và publish notification.
- Giao dịch thất bại hủy booking, hoàn ghế, inventory và coupon.
- Payment không còn `PENDING` sẽ không được xử lý lại.

## MoMo hiện tại
- Provider gọi endpoint test với retry và circuit breaker, nhưng trả mock URL để phục vụ demo.
- `verifyWebhook()` luôn trả `true` và chưa có controller/IPN MoMo để finalize booking.

## Giới hạn hiện tại
- API tạo payment không nhận idempotency key; gọi lặp tạo nhiều bản ghi payment.
- Chưa lưu `providerRef`, freshness hoặc replay token ngoài kiểm tra trạng thái payment.
- Không có cron expire riêng cho payment attempt; booking cron xử lý booking hết hạn.
- Circuit breaker là in-memory theo instance.
- Với booking không chọn ghế, code lấy show đầu tiên của concert để tạo ticket vì Booking không lưu `showId`.

## Điểm cần lưu ý
MoMo chưa phải luồng thanh toán hoàn chỉnh. Việc suy ra show đầu tiên cho vé GA có thể phát hành vé sai suất diễn.
