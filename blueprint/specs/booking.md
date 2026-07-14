# Đặc tả: Booking & Inventory

## Mô tả
Đảm bảo đặt vé đúng, không oversell, có hàng đợi khi cao tải và cập nhật availability real-time.

## Yêu cầu chi tiết
- Atomic inventory reservation bằng Redis.
- Distributed lock cho finalize/expire và reconciliation.
- Optimistic lock ở DB để chặn stale write.
- Queue admission khi event bật queue hoặc quá tải.
- Admission lease có TTL, giới hạn số lần reserve.
- Sold-out broadcast và ngừng admit queue.
- Availability update có version để ignore stale.
- Enforce per-user limit tính cả pending + purchased.

## Luồng chính
1. User vào hàng đợi nếu event bật queue hoặc quá tải.
2. Khi được admit, tạo reservation với TTL.
3. Redis atomic decrement inventory.
4. Thanh toán thành công → finalize booking.
5. Publish availability updates.

## Kịch bản lỗi
- Concurrent reservation vượt tồn → reject.
- Reservation TTL hết hạn → release inventory.
- Finalize trễ → idempotent check.

## Ràng buộc
- Distributed lock cho finalize/expire.
- Optimistic lock ở DB.
- Enforce per-user limits.

## Tiêu chí chấp nhận
- Không oversell trong mọi điều kiện tải.
- Queue cho phép kiểm soát QPS.
- Availability luôn có version để ignore stale.
