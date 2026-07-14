# Đặc tả: AI Artist Bio

## Mô tả
Cho phép ban tổ chức upload PDF press kit, trích xuất văn bản, làm sạch, sinh bio bằng AI và lưu bản nháp để duyệt trước khi công bố.

## Yêu cầu chi tiết
- Upload PDF chỉ cho organizer của event.
- Validate type/size, lưu metadata (checksum, filename, uploader, timestamp).
- Trích xuất text, ghi chất lượng (char count, low-text warning).
- Làm sạch: normalize whitespace, dedup, remove noise, chunk theo giới hạn AI.
- AI output theo schema (title, short, long, highlights) và lưu draft.
- Job state: queued, extracting, cleaning, generating, completed, failed, retrying, cancelled.
- Cho phép retry và cancel job nếu an toàn.
- Không tự publish, luôn cần review.

## Luồng chính
1. Organizer upload PDF hợp lệ.
2. Hệ thống lưu file và tạo job background.
3. Worker extract text, lưu artifact + chất lượng.
4. Text cleaning (normalize, dedup, remove noise).
5. Gọi AI sinh bio theo schema chuẩn.
6. Lưu draft + metadata (model, prompt, version).
7. Organizer review và publish.

## Kịch bản lỗi
- PDF lỗi/không hỗ trợ → job fail với lý do rõ ràng.
- Text quá ít → đánh dấu low-quality và không gọi AI.
- AI trả output sai schema → retry hoặc fail theo policy.

## Ràng buộc
- Upload chỉ cho organizer của event.
- File size và type validation bắt buộc.
- Draft không tự publish; luôn cần organizer approve.
- Lưu metadata đầy đủ để audit.

## Tiêu chí chấp nhận
- Upload tạo job và theo dõi trạng thái.
- Bio draft luôn có metadata và source link.
- Organizer kiểm soát publish.
