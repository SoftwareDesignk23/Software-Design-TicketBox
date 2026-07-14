# Đặc tả hiện trạng: Xác thực và phân quyền

## Mô tả
Hệ thống đăng nhập bằng email/mật khẩu, dùng JWT và refresh token quay vòng. Các vai trò gồm `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF`, `ADMIN`.

## Luồng hiện tại
- Access token có `iss`, `aud`, `sub`, `role`, `sid`, `iat` và thường có `exp`.
- Access token mặc định 15 phút; refresh token mặc định 14 ngày và được lưu dạng hash trong `RefreshSession`.
- Refresh tạo session/token mới; phát hiện reuse sẽ revoke cả token family.
- Logout revoke refresh session.
- `JwtAuthGuard` và `RolesGuard` bảo vệ route theo token và role.
- `ConcertScopeGuard` có sẵn nhưng hiện chỉ được dùng trong demo controller, chưa áp dụng rộng cho các module nghiệp vụ.
- Organizer/Admin có thể tạo check-in staff và gán staff vào một gate.

## Ngoại lệ và giới hạn
- Access token của `CHECK_IN_STAFF` được phát hành không có thời hạn để phục vụ offline.
- Chưa có đăng nhập bằng phone/OTP.
- Event scope không nằm trong JWT và nhiều API kiểm tra ownership thủ công trong service.
- Một số API AI, CSV và admin chưa kiểm tra ownership đầy đủ.

## Điểm cần lưu ý
Access token staff không hết hạn làm tăng rủi ro nếu token bị lộ; việc vô hiệu hóa tài khoản không tự động thu hồi token access đã phát hành.
