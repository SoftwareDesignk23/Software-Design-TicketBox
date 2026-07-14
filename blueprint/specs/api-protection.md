# Đặc tả: API Protection System

## Mô tả
Backend áp dụng rate limiting toàn cục cho các request HTTP bằng `@nestjs/throttler` nhằm giới hạn số lượng request từ mỗi client trong một khoảng thời gian.

## Yêu cầu chi tiết
- Rate limiter được đăng ký dưới dạng global guard.
- Mỗi client được phép tối đa 100 request trong 60 giây.
- Request HTTP được theo dõi và kiểm tra trước khi controller xử lý.
- WebSocket và các execution context không phải HTTP được bỏ qua bởi throttler guard.
- Request vượt giới hạn nhận HTTP status `429 Too Many Requests`.

## Luồng chính
1. Backend nhận request.
2. `AppThrottlerGuard` xác định request có thuộc HTTP context hay không.
3. Với request HTTP, guard kiểm tra bộ đếm request của client trong cửa sổ 60 giây.
4. Request trong giới hạn được chuyển tiếp đến controller.
5. Request vượt quá 100 lần trong cửa sổ bị từ chối với status 429.

## Kịch bản lỗi
- Client gửi quá số request cho phép → trả `429 Too Many Requests`.
- Execution context không phải HTTP → tiếp tục xử lý mà không áp dụng HTTP throttling.

## Ràng buộc
- Throttling áp dụng toàn cục cho các HTTP endpoint.
- Cửa sổ giới hạn là 60.000 mili giây.
- Giới hạn mặc định là 100 request cho mỗi cửa sổ.

## Tiêu chí chấp nhận
- HTTP request trong giới hạn được xử lý bình thường.
- HTTP request vượt giới hạn bị chặn trước khi vào controller.
- WebSocket không bị chặn bởi HTTP throttler guard.
