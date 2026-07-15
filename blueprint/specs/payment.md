# Đặc tả: Thanh toán

## Mô tả
Hệ thống cho phép khán giả tạo giao dịch thanh toán cho booking đang chờ thanh toán qua VNPAY hoặc MoMo. Kết quả thanh toán VNPAY được xử lý để cập nhật booking, phát hành vé QR và gửi thông báo.

## Yêu cầu chi tiết
- Chỉ người dùng có vai trò `AUDIENCE` được tạo payment.
- Payment phải được tạo từ booking thuộc người dùng hiện tại và có trạng thái `PENDING_PAYMENT`.
- Số tiền và loại tiền tệ của payment được lấy từ booking trên server.
- Hỗ trợ hai provider là `VNPAY` và `MOMO`.
- Thông tin người tham dự có thể được cập nhật vào booking khi tạo payment.
- URL thanh toán VNPAY được ký bằng HMAC SHA-512.
- VNPAY IPN kiểm tra chữ ký, payment, số tiền và trạng thái trước khi xử lý.
- Yêu cầu tới provider sử dụng timeout và circuit breaker; yêu cầu MoMo có cơ chế retry.

## Luồng tạo payment
1. Khán giả gửi `bookingId`, `provider`, cùng `returnUrl` và thông tin người tham dự nếu có.
2. Backend kiểm tra quyền sở hữu và trạng thái booking.
3. Backend cập nhật thông tin người tham dự nếu được cung cấp.
4. Hệ thống tạo payment ở trạng thái `PENDING`.
5. Provider tạo URL thanh toán.
6. API trả về `paymentId` và `paymentUrl`.

## Luồng xử lý VNPAY IPN
1. VNPAY gửi callback tới `GET /payments/webhook/vnpay_ipn`.
2. Backend xác thực chữ ký HMAC SHA-512.
3. Backend tìm payment VNPAY, kiểm tra số tiền và trạng thái hiện tại.
4. Mã phản hồi `00` được xử lý là thành công; các mã khác được xử lý là thất bại.
5. Payment và booking được cập nhật trong transaction.
6. Khi thành công, booking chuyển sang `PAID`, vé được phát hành và sự kiện thông báo được gửi.
7. Khi thất bại, booking chuyển sang `CANCELLED`; ghế, số lượng vé và lượt dùng coupon được hoàn lại.

## Luồng phát hành vé
1. Hệ thống xác định suất diễn từ ghế đã chọn; nếu vé không có ghế thì dùng suất diễn đầu tiên của concert.
2. Hệ thống ưu tiên cổng `REGULAR` và chọn cổng theo tỷ lệ số vé đã gán trên sức chứa.
3. Mỗi số lượng vé trong booking item tạo ra một ticket và QR payload tương ứng.
4. Danh sách vé, ghế và cổng được đưa vào sự kiện `payment.success` để gửi thông báo.

## Thanh toán MoMo
- Backend gửi yêu cầu tới endpoint thử nghiệm của MoMo với timeout, retry và circuit breaker.
- API trả về URL thanh toán thử nghiệm chứa payment ID và số tiền.

## Kịch bản lỗi
- Dữ liệu đầu vào không hợp lệ → từ chối yêu cầu.
- Không tìm thấy booking thuộc người dùng hiện tại → từ chối yêu cầu.
- Booking không ở trạng thái `PENDING_PAYMENT` → từ chối tạo payment.
- Chữ ký VNPAY không hợp lệ → trả mã `97`.
- Không tìm thấy payment → trả mã `01`.
- Số tiền không khớp → trả mã `04`.
- Payment đã được xử lý → trả mã `02`.
- Provider hoặc cấu hình provider không khả dụng → trả lỗi tạo thanh toán.

## Ràng buộc
- Endpoint tạo payment yêu cầu JWT và vai trò `AUDIENCE`.
- Số tiền gửi sang VNPAY được nhân với 100 và được đối chiếu theo cùng đơn vị khi nhận IPN.
- Chỉ payment VNPAY ở trạng thái `PENDING` được cập nhật từ IPN.
- Việc cập nhật payment, booking và phát hành vé được thực hiện trong Prisma transaction.
- Sự kiện thanh toán thành công được publish tới exchange `ticketbox.exchange` với routing key `payment.success`.

## Tiêu chí chấp nhận
- Booking hợp lệ đang chờ thanh toán trả về `paymentId` và `paymentUrl`.
- VNPAY IPN thành công cập nhật payment thành `SUCCESS`, booking thành `PAID` và tạo đủ vé.
- VNPAY IPN thất bại cập nhật payment thành `FAILED`, hủy booking và hoàn tài nguyên đã giữ.
- Callback VNPAY lặp lại cho payment đã xử lý không cập nhật payment lần nữa.
- Sự kiện thanh toán thành công chứa thông tin các vé đã phát hành.
