# Đặc tả: API Protection System

## Mô tả
Bảo vệ backend trước traffic spike và bot bằng rate limiting phân tán và anti-bot heuristics.

## Yêu cầu chi tiết
- Redis Lua script cho rate limit phân tán, atomic.
- Token bucket cho endpoint đọc, sliding window cho checkout/reserve/payment.
- Rate limit theo IP và user_id.
- Bot heuristic → CAPTCHA hoặc drop.
- Trả 429 kèm Retry-After, không forward request vào backend.

## Luồng chính
1. Gateway/backend nhận request.
2. Kiểm tra rate limit theo IP và user_id.
3. Nếu vượt ngưỡng → trả 429 với Retry-After.
4. Nếu nghi ngờ bot → route CAPTCHA hoặc drop.

## Kịch bản lỗi
- Redis rate limit down → bật chế độ bảo vệ DB (giảm QPS, waiting room).
- False positive bot → cho phép retry sau thời gian ngắn.

## Ràng buộc
- Token Bucket cho burst read.
- Sliding Window cho checkout/reserve/payment.
- Lua script Redis để atomic.

## Tiêu chí chấp nhận
- Request vượt ngưỡng bị chặn ở gateway.
- Retry-After luôn chính xác.
- Không làm nghẽn các endpoint admin nội bộ.
