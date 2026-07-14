# Đặc tả hiện trạng: Admin Dashboard

## Mô tả
Dashboard dành cho `ADMIN` và `ORGANIZER`, gồm thống kê, quản lý concert, loại vé, show, cổng, nghệ sĩ, địa điểm, tài khoản và các job AI/CSV.

## Chức năng hiện có
- `ADMIN` xem và quản lý toàn bộ; `ORGANIZER` chỉ xem danh sách concert và thống kê thuộc organizer của mình.
- Concert hỗ trợ tạo, cập nhật, xóa; cấu hình ticket type, show, artist và gate.
- Dashboard tính doanh thu, vé đã phát hành và số concert đang publish trực tiếp từ PostgreSQL.
- Theo dõi `BackgroundJob`, kích hoạt thủ công job CSV đang `PENDING`.
- Quản lý artist, venue, organizer và check-in staff.
- Frontend hỗ trợ upload tài nguyên và gọi chức năng AI Bio/CSV guestlist.

## Giới hạn hiện tại
- Chưa có read model, replica hoặc snapshot fallback cho analytics.
- Chưa có bảng audit log và không lưu giá trị trước/sau khi thay đổi cấu hình.
- Không có validation chuyên biệt cho nội dung SVG ở backend; concert chỉ lưu URL sơ đồ ghế.
- Một số API admin theo `showId`, `jobId`, `artistId` chưa kiểm tra ownership của organizer trong service.
- Thống kê `totalTicketsSold` chỉ đếm vé `ISSUED`, không bao gồm `CHECKED_IN`.

## Điểm cần lưu ý
Các endpoint cập nhật/xóa staff dành cho organizer chưa kiểm tra staff có thuộc organizer hiện tại hay không.
