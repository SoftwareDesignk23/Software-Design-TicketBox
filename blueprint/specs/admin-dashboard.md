# Đặc tả: Admin Dashboard

## Mô tả
Cổng quản trị nội bộ cho ban tổ chức, cho phép vai trò ORGANIZER/ADMIN truy cập. Hỗ trợ quản lý vòng đời concert, cấu hình vé và thống kê doanh thu.

## Yêu cầu chi tiết
- Organizer và Admin được phép truy cập các tính năng quản trị phù hợp với vai trò.
- Tạo, cập nhật, hủy concert và lưu URL sơ đồ ghế.
- Trigger AI Artist Bio từ màn quản trị.
- Cấu hình loại vé: giá, số lượng, thời điểm mở bán, giới hạn per-user.
- Dashboard doanh thu/analytics hiện truy vấn trực tiếp PostgreSQL qua Prisma.

## Luồng chính
1. Organizer đăng nhập, vào trang quản trị.
2. Tạo concert mới, lưu URL sơ đồ ghế, cấu hình thời gian mở bán.
3. Thiết lập loại vé (giá, số lượng, giới hạn per-user).
4. Kích hoạt AI Artist Bio hoặc upload CSV guestlist.
5. Xem dashboard doanh thu và thống kê được truy vấn trực tiếp từ cơ sở dữ liệu.

## Kịch bản lỗi
- Organizer sửa concert không thuộc organizer của mình → từ chối truy cập.
- Truy vấn thống kê lỗi → trả lỗi.

## Ràng buộc
- RBAC bắt buộc cho toàn bộ route admin.
- Analytics truy vấn trực tiếp DB giao dịch.

## Tiêu chí chấp nhận
- Organizer chỉ thấy và sửa concert thuộc phạm vi.
- Thống kê trả đúng dữ liệu từ DB chính.
