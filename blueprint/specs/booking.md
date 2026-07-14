# Đặc tả hiện trạng: Booking và Inventory

## Mô tả
Booking giữ chỗ trong 15 phút, dùng Redis cho khóa tạm và PostgreSQL transaction để cập nhật ghế, số lượng vé và coupon.

## Luồng hiện tại
1. Client chọn show, ticket type và ghế nếu có.
2. Ghế có thể được khóa trong Redis theo user trong 15 phút.
3. Khi tạo booking, backend dùng mutex Redis theo show và transaction PostgreSQL.
4. `soldQuantity` được cập nhật có điều kiện theo giá trị cũ để phát hiện ghi đồng thời.
5. Booking được tạo ở trạng thái `PENDING_PAYMENT`; cron mỗi phút hủy booking hết hạn và hoàn ghế, inventory, coupon.
6. Thay đổi ghế được phát qua Socket.IO.
7. `idempotencyKey` của booking là tùy chọn và unique nếu client gửi.

## Giới hạn hiện tại
- Chưa có waiting queue, admission lease hoặc kiểm soát QPS theo concert.
- Inventory không decrement bằng Redis Lua; Redis chỉ giữ khóa, dữ liệu chính cập nhật trong PostgreSQL.
- Availability WebSocket không có version để client loại bỏ event cũ.
- Giới hạn người dùng chỉ tính vé `ISSUED`/`CHECKED_IN`, không tính booking đang pending.
- Mutex show hết hạn sau 5 giây và không gia hạn trong transaction dài.

## Điểm cần lưu ý
Booking không lưu `showId`. Với vé không chọn ghế, payment hiện suy ra show đầu tiên của concert, có thể phát hành vé sai suất diễn.
