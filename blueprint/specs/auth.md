# Đặc tả: Xác thực & Phân quyền (Auth + RBAC)

## Mô tả
Hệ thống dùng JWT access token ngắn hạn và refresh token quay vòng để xác thực. Phân quyền theo RBAC với vai trò cụ thể cho khán giả, ban tổ chức, nhân sự soát vé và admin. Mọi API bảo vệ phải đi qua middleware/guard kiểm tra vai trò và phạm vi event.

## Yêu cầu chi tiết
- JWT có issuer, audience, subject, role, iat, exp.
- Refresh token rotate và lưu dạng hash.
- API guard enforce role + event scope.
- Error response chuẩn cho 401/403.

## Luồng chính
1. Người dùng đăng nhập bằng email/phone + OTP hoặc mật khẩu.
2. Auth trả `access_token` (JWT) và `refresh_token` (rotating).
3. Client đính kèm access token vào request API bảo vệ.
4. Hết hạn access token → gọi refresh, hệ thống rotate refresh token.
5. Logout → revoke refresh token và đóng session.

## Vai trò và quyền
- `AUDIENCE`: xem concert, đặt/mua vé, nhận e-ticket, xem lịch sử.
- `ORGANIZER`: quản trị concert, cấu hình vé, upload PDF, import CSV, xem doanh thu.
- `CHECK_IN_STAFF`: quét QR, sync check-in cho event được phân công.
- `ADMIN`: quản trị hệ thống, audit log, quản lý user/role.

## Kịch bản lỗi
- Thiếu/không hợp lệ JWT → `401 Unauthorized`.
- Có JWT nhưng thiếu quyền → `403 Forbidden`.
- Refresh token reused → từ chối và revoke token family.
- Truy cập event không được phân công → `403`.

## Ràng buộc
- JWT claim bắt buộc: `iss`, `aud`, `sub`, `role`, `iat`, `exp`.
- Access token TTL 15-30 phút; refresh token TTL 7-30 ngày.
- Refresh token lưu dạng hash + metadata (user_id, session_id, expiry).
- Authorization guard kiểm tra cả role và `event_scope`.

## Tiêu chí chấp nhận
- Tất cả API bảo vệ từ chối request không có token.
- Người không có role phù hợp không truy cập được chức năng quản trị.
- Staff chỉ thao tác trong event được phân công.
- Refresh token cũ không thể dùng lại.
