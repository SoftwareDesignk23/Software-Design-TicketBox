# Đặc tả: Soát vé Offline & Đồng bộ

## Mô tả
Hỗ trợ check-in offline-first trên mobile: quét QR, xác thực chữ ký, lưu scan cục bộ, sync khi có mạng, và xử lý trùng vé theo quy tắc first-valid-check-in.

## Yêu cầu chi tiết
- Offline readiness: download manifest + verification keys.
- Local persistence: scan logs với trạng thái unsynced/synced/conflict.
- Sync batch idempotent, per-scan outcome.
- Conflict resolution: first-valid-check-in.
- Audit trail cho conflict và scan.

## Luồng chính
1. Staff đăng nhập, tải manifest + key xác thực event.
2. Quét QR:
	- Parse payload (ticket_id, event_id, signature, issued_at).
	- Verify signature bằng key local.
	- Kiểm tra local DB duplicate.
	- Lưu scan log với trạng thái provisional.
3. Khi có mạng:
	- Upload batch scan logs (idempotent).
	- Backend xử lý conflict và trả per-scan outcome.
	- App cập nhật trạng thái local.

## Kịch bản lỗi
- QR không hợp lệ → invalid.
- Wrong event → wrong-event.
- Duplicate same-device → duplicate-on-device.
- Cross-device duplicate → conflict, trả duplicate.
- Sync thất bại → retry backoff.

## Ràng buộc
- Local DB mã hóa; lưu `scan_id`, `ticket_id`, `event_id`, `device_id`, `staff_id`, `timestamp`.
- Idempotent sync theo `scan_id` và `batch_id`.
- Offline chỉ cho event đã chuẩn bị manifest.

## Tiêu chí chấp nhận
- Offline scan hoạt động và lưu log đầy đủ.
- Không có 2 vé được check-in thành công.
- Kết quả sync rõ ràng từng scan.
