# Đặc tả hiện trạng: CSV Guestlist Import

## Mô tả
Admin/Organizer tạo job import bằng `showId` và `fileUrl`. Job có thể chạy thủ công hoặc được cron publish lên RabbitMQ lúc 02:00 hằng ngày.

## Luồng hiện tại
1. Tạo `BackgroundJob` loại `CSV_GUEST_LIST`, trạng thái `PENDING`.
2. Worker tải CSV từ URL và xử lý tuần tự theo chunk 100 dòng.
3. Mỗi dòng yêu cầu email; user được upsert theo email.
4. Dedup bằng cách tìm ticket cùng `ownerId + showId`.
5. Worker khóa một ghế bằng `FOR UPDATE SKIP LOCKED`, tạo booking miễn phí, ticket QR và gán gate phù hợp.
6. Kết quả job lưu tổng số xử lý, thành công và danh sách dòng lỗi.
7. Notification vé được publish qua routing key `payment.success`.

## Giới hạn hiện tại
- Không có idempotency theo file hash và event.
- Không có API reprocess riêng cho dòng lỗi hoặc retry transient tự động.
- Không có import ledger/table lỗi riêng; kết quả nằm trong JSON của `BackgroundJob`.
- Không kiểm tra organizer có quyền với `showId`.
- Backend tải trực tiếp `fileUrl` được cung cấp, chưa giới hạn host/URL.

## Điểm cần lưu ý
`fileUrl` không được kiểm soát có thể tạo rủi ro SSRF; thiếu ownership check cũng cho phép organizer tạo job cho show ngoài phạm vi.
