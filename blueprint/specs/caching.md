# Đặc tả: Caching cho Concert & Availability

## Mô tả
Áp dụng cache-aside Redis cho danh sách/chi tiết concert và số vé còn lại. Mục tiêu giảm tải DB dưới traffic cao và vẫn đảm bảo số vé hiển thị đủ chính xác để tránh bán quá.

## Yêu cầu chi tiết
- Cache-aside cho list/detail/availability.
- TTL phân tầng, availability TTL ngắn.
- Invalidate chủ động sau giao dịch.
- Thundering herd protection.
- Degradation mode khi Redis down.

## Luồng chính
1. Client gọi API list/detail concert.
2. API đọc Redis:
	- Cache hit → trả dữ liệu.
	- Cache miss → đọc DB, trả dữ liệu, ghi cache.
3. Khi có giao dịch thành công:
	- Emit event invalidate hoặc decrement availability.
4. Client nhận cập nhật qua WebSocket/SSE nếu có.

## Kịch bản lỗi
- Redis outage → fallback DB + tăng rate limit hoặc waiting room.
- Thundering herd → dùng distributed mutex hoặc stale-while-revalidate.
- Cache stale → TTL ngắn cho availability + invalidate chủ động.

## Ràng buộc
- Key chuẩn: `concert:list`, `concert:{id}:detail`, `concert:{id}:availability`.
- TTL gợi ý:
  - list: 30-60 phút.
  - detail: 15-30 phút.
  - availability: 10-30 giây hoặc invalidate ngay.
- Cache-aside bắt buộc cho list/detail.

## Tiêu chí chấp nhận
- Cache hit > 80% cho list/detail trong giờ cao điểm.
- Availability sai lệch không vượt TTL đã định.
- Redis down không làm API sập toàn bộ.
