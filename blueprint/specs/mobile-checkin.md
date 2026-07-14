# Đặc tả: Mobile Check-in App

## Mô tả
Ứng dụng mobile cho nhân sự soát vé, hỗ trợ offline-first, local validation, sync nền và UX scan nhanh.

## Yêu cầu chi tiết
- Offline event readiness: download manifest + keys.
- Connectivity-aware state: online/degraded/offline.
- Local scan log persistence + sync state.
- QR parse + signature verify.
- Duplicate detection local + cross-device.
- Fast UX với feedback âm thanh/visual.

## Luồng chính
1. Staff đăng nhập và tải event manifest.
2. Scan QR → parse + verify signature.
3. Lưu scan log local (provisional).
4. Connectivity restore → sync batch.
5. Nhận per-scan outcome, cập nhật UI.

## Kịch bản lỗi
- Không có manifest → chặn offline scan.
- Duplicate local → báo lỗi ngay.
- Sync fail → retry backoff.

## Ràng buộc
- Local DB mã hóa.
- UX scan phản hồi < 1s.
- Chỉ role CHECK_IN_STAFF.

## Tiêu chí chấp nhận
- Scan offline không cần mạng.
- Sync trả kết quả chi tiết từng scan.
- Duplicate luôn bị chặn.
