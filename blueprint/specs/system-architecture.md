# Đặc tả: Kiến trúc hệ thống

## Mô tả
TicketBox được tổ chức thành các ứng dụng giao diện riêng và một backend NestJS dạng module. Backend sử dụng Prisma làm lớp truy cập cơ sở dữ liệu, Redis cho cache và khóa tạm thời, Socket.IO cho cập nhật thời gian thực, RabbitMQ cho tác vụ bất đồng bộ và Nest Schedule cho các tác vụ định kỳ.

## Thành phần hệ thống

### Ứng dụng giao diện
- `ui/web`: ứng dụng React/Vite dành cho khán giả, gồm xem sự kiện, đặt vé, thanh toán, quản lý vé và thông báo.
- `ui/admin-dashboard`: ứng dụng React/Vite dành cho quản trị viên và nhà tổ chức.
- `ui/mobile-checkin`: ứng dụng Expo/React Native dành cho nhân viên soát vé online và offline.

### Backend
- Backend được xây dựng bằng NestJS và cung cấp REST API cho các ứng dụng giao diện.
- Các module nghiệp vụ gồm `Auth`, `Concerts`, `Booking`, `Payment`, `Notification`, `Checkin`, `Csv`, `Ai`, `Storage`, `Tickets` và `Admin`.
- JWT guard và role guard bảo vệ các endpoint theo vai trò.
- Response được chuẩn hóa qua interceptor dùng chung.
- Throttler guard được áp dụng toàn cục cho HTTP với giới hạn mặc định 100 request trong 60 giây.

### Lưu trữ dữ liệu
- Prisma quản lý dữ liệu nghiệp vụ trong cơ sở dữ liệu quan hệ.
- Redis kết nối qua `REDIS_URL` và được dùng cho cache dữ liệu concert cùng khóa ghế, khóa booking.
- Ứng dụng mobile check-in dùng SQLite để lưu vé và log quét cục bộ phục vụ chế độ offline.
- Dịch vụ storage tải ảnh lên Cloudinary.

### Giao tiếp thời gian thực
- Socket.IO namespace `/seats` cho phép client tham gia room theo suất diễn.
- Backend phát sự kiện `seats_updated` khi ghế được giữ hoặc giải phóng.
- Socket.IO namespace `/notifications` cho phép client tham gia room theo người dùng.
- Backend phát sự kiện `new_notification` khi tạo thông báo trong ứng dụng.

### Xử lý bất đồng bộ
- RabbitMQ sử dụng topic exchange `ticketbox.exchange` cho các sự kiện nghiệp vụ.
- Thanh toán thành công phát sự kiện với routing key `payment.success`.
- Queue `payment.success.queue` xử lý thông báo in-app và email sau thanh toán.
- Message xử lý lỗi được chuyển tới `ticketbox.dlx` và queue `ticketbox.dlq`.
- DLQ handler thử publish lại message tối đa ba lần, mỗi lần cách nhau 5 giây.
- AI artist bio và CSV import có các RabbitMQ worker và queue riêng.

## Luồng đặt vé
1. Client lấy dữ liệu concert; backend ưu tiên dữ liệu cache Redis và truy vấn Prisma khi cache không có.
2. Khi chọn ghế, backend dùng khóa Redis có TTL để giới hạn việc nhiều người giữ cùng một ghế.
3. Booking và các cập nhật inventory được ghi qua Prisma transaction.
4. Trạng thái ghế được phát tới room của suất diễn qua `seats_updated`.
5. Booking chờ thanh toán có thời điểm hết hạn.
6. Tác vụ chạy mỗi phút hủy booking hết hạn, giải phóng ghế, hoàn inventory và lượt dùng coupon.

## Luồng thanh toán và thông báo
1. Backend tạo payment từ booking đang chờ thanh toán và trả URL của provider.
2. Khi VNPAY xác nhận thành công, backend cập nhật payment và booking, sau đó phát hành vé trong Prisma transaction.
3. Payment service publish sự kiện `payment.success` lên RabbitMQ.
4. Notification consumer tạo thông báo in-app và email.
5. Thông báo in-app được gửi thời gian thực tới room của người dùng qua Socket.IO.

## Luồng check-in
1. Mobile check-in tải dữ liệu vé từ backend và lưu vào SQLite.
2. Khi có Wi-Fi, ứng dụng xác minh vé trực tiếp qua REST API.
3. Khi offline, ứng dụng xác minh QR và dữ liệu vé cục bộ, sau đó lưu log chờ đồng bộ.
4. Khi kết nối trở lại, ứng dụng đồng bộ trạng thái từ server và gửi các lượt check-in hợp lệ lên backend.

## Kịch bản lỗi
- Cache concert không có dữ liệu → backend truy vấn Prisma và ghi lại cache.
- Khóa ghế Redis không lấy được → yêu cầu giữ ghế bị từ chối.
- Booking quá hạn → tác vụ định kỳ hủy booking và hoàn tài nguyên.
- Consumer thông báo xử lý thất bại → message được chuyển sang DLQ để thử lại.
- Provider bên ngoài lỗi → circuit breaker hoặc retry được áp dụng tại các dịch vụ có tích hợp provider.
- Mobile không có Wi-Fi → chuyển sang kiểm tra vé bằng dữ liệu SQLite đã tải.

## Tiêu chí chấp nhận
- Ba ứng dụng giao diện sử dụng chung REST API của backend theo đúng vai trò.
- Dữ liệu nghiệp vụ được lưu qua Prisma, còn Redis đảm nhiệm cache và khóa tạm thời.
- Thay đổi trạng thái ghế được gửi tới các client trong room của suất diễn.
- Thông báo sau thanh toán được xử lý bất đồng bộ qua RabbitMQ.
- Booking hết hạn được hủy và hoàn lại ghế, inventory cùng lượt dùng coupon.
- Mobile check-in tiếp tục xác minh vé bằng dữ liệu cục bộ khi offline.
