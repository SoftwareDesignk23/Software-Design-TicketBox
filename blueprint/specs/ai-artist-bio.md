# Đặc tả hiện trạng: AI Artist Bio

## Mô tả
`ADMIN` hoặc `ORGANIZER` gửi PDF press kit cùng `concertId` và tên provider. Backend tạo `BackgroundJob`, publish RabbitMQ và worker trích xuất nội dung trước khi gọi AI.

## Luồng hiện tại
1. Controller chỉ chấp nhận MIME `application/pdf` nếu có file.
2. PDF được lưu tạm trên filesystem; job có trạng thái `PENDING`.
3. Worker Python trích xuất text và ảnh đại diện; ảnh được chuyển sang storage.
4. AI sinh JSON gồm `name` và `bio`, có retry và circuit breaker.
5. Hệ thống tạo hoặc cập nhật trực tiếp `Artist`, liên kết artist với concert và đánh dấu job `COMPLETED` hoặc `FAILED`.

## Giới hạn hiện tại
- Không kiểm tra kích thước file, checksum hoặc metadata upload đầy đủ.
- Không kiểm tra organizer có sở hữu `concertId` được gửi lên hay không.
- Trạng thái job chỉ gồm `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`; không có cancel/retry API.
- Không lưu artifact text, quality score, model/prompt version hoặc source link.
- Không có draft/review/publish; kết quả AI cập nhật thẳng bản ghi Artist.
- Khi AI thất bại, job vẫn có thể tạo artist tên ngẫu nhiên và hoàn tất.

## Điểm cần lưu ý
Thiếu kiểm tra ownership và cơ chế duyệt khiến organizer có thể tác động tới concert không thuộc phạm vi và nội dung AI được ghi trực tiếp.
