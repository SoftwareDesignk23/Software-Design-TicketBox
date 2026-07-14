# Đặc tả hiện trạng: API Protection

## Mô tả
Backend dùng `@nestjs/throttler` làm global guard cho request HTTP.

## Cấu hình hiện tại
- Giới hạn chung: 100 request trong 60 giây.
- Guard bỏ qua context không phải HTTP.
- Throttler dùng storage mặc định trong tiến trình; Redis hiện không được nối vào rate limiter.

## Giới hạn hiện tại
- Không có Redis Lua, token bucket hoặc sliding window riêng theo endpoint.
- Không kết hợp khóa theo `IP + user_id` ở tầng ứng dụng.
- Không có anti-bot heuristic, CAPTCHA, waiting room hoặc chính sách riêng cho admin.
- Không có degradation mode khi Redis/DB gặp sự cố.
- Chưa có bằng chứng tải cho mục tiêu traffic cao.

## Điểm cần lưu ý
Rate limit trong tiến trình không đồng bộ giữa nhiều instance backend, nên không tạo giới hạn phân tán khi scale ngang.
