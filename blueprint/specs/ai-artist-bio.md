# Đặc tả: AI Artist Bio

## Mô tả
Cho phép Admin hoặc Organizer tải PDF press kit, tạo job nền để trích xuất thông tin và sinh phần giới thiệu nghệ sĩ bằng AI. Kết quả được dùng để tạo hoặc cập nhật Artist và liên kết nghệ sĩ với concert.

## Yêu cầu chi tiết
- Chỉ vai trò `ADMIN` hoặc `ORGANIZER` được gửi yêu cầu tạo bio.
- File được gửi lên phải có MIME type `application/pdf`.
- Concert được chỉ định phải tồn tại.
- PDF được lưu tạm để worker xử lý.
- Job AI sử dụng các trạng thái `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
- Worker Python trích xuất văn bản và ảnh đại diện từ PDF.
- Ảnh đại diện được tải lên hệ thống lưu trữ Cloudinary.
- AI sinh kết quả gồm tên nghệ sĩ và đoạn bio bằng tiếng Việt.
- Lời gọi AI sử dụng retry và circuit breaker.
- Kết quả tạo mới hoặc cập nhật Artist, sau đó liên kết Artist với concert.

## Luồng chính
1. Admin hoặc Organizer chọn concert, AI provider và tải PDF lên.
2. Hệ thống kiểm tra loại file và sự tồn tại của concert.
3. Hệ thống lưu PDF tạm, tạo `BackgroundJob` ở trạng thái `PENDING` và publish job qua RabbitMQ.
4. Worker chuyển job sang `PROCESSING`, trích xuất văn bản và ảnh đại diện.
5. Hệ thống gọi AI để sinh JSON gồm `name` và `bio`.
6. Hệ thống tạo hoặc cập nhật Artist và liên kết Artist với concert với vai trò nghệ sĩ chính.
7. Job được cập nhật thành `COMPLETED` cùng kết quả Artist.

## Kịch bản lỗi
- File không phải PDF → từ chối yêu cầu.
- Concert không tồn tại → từ chối yêu cầu.
- Không thể lưu PDF tạm → từ chối yêu cầu.
- Xử lý Artist hoặc liên kết concert thất bại → job chuyển sang `FAILED` và lưu thông báo lỗi.

## Ràng buộc
- API yêu cầu JWT và vai trò `ADMIN` hoặc `ORGANIZER`.
- Worker chỉ xử lý job đang ở trạng thái `PENDING`.
- Nội dung gửi cho AI được giới hạn trong 10.000 ký tự đầu của văn bản trích xuất.
- Kết quả AI được đọc theo cấu trúc `name` và `bio`.

## Tiêu chí chấp nhận
- Yêu cầu hợp lệ tạo được job nền và trả về `jobId`.
- Job lưu được trạng thái và kết quả xử lý.
- Artist được tạo hoặc cập nhật và liên kết đúng với concert.
