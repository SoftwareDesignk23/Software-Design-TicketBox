# Đặc tả: CSV Guestlist Import

## Mô tả
Nhập danh sách khách mời VIP theo lịch hoặc thủ công, xử lý lỗi dòng, dedup và audit đầy đủ.

## Yêu cầu chi tiết
- Scheduled nightly drop + manual upload.
- Batch processing async.
- Validate row và isolate lỗi.
- Idempotent dedup trong file và giữa các lần import.
- Commit partial success, không rollback toàn batch.
- Import ledger lưu tổng, success, fail, error detail.
- Retry transient và hỗ trợ reprocess manual.

## Luồng chính
1. Nhận file CSV theo lịch hoặc upload thủ công.
2. Tạo import job, chia batch.
3. Validate từng dòng, ghi lỗi riêng.
4. Dedup theo email/phone + event.
5. Upsert dữ liệu VIP.
6. Ghi import ledger và error log.

## Kịch bản lỗi
- File lỗi định dạng → reject.
- Lỗi từng dòng → skip và tiếp tục.
- Lỗi DB tạm thời → retry.

## Ràng buộc
- Import chạy async bằng worker.
- Idempotent theo file hash + event.
- Cho phép reprocess dòng lỗi.

## Tiêu chí chấp nhận
- Import không bị dừng vì lỗi dòng.
- Không tạo duplicate VIP.
- Có báo cáo tổng hợp import.
