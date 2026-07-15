# Đặc tả: CSV Guestlist Import

## Mô tả
Hệ thống nhập danh sách khách mời từ file CSV thông qua job nền, tạo tài khoản khán giả, booking miễn phí, vé QR, ghế và cổng cho từng khách hợp lệ.

## Yêu cầu chi tiết
- Chỉ `ADMIN` hoặc `ORGANIZER` được tạo job import.
- Yêu cầu import gồm `showId` và `fileUrl`.
- Job được lưu dưới loại `CSV_GUEST_LIST` với trạng thái `PENDING`.
- Job có thể được kích hoạt thủ công hoặc được cron đưa vào RabbitMQ lúc 02:00 mỗi ngày.
- Worker chỉ xử lý job đang ở trạng thái `PENDING`.
- CSV được tải dưới dạng stream và xử lý theo chunk 100 dòng.
- Mỗi dòng sử dụng email làm thông tin bắt buộc; name và phone được sử dụng khi có.
- User được tạo hoặc cập nhật theo email.
- Vé khách mời được kiểm tra trùng theo user và show.
- Mỗi khách mới được gán một ghế còn trống bằng `FOR UPDATE SKIP LOCKED`.
- Hệ thống tạo booking miễn phí ở trạng thái `PAID` và phát hành vé QR.
- Vé được ưu tiên gán vào gate loại `GUEST`, sau đó đến gate `REGULAR`.
- Kết quả job lưu tổng số dòng, số thành công, số thất bại và chi tiết dòng lỗi.

## Luồng chính
1. Admin hoặc Organizer gửi `showId` và `fileUrl` để tạo job.
2. Hệ thống tạo `BackgroundJob` ở trạng thái `PENDING`.
3. Job được publish vào routing key `job.csv.import` theo lịch hoặc thao tác thủ công.
4. Worker chuyển job sang `PROCESSING` và tải CSV từ URL.
5. Worker đọc từng chunk, kiểm tra email và upsert user.
6. Nếu user đã có vé cho show, hệ thống sử dụng lại vé và gửi lại notification khi cần.
7. Nếu chưa có vé, hệ thống khóa ghế trống, tạo booking, tạo QR và tạo ticket.
8. Hệ thống publish thông tin vé qua routing key `payment.success` để gửi email và notification in-app.
9. Sau khi xử lý hết file, job chuyển sang `COMPLETED` cùng báo cáo kết quả.

## Kịch bản lỗi
- Show không tồn tại → job chuyển sang `FAILED`.
- Concert không có ticket type phù hợp → job chuyển sang `FAILED`.
- Dòng thiếu email → ghi vào `failedRows` và tiếp tục dòng tiếp theo.
- Không còn ghế phù hợp → ghi lỗi cho dòng tương ứng và tiếp tục xử lý.
- Không thể tải hoặc đọc file CSV → job chuyển sang `FAILED` và lưu thông báo lỗi.

## Ràng buộc
- Worker xử lý tối đa 100 dòng trong mỗi chunk.
- Ticket type ưu tiên loại có tên chứa `SVIP`, nếu không có thì dùng ticket type đầu tiên của concert.
- Ghế được chọn theo thứ tự row và number.
- Booking khách mời có tổng tiền bằng 0 và currency `VND`.
- Mỗi user chỉ có một ticket được tạo bởi luồng import cho cùng show.

## Tiêu chí chấp nhận
- Yêu cầu hợp lệ tạo được job và trả về `jobId`.
- Job có thể chạy theo lịch hoặc được kích hoạt thủ công.
- Lỗi ở một dòng không dừng các dòng còn lại.
- Khách hợp lệ nhận được booking, ghế và vé QR.
- Job hoàn tất lưu được báo cáo tổng hợp và chi tiết lỗi.
