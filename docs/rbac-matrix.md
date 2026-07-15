# Bảng phân quyền người dùng

**Ngày kiểm tra:** 15/07/2026  
**Phạm vi:** Các HTTP controller trong backend  
**Nguồn quyền:** JwtAuthGuard, RolesGuard, ConcertScopeGuard và kiểm tra role trực tiếp trong controller/service

## Ký hiệu

| Ký hiệu | Ý nghĩa |
|---|---|
| ✅ | Được phép theo guard/logic hiện tại |
| ❌ | Bị từ chối |
| 🌐 | Endpoint công khai, không yêu cầu access token |
| ⚠️ | Qua được guard nhưng còn điều kiện hoặc lỗi triển khai cần lưu ý |

## Matrix role - permission

| Nhóm chức năng | Endpoint tiêu biểu | Public | AUDIENCE | ORGANIZER | CHECK_IN_STAFF | ADMIN |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Health check | GET / | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Đăng nhập | POST /auth/login | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Đăng ký audience | POST /auth/register | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Đăng ký role đặc quyền | POST /auth/register với role khác AUDIENCE | ❌ | ❌ | ❌ | ❌ | ✅ |
| Refresh/logout | POST /auth/refresh, /auth/logout | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Xem hồ sơ hiện tại | GET /auth/me | ❌ | ✅ | ✅ | ✅ | ✅ |
| Tạo nhân viên check-in | POST /auth/staff | ❌ | ❌ | ✅ | ❌ | ✅ |
| Xem concert, show, ghế, cổng | GET /concerts và các endpoint đọc công khai | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Quản lý concert, show, ticket type, artist, gate | POST/PATCH/DELETE/PUT /concerts/... | ❌ | ❌ | ✅ | ❌ | ✅ |
| Quản lý coupon | /concerts/:id/coupons | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Tạo và quản lý booking cá nhân | /bookings/... | ❌ | ✅ | ❌ | ❌ | ❌ |
| Xem vé cá nhân | GET /tickets | ❌ | ✅ | ❌ | ❌ | ❌ |
| Tạo payment | POST /payments/create | ❌ | ✅ | ❌ | ❌ | ❌ |
| VNPAY IPN webhook | GET /payments/webhook/vnpay_ipn | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Check-in online/offline sync | /checkin/sync, /events, /tickets, /sync-down, /verify | ❌ | ❌ | ✅ | ✅ | ✅ |
| Import Guest List CSV | POST /csv/import | ❌ | ❌ | ✅ | ❌ | ✅ |
| Gửi notification | POST /notifications/send | ❌ | ❌ | ✅ | ❌ | ✅ |
| Xem/đánh dấu notification của chính mình | GET /notifications, POST /notifications/:id/read | ❌ | ✅ | ✅ | ✅ | ✅ |
| Yêu cầu AI tạo artist bio | POST /ai/bio/request | ❌ | ❌ | ✅ | ❌ | ✅ |
| Upload file | POST /storage/upload | ❌ | ❌ | ✅ | ❌ | ✅ |
| Dashboard, jobs, guest list, artist, venue | /admin/... | ❌ | ❌ | ✅ | ❌ | ✅ |
| Quản lý organizer | /admin/users, trừ các route staff | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xem/cập nhật/xóa staff | /admin/users/staff... | ❌ | ❌ | ✅ | ❌ | ✅ |

## Chi tiết theo role

### AUDIENCE

- Đặt vé, lock/unlock ghế, xem booking và áp dụng coupon cho booking.
- Tạo payment và xem e-ticket của chính mình.
- Xem và đánh dấu notification của chính mình.
- Không được truy cập check-in, CMS, import CSV hoặc quản lý concert.

### ORGANIZER

- Quản lý concert, show, ticket type, artist và gate.
- Truy cập dashboard admin, background job, guest list, artist và venue.
- Import Guest List CSV, gửi notification, upload file và yêu cầu AI artist bio.
- Tạo và quản lý nhân viên check-in.
- Có quyền gọi các API check-in.

### CHECK_IN_STAFF

- Chỉ có nhóm quyền nghiệp vụ check-in: lấy sự kiện/vé, sync-down, sync offline và verify vé.
- Có thể xem notification cá nhân và hồ sơ hiện tại.
- Không được quản lý concert, CSV, booking, payment hoặc dashboard.

### ADMIN

- Có toàn bộ quyền quản trị organizer và staff.
- Có các quyền quản lý concert/CMS, CSV, AI, storage, notification và check-in.
- Không được gọi booking/payment/ticket API dành riêng cho AUDIENCE.

## Điều kiện phạm vi dữ liệu

| Cơ chế | Phạm vi |
|---|---|
| ConcertScopeGuard | Demo organizer concert và demo check-in scan kiểm tra user được gán concert |
| AdminService | Một số truy vấn ORGANIZER được lọc theo organizerId hoặc createdBy |
| CheckinService | Danh sách event/ticket được lọc tiếp theo user và role |
| BookingService / TicketService | Dữ liệu được truy vấn theo userId của AUDIENCE |
| CouponsService | Kiểm tra user thuộc organizer sở hữu concert |

## Điểm cần lưu ý

1. **Coupon đang có lỗi truyền định danh người dùng:** CouponsController truyền req.user.userId, trong khi JWT payload dùng thuộc tính sub. Do đó mọi role có thể qua JwtAuthGuard nhưng CouponsService nhiều khả năng từ chối vì không tìm thấy organizer tương ứng.
2. **Coupon thiếu RolesGuard:** Cả AUDIENCE và CHECK_IN_STAFF đều có thể gọi đến service trước khi bị kiểm tra ownership; quyền dự kiến không được thể hiện rõ ở controller.
3. **Các endpoint admin dùng quyền khá rộng:** ORGANIZER có quyền cập nhật/xóa artist và tạo venue vì AdminController đặt Roles ADMIN, ORGANIZER ở cấp class.
4. **Endpoint refresh và logout không dùng JwtAuthGuard:** Quyền truy cập dựa vào refresh token trong body, không dựa vào access-token role.
5. **POST /auth/staff kiểm tra role thủ công:** Chỉ ORGANIZER và ADMIN được phép dù endpoint không dùng RolesGuard.

## File code đối chiếu

- src/apps/backend/src/auth/auth.types.ts
- src/apps/backend/src/auth/auth.guards.ts
- src/apps/backend/src/auth/auth.decorators.ts
- src/apps/backend/src/auth/auth.controller.ts
- src/apps/backend/src/admin/admin.controller.ts
- src/apps/backend/src/admin/users.controller.ts
- src/apps/backend/src/bookings/booking.controller.ts
- src/apps/backend/src/checkin/checkin.controller.ts
- src/apps/backend/src/concerts/concerts.controller.ts
- src/apps/backend/src/concerts/coupons.controller.ts
- src/apps/backend/src/concerts/coupons.service.ts
- src/apps/backend/src/csv/csv.controller.ts
- src/apps/backend/src/notifications/notification.controller.ts
- src/apps/backend/src/payments/payment.controller.ts
- src/apps/backend/src/tickets/tickets.controller.ts
