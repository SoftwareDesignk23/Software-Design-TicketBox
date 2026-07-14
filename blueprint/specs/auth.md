# Đặc tả: Xác thực & Phân quyền (Auth + RBAC)

## Mô tả
Hệ thống xác thực người dùng bằng email và mật khẩu, phát hành JWT access token cùng refresh token quay vòng. Phân quyền RBAC sử dụng các vai trò `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF` và `ADMIN`.

## Yêu cầu chi tiết
- JWT chứa issuer, audience, subject, role, session ID và thời điểm phát hành.
- Access token thông thường có thời hạn mặc định 15 phút.
- Refresh token có thời hạn mặc định 14 ngày và được lưu dưới dạng hash.
- Refresh token được quay vòng trong cùng token family.
- API bảo vệ sử dụng `JwtAuthGuard` và `RolesGuard`.
- Endpoint yêu cầu phạm vi concert có thể sử dụng `ConcertScopeGuard`.
- Organizer hoặc Admin có thể tạo tài khoản check-in staff và gán staff vào gate.

## Luồng chính
1. Người dùng đăng nhập bằng email và mật khẩu.
2. Hệ thống xác thực tài khoản và trạng thái hoạt động.
3. Hệ thống tạo refresh session, access token và refresh token.
4. Client đính kèm access token vào các request API được bảo vệ.
5. Khi refresh, hệ thống thu hồi session cũ và tạo refresh session mới trong cùng family.
6. Khi logout, hệ thống revoke refresh session tương ứng.

## Vai trò và quyền
- `AUDIENCE`: đăng ký tài khoản, xem concert, tạo booking, thanh toán và xem vé.
- `ORGANIZER`: quản lý concert thuộc organizer, tạo check-in staff và sử dụng chức năng quản trị được cấp quyền.
- `CHECK_IN_STAFF`: sử dụng API và ứng dụng check-in vé.
- `ADMIN`: quản lý hệ thống, organizer, user và các tài nguyên quản trị.

## Kịch bản lỗi
- Thiếu access token → từ chối yêu cầu xác thực.
- Access token sai hoặc hết hạn → từ chối yêu cầu.
- Tài khoản không hoạt động hoặc thông tin đăng nhập sai → từ chối đăng nhập.
- Role không thuộc danh sách được phép → từ chối truy cập.
- Refresh token không tồn tại, hết hạn hoặc đã bị revoke → từ chối refresh.
- Phát hiện refresh token được dùng lại → revoke toàn bộ token family.
- User không được phân công concert tại endpoint dùng `ConcertScopeGuard` → từ chối truy cập.

## Ràng buộc
- JWT được ký bằng signing secret và kiểm tra đúng issuer/audience.
- Access token mặc định có TTL 900 giây.
- Access token được tạo khi staff đăng nhập không có thời hạn để phục vụ check-in offline.
- Refresh token mặc định có TTL 1.209.600 giây.
- Mật khẩu được băm bằng bcrypt trước khi lưu.
- Refresh token chỉ được lưu dưới dạng hash.

## Tiêu chí chấp nhận
- Đăng nhập hợp lệ trả access token, refresh token và hồ sơ người dùng.
- API bảo vệ từ chối request không có JWT hợp lệ.
- `RolesGuard` chỉ cho phép các role được khai báo trên endpoint.
- Refresh thành công tạo token mới và revoke session cũ.
- Logout revoke refresh session của người dùng.
