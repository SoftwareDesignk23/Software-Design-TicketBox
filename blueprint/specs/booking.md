# Đặc tả: Booking & Inventory

## Mô tả
Hệ thống tạo booking giữ chỗ trong 15 phút, phối hợp Redis và PostgreSQL để kiểm tra ghế, cập nhật số lượng vé, áp dụng coupon và thông báo thay đổi trạng thái ghế theo thời gian thực.

## Yêu cầu chi tiết
- Chỉ người dùng có vai trò `AUDIENCE` được tạo booking.
- Show phải tồn tại và đã đến thời điểm mở bán.
- Booking phải có ít nhất một item với số lượng nguyên dương.
- `idempotencyKey` có thể được gửi để nhận lại booking đã tạo trước đó.
- Giá và currency được lấy từ ticket type trên server.
- Số vé người dùng đã sở hữu ở trạng thái `ISSUED` hoặc `CHECKED_IN` được kiểm tra theo `maxPerOrder`.
- Coupon hợp lệ được kiểm tra theo concert, trạng thái hoạt động và số lượt sử dụng.
- Redis mutex theo show được sử dụng trong quá trình tạo booking.
- Ghế và inventory được cập nhật trong PostgreSQL transaction.
- Booking mới có trạng thái `PENDING_PAYMENT` và thời hạn 15 phút.
- Trạng thái ghế được phát tới client qua Socket.IO.

## Luồng chính
1. Người dùng chọn show, ticket type, số lượng và ghế nếu có.
2. Client có thể khóa ghế trong Redis trong 15 phút.
3. Backend kiểm tra show, thời gian mở bán, ticket type, giới hạn vé và coupon.
4. Backend lấy mutex Redis theo show.
5. Trong transaction, hệ thống kiểm tra ghế, đánh dấu ghế `RESERVED` và tăng `soldQuantity` bằng conditional update.
6. Hệ thống tạo booking `PENDING_PAYMENT` cùng các booking item và thời điểm hết hạn.
7. Redis mutex và khóa chọn ghế được giải phóng sau khi booking được tạo.
8. Hệ thống phát sự kiện `seats_updated` cho các client trong room của show.

## Kịch bản lỗi
- Show không tồn tại → từ chối tạo booking.
- Chưa đến thời điểm mở bán → từ chối tạo booking.
- Ticket type không tồn tại → từ chối tạo booking.
- Số lượng vượt giới hạn người dùng hoặc inventory còn lại → từ chối tạo booking.
- Ghế không thuộc show hoặc không còn khả dụng → từ chối giữ ghế.
- Mutex theo show đang được request khác giữ → yêu cầu người dùng thử lại.
- Coupon không hợp lệ, hết lượt hoặc ngừng hoạt động → từ chối áp dụng coupon.
- Booking hết hạn → cron hủy booking và hoàn lại ghế, inventory cùng lượt sử dụng coupon.

## Ràng buộc
- Redis mutex tạo booking có TTL 5 giây.
- Khóa chọn ghế có TTL 15 phút và gắn với user.
- Booking pending có TTL 15 phút.
- Cron kiểm tra booking hết hạn mỗi phút.
- Conditional update của `soldQuantity` phải thành công trước khi tạo booking.
- Chỉ chủ booking được xem booking hoặc thay đổi coupon.

## Tiêu chí chấp nhận
- Booking hợp lệ được tạo ở trạng thái `PENDING_PAYMENT` với tổng tiền tính từ dữ liệu server.
- Idempotency key đã tồn tại trả lại booking tương ứng.
- Ghế đã được giữ không thể bị user khác khóa.
- Inventory không đủ làm booking bị từ chối.
- Booking hết hạn được hủy và tài nguyên được hoàn lại.
- Client nhận được cập nhật khi ghế được giữ hoặc giải phóng.
