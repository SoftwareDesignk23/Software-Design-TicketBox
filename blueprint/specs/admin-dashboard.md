# Đặc tả: Admin Dashboard

## Mô tả
Cổng quản trị nội bộ cho ban tổ chức, chỉ cho phép vai trò ORGANIZER/ADMIN truy cập. Hỗ trợ quản lý vòng đời concert, cấu hình vé, thống kê doanh thu và audit log thay đổi quan trọng.

## Yêu cầu chi tiết
- Chỉ Organizer được phép truy cập các tính năng quản trị.
- Tạo, cập nhật, hủy concert và upload sơ đồ ghế SVG.
- Trigger AI Artist Bio từ màn quản trị.
- Cấu hình loại vé: giá, số lượng, thời điểm mở bán, giới hạn per-user.
- Dashboard doanh thu/analytics phải đọc từ read model hoặc replica.
- Mọi thay đổi cấu hình vé phải ghi audit log immutable.

## Luồng chính
1. Organizer đăng nhập, vào trang quản trị.
2. Tạo concert mới, upload sơ đồ ghế SVG, cấu hình thời gian mở bán.
3. Thiết lập loại vé (giá, số lượng, giới hạn per-user).
4. Kích hoạt AI Artist Bio hoặc upload CSV guestlist.
5. Xem dashboard doanh thu và thống kê real-time từ read model.
6. Mọi thay đổi cấu hình vé được ghi audit log.

## Kịch bản lỗi
- Organizer không được phân công event → 403.
- Upload SVG lỗi định dạng → reject và báo lỗi.
- Read model unavailable → fallback hiển thị dữ liệu snapshot gần nhất.

## Ràng buộc
- RBAC bắt buộc cho toàn bộ route admin.
- Audit log immutable cho các thao tác thay đổi giá, số lượng, thời gian mở bán.
- Analytics truy vấn từ read model hoặc replica, không chạm DB giao dịch trực tiếp.

## Tiêu chí chấp nhận
- Organizer chỉ thấy và sửa concert thuộc phạm vi.
- Thống kê không gây lock DB chính.
- Audit log có trước/sau cho mọi thay đổi vé.
