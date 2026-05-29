# Đặc tả: High-Throughput & Event Architecture

## Mô tả
Các yêu cầu phi chức năng cho hệ thống throughput cao và event-driven notification.

## Yêu cầu chi tiết
- Reservation xử lý dưới tải cao, mục tiêu không oversell.
- Availability broadcast real-time qua WebSocket/SSE.
- Rate limit bảo vệ API trong phút đầu mở bán.
- Event notifications phải async qua broker.
- Retry + DLQ cho notification failures.

## Luồng chính
1. Inventory cập nhật qua Redis atomic.
2. Availability publish qua WebSocket/SSE.
3. Payment success emit event → notification pipeline.

## Kịch bản lỗi
- Redis lệch DB → reconciliation.
- Broker down → fallback retry và buffering.

## Ràng buộc
- 80.000 user/5 phút đầu.
- Event ordering theo version.
- Message broker bắt buộc cho notification.

## Tiêu chí chấp nhận
- Không oversell trong peak load.
- Availability realtime có version.
- Event notifications không block request chính.
