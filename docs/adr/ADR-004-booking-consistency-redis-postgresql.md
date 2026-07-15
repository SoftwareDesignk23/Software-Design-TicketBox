# ADR-004: Nhất quán booking bằng Redis và PostgreSQL

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Nguyễn Hưng Thịnh, Nguyễn Phúc Hậu
- Phạm vi: `BookingModule`, `PaymentModule`, `ConcertsModule`, Redis và PostgreSQL
- Liên quan: `blueprint/specs/booking.md`, `blueprint/design.md`, `openspec/changes/ticket-booking-system/design.md`

## Bối cảnh

TicketBox phải tạo booking khi nhiều người có thể đồng thời chọn cùng ghế, mua cùng loại vé hoặc sử dụng cùng coupon. Một booking giữ tài nguyên trong 15 phút ở trạng thái `PENDING_PAYMENT`; khi thanh toán thành công tài nguyên trở thành vé, còn khi thanh toán thất bại hoặc booking hết hạn thì ghế, inventory và lượt dùng coupon phải được hoàn lại.

Các ràng buộc quan sát được:

- PostgreSQL lưu trạng thái bền vững của `Booking`, `BookingItem`, `TicketType.soldQuantity`, `ShowSeat.status`, `Coupon.usedCount`, `Payment` và `Ticket`.
- Redis giữ khóa chọn ghế theo người dùng và mutex ngắn hạn theo suất diễn trong lúc tạo booking.
- Việc tạo booking phải cập nhật nhiều bảng liên quan như một đơn vị giao dịch.
- Client cần thấy thay đổi trạng thái ghế gần thời gian thực qua Socket.IO.
- Booking có thể được gửi lại với `idempotencyKey` tùy chọn.
- Booking hết hạn được quét định kỳ thay vì phụ thuộc vào Redis key-expiration event.

Nếu không có cơ chế phối hợp, các request đồng thời có thể làm `soldQuantity` vượt `totalQuantity`, giữ cùng một ghế cho nhiều booking, vượt giới hạn sử dụng coupon hoặc hoàn cùng tài nguyên nhiều lần.

## Decision Drivers

- PostgreSQL phải giữ dữ liệu booking và inventory bền vững, có thể truy vấn và phục hồi.
- Giảm tranh chấp khi nhiều request cùng tạo booking cho một suất diễn.
- Ngăn stale write làm mất cập nhật inventory.
- Giữ ghế tạm thời trong lúc người dùng hoàn tất checkout.
- Cập nhật booking, ghế, inventory và coupon theo transaction.
- Tự động hoàn tài nguyên của booking không được thanh toán đúng hạn.
- Trả phản hồi có giới hạn thời gian khi không lấy được khóa thay vì chờ vô hạn.

## Các phương án được xem xét

> Repository mô tả một số phương án trong OpenSpec, nhưng không có biên bản hoặc lịch sử đủ để khẳng định đội ngũ đã đánh giá chính thức tất cả các phương án dưới đây. Phần ưu, nhược điểm ngoài hành vi quan sát được là suy luận kiến trúc hợp lý và cần được xác minh.

### Phương án 1: Chỉ dùng transaction và khóa PostgreSQL

Mọi quyết định giữ ghế và cập nhật inventory được thực hiện trực tiếp trong PostgreSQL bằng transaction và row lock.

Ưu điểm:

- Một nguồn trạng thái duy nhất.
- Failure model và phục hồi đơn giản hơn hệ thống hai data store.
- Có thể dựa vào transaction, constraint và row lock của PostgreSQL.

Nhược điểm:

- Các hot row theo suất diễn, loại vé hoặc coupon có thể gây contention.
- Giữ khóa database trong toàn bộ thời gian người dùng checkout là không phù hợp.
- Tăng áp lực kết nối và thời gian chờ lên PostgreSQL trong lúc nhu cầu tăng đột biến.

### Phương án 2: Chỉ dùng Redis làm inventory và reservation authority

Inventory và reservation được quyết định trong Redis, sau đó ghi xuống PostgreSQL bất đồng bộ.

Ưu điểm:

- Thao tác in-memory và TTL phù hợp với giữ chỗ ngắn hạn.
- Có thể giảm số transaction đồng thời trên PostgreSQL.

Nhược điểm:

- Cần cơ chế đồng bộ, reconciliation và phục hồi khi Redis mất dữ liệu.
- Khó bảo đảm dữ liệu Redis và PostgreSQL không lệch nhau.
- Code hiện tại không triển khai Redis atomic inventory hoặc reconciliation để hỗ trợ phương án này.

### Phương án 3: Redis cho khóa tạm thời, PostgreSQL cho tính đúng đắn bền vững

Redis giới hạn cạnh tranh ngắn hạn; PostgreSQL transaction và conditional update quyết định kết quả booking cuối cùng.

Ưu điểm:

- Khóa Redis có TTL nên không giữ database lock trong suốt thời gian chọn ghế.
- PostgreSQL vẫn là nguồn dữ liệu chuẩn sau khi request hoàn tất.
- Conditional update cung cấp lớp kiểm tra thứ hai nếu nhiều request cùng đọc một giá trị inventory.

Nhược điểm:

- Booking phụ thuộc đồng thời vào Redis và PostgreSQL.
- Phải duy trì quy tắc về TTL, ownership và giải phóng khóa.
- Có thêm failure mode khi Redis và PostgreSQL quan sát trạng thái khác nhau.

Đây là phương án thể hiện trong source code hiện tại.

## Quyết định

Hệ thống kết hợp Redis và PostgreSQL để giữ nhất quán booking, với PostgreSQL là source of truth.

### Khóa chọn ghế

`BookingService.lockSeat` tạo key `seat_lock:<showSeatId>` trong Redis bằng `SET ... PX ... NX`. Khóa thuộc về `userId` và có TTL 15 phút. Cùng người dùng có thể làm mới TTL; người dùng khác bị từ chối khi khóa còn hiệu lực. `unlockSeat` chỉ xóa khóa khi giá trị khóa trùng người dùng hiện tại.

Trạng thái khóa Redis được trộn vào kết quả lấy danh sách ghế để client thấy ghế đang được giữ, nhưng không thay thế `ShowSeat.status` trong PostgreSQL.

### Tạo booking

`BookingService.createBooking` thực hiện các bước kiến trúc chính:

1. Xác thực request và kiểm tra thời điểm mở bán.
2. Nếu có `idempotencyKey`, trả booking đã tồn tại trước khi tạo booking mới. PostgreSQL có unique constraint cho trường này.
3. Tính giá, giới hạn vé và coupon từ dữ liệu PostgreSQL.
4. Lấy mutex Redis theo `lock:show:<showId>:booking` bằng `SET NX` với TTL 5 giây. Request không lấy được mutex bị từ chối với `system_busy_try_again`.
5. Trong Prisma transaction, kiểm tra ghế, kiểm tra seat lock, cập nhật `ShowSeat` thành `RESERVED`, cập nhật inventory, khóa coupon bằng `SELECT ... FOR UPDATE` và tạo `Booking` cùng `BookingItem`.
6. Inventory dùng conditional `updateMany` với điều kiện `soldQuantity` vẫn bằng giá trị vừa đọc. Nếu giá trị đã thay đổi, transaction bị từ chối thay vì ghi đè stale state.
7. Mutex theo show được giải phóng trong `finally` và chỉ xóa khi giá trị vẫn trùng owner token của request.
8. Sau transaction thành công, các seat lock liên quan được xóa và thay đổi ghế được phát qua `SeatGateway`.

Booking được tạo ở trạng thái `PENDING_PAYMENT`, có `expiresAt` sau 15 phút. Số lượng đã giữ được phản ánh ngay trong `TicketType.soldQuantity`; ghế cụ thể được phản ánh trong `ShowSeat.status`.

### Hoàn tất hoặc hủy booking

- VNPAY IPN thành công cập nhật `Payment`, chuyển `Booking` sang `PAID` và tạo `Ticket` trong Prisma transaction.
- VNPAY IPN thất bại chuyển booking sang `CANCELLED`, trả ghế về `AVAILABLE`, giảm `soldQuantity` và giảm `Coupon.usedCount` trong transaction.
- `BookingCronService` chạy mỗi phút, tìm booking `PENDING_PAYMENT` đã quá `expiresAt`, chuyển chúng sang `CANCELLED` và hoàn các tài nguyên tương ứng trong transaction.

Redis không giữ trạng thái booking cuối cùng và không được dùng để khôi phục booking đã commit.

## Lý do

**Có bằng chứng trực tiếp:** code sử dụng Redis `SET NX` cho mutex/seat lock, Prisma transaction cho các cập nhật liên quan, conditional update cho inventory và PostgreSQL row lock cho coupon. Schema đặt unique constraint trên `Booking.idempotencyKey`. Booking hết hạn được hoàn bằng scheduled job.

**Suy luận hợp lý:** Redis được dùng để giảm cạnh tranh trước khi đi vào transaction, còn PostgreSQL cung cấp tính bền vững và lớp kiểm tra cuối cùng. Thiết kế này tránh phải giữ row lock database trong toàn bộ 15 phút checkout.

**Cần xác minh:** repository không cho biết kết quả benchmark đã dẫn đến việc chọn TTL 5 giây, TTL booking 15 phút hoặc mutex theo toàn bộ show. Cũng chưa xác định được đội ngũ đã thử nghiệm các phương án khác trong môi trường production hay chưa.

## Hệ quả

### Tích cực

- Booking, inventory, ghế và coupon được cập nhật atomically trong PostgreSQL transaction.
- Conditional update ngăn stale `soldQuantity` âm thầm ghi đè thay đổi mới hơn.
- Khóa Redis có TTL giới hạn thời gian một khóa mồ côi có thể chặn request khác.
- Owner token ngăn một request xóa mutex thuộc request khác.
- Booking hết hạn được hoàn tài nguyên mà không phụ thuộc vào client quay lại.
- Web client nhận được cập nhật ghế sau khi giữ hoặc giải phóng.

### Tiêu cực

- Luồng booking không hoạt động bình thường nếu Redis không khả dụng, dù PostgreSQL vẫn hoạt động.
- Trạng thái khóa Redis và trạng thái ghế PostgreSQL có thể khác nhau trong một khoảng thời gian.
- Mutex theo toàn bộ show tuần tự hóa việc tạo booking cho cùng suất diễn nhiều hơn mutex theo ghế hoặc loại vé.
- Publish Socket.IO xảy ra ngoài hoặc trong callback transaction tùy luồng; client có thể bỏ lỡ event hoặc nhận event trước khi transaction hoàn tất trong một số đường lỗi.
- Không thấy reconciliation job so sánh Redis lock, `ShowSeat.status`, `soldQuantity`, booking và ticket.
- Không thấy transactional lock phối hợp giữa payment callback và cron hết hạn; cả hai luồng có thể cùng chọn một booking trước khi cập nhật trạng thái.
- `idempotencyKey` là tùy chọn, nên request không cung cấp key không có bảo vệ replay ở cấp booking.

### Trung tính

- Mọi thay đổi làm tăng hoặc giảm inventory phải cập nhật cùng các tài nguyên liên quan trong transaction.
- TTL Redis và `Booking.expiresAt` phải được duy trì phù hợp với trải nghiệm checkout.
- Các module payment và cleanup phải tuân theo cùng quy tắc hoàn ghế, inventory và coupon.
- Việc scale backend không loại bỏ nhu cầu Redis vì khóa phải được chia sẻ giữa các instance.

## Invariant và nguyên tắc bắt buộc

- PostgreSQL là source of truth cho booking, inventory, ghế, coupon, payment và ticket.
- Redis chỉ giữ cache hoặc khóa tạm thời; mất Redis key không được làm mất booking đã commit.
- `soldQuantity` không được vượt `totalQuantity` khi booking được tạo.
- Một `ShowSeat` chỉ được đưa vào booking khi thuộc đúng `showId` và còn khả dụng theo kiểm tra hiện tại.
- Việc tạo booking và cập nhật `ShowSeat`, `TicketType`, `Coupon` phải cùng nằm trong một Prisma transaction.
- Mutex Redis chỉ được xóa nếu owner token hiện tại trùng token của request đang giải phóng.
- Seat lock chỉ được chủ sở hữu làm mới hoặc chủ động mở khóa.
- Mỗi `idempotencyKey` khác null chỉ ánh xạ tới một booking trong PostgreSQL.
- Booking `PENDING_PAYMENT` quá hạn phải được hủy và hoàn đúng số tài nguyên đã giữ.
- Booking đã `PAID` không được cleanup như booking hết hạn.

## Failure Modes

| Failure mode | Ảnh hưởng | Cách hệ thống hiện tại xử lý | Khoảng trống hoặc rủi ro còn lại |
|---|---|---|---|
| Không lấy được mutex theo show | Không tạo được booking trong request hiện tại | Từ chối với `system_busy_try_again`; mutex tự hết hạn sau 5 giây | Không thấy retry/backoff phía backend hoặc metric lock contention |
| Redis không khả dụng | Không khóa/mở khóa ghế hoặc tạo booking được | Lỗi Redis được truyền lên global exception handling | Chưa tìm thấy fallback chỉ dùng PostgreSQL hoặc circuit breaker cho Redis |
| Process dừng sau khi lấy mutex | Request không hoàn tất | TTL Redis tự giải phóng mutex | Không có log/correlation chuyên biệt để truy vết khóa mồ côi |
| Inventory thay đổi sau khi được đọc | Có nguy cơ stale write/oversell | Conditional `updateMany` thất bại và transaction bị hủy | Client phải gửi lại request; chưa thấy retry tự động |
| Coupon bị dùng đồng thời | Có thể vượt `maxUsage` | `SELECT ... FOR UPDATE`, kiểm tra lại và tăng `usedCount` trong transaction | Row lock có thể tạo contention trên coupon phổ biến |
| Booking hết hạn chưa được xử lý | Ghế và inventory tiếp tục bị giữ | Cron quét mỗi phút và hoàn tài nguyên | Có độ trễ tới chu kỳ cron; chưa thấy alert expiration lag |
| Payment callback và cron cùng xử lý một booking | Có thể cập nhật trạng thái hoặc hoàn tài nguyên trùng | Mỗi luồng dùng transaction riêng | Chưa thấy conditional state transition hoặc lock chung giữa hai luồng |
| Event Socket.IO không gửi được | Client giữ view ghế cũ | REST lần sau vẫn đọc trạng thái PostgreSQL/Redis | Không thấy retry hoặc durable event cho seat update |
| Request lặp không có `idempotencyKey` | Có thể tạo nhiều booking | Các kiểm tra inventory và ghế vẫn được áp dụng | Không có dedup theo request nếu key bị bỏ qua |
| Redis bị xóa khi backend shutdown | Seat lock và mutex đang hoạt động bị mất | `RedisService.onModuleDestroy` gọi `flushall` | Có thể cho phép người khác chọn lại ghế trước khi state PostgreSQL phản ánh đầy đủ; cần xác minh đây có phải hành vi vận hành chủ ý |

## Tác động đến các thành phần

| Thành phần | Tác động |
|---|---|
| `BookingController` | Cung cấp endpoint tạo booking, lock/unlock ghế và áp dụng coupon |
| `BookingService` | Điều phối Redis lock, transaction, inventory và idempotency |
| `BookingCronService` | Hủy booking quá hạn và hoàn tài nguyên |
| `PaymentService` | Chuyển booking sang `PAID` hoặc `CANCELLED`, tạo vé hoặc hoàn tài nguyên |
| `ConcertsService` | Trộn `seat_lock` từ Redis vào trạng thái ghế trả về client |
| `SeatGateway` | Phát `seats_updated` sau thay đổi giữ hoặc giải phóng ghế |
| PostgreSQL/Prisma | Lưu trạng thái bền vững và thực thi transaction/constraint/row lock |
| Redis | Giữ mutex theo show và khóa ghế có TTL |
| `Booking`, `BookingItem` | Biểu diễn booking và tài nguyên đã giữ |
| `TicketType`, `ShowSeat`, `Coupon` | Các aggregate/data record bị cập nhật bởi booking lifecycle |
| Web checkout | Gọi lock/unlock, tạo booking và phản ánh cập nhật ghế thời gian thực |

## Bảo mật

ADR này không thay đổi authentication hoặc token lifecycle, nhưng có tác động trực tiếp đến integrity và authorization của tài nguyên:

- Các endpoint booking dùng `JwtAuthGuard` và giới hạn vai trò `AUDIENCE`.
- `getBooking` và thao tác coupon ràng buộc booking với `userId`; seat lock lưu `userId` làm owner.
- Không được tin dữ liệu giá hoặc currency từ client; service lấy giá từ `TicketType` trong PostgreSQL.
- `idempotencyKey` do client cung cấp hiện không được scope theo `userId`; lookup trả booking theo key mà không kèm điều kiện owner. Đây là rủi ro integrity/data exposure cần đội ngũ xác minh và xử lý ở quyết định hoặc implementation liên quan.
- Race condition là rủi ro bảo mật nghiệp vụ vì có thể làm sai inventory hoặc quyền giữ ghế.
- ADR không ghi lại secret Redis, connection string hoặc credential hạ tầng.

## Khả năng vận hành và quan sát

**Đã tồn tại:** `BookingCronService` log booking đã được giải phóng và lỗi cleanup. Redis service log sự kiện kết nối/lỗi. Các exception có reason như `system_busy_try_again`, `concurrent_modification_try_again` và `insufficient_capacity_at_checkout`.

**Chưa tìm thấy:**

- Metric tỷ lệ lấy mutex thất bại và thời gian chờ booking.
- Metric inventory conflict, oversell, expiration lag và số booking được hoàn.
- Correlation ID nối REST request, Redis key, booking, payment và WebSocket event.
- Dashboard/alert cho Redis availability, lock contention hoặc chênh lệch inventory.
- Reconciliation report giữa `soldQuantity`, booking còn hiệu lực và ticket đã phát hành.

Các metric và alert trên là nhu cầu quan sát hợp lý của quyết định, không phải chức năng đã được triển khai.

## Kiểm thử và xác minh

Repository có các script k6 dưới `src/apps/tests/k6`, trong đó `stress-booking.js` hướng tới kiểm tra oversell và conflict. Tuy nhiên script này dùng endpoint `/bookings/reservation` và payload `concertId`, trong khi controller hiện tại dùng `/bookings/reservations` và DTO yêu cầu `showId`; do đó chưa thể xem đây là bằng chứng kiểm thử tương thích với implementation hiện tại.

Chưa tìm thấy unit hoặc integration test trực tiếp cho `BookingService` và `BookingCronService`.

Quyết định nên được xác minh bằng:

- Concurrency test nhiều request mua cùng `TicketType` và cùng `ShowSeat`.
- Integration test bảo đảm transaction rollback toàn bộ khi một cập nhật inventory hoặc coupon thất bại.
- Test payment callback chạy đồng thời với expiration cron.
- Test idempotency cùng key, khác key và cùng key từ hai user.
- Failure injection khi Redis mất kết nối trước/sau khi PostgreSQL commit.
- Test process crash khi đang giữ mutex và xác minh TTL giải phóng khóa.
- Reconciliation assertion: tổng inventory giữ/bán phù hợp với booking và ticket sau tải đồng thời.

## Kế hoạch rollback hoặc thay thế

Quyết định này khó rollback trực tiếp vì booking lifecycle được phân tán qua `BookingService`, `PaymentService`, `BookingCronService`, `ConcertsService` và WebSocket client.

Chuyển sang PostgreSQL-only yêu cầu:

- Thay seat lock Redis bằng reservation record hoặc database advisory/row lock có TTL tương đương.
- Giữ tương thích với trạng thái checkout đang hiển thị cho client.
- Xử lý các Redis lock còn tồn tại trong giai đoạn chuyển tiếp.
- Kiểm thử lại contention và expiration lifecycle.

Chuyển sang Redis-authoritative inventory yêu cầu migration lớn hơn: atomic inventory model trong Redis, cơ chế persistence/reconciliation và quy tắc phục hồi khi Redis mất dữ liệu. Repository hiện chưa có các thành phần này.

Schema `Booking`, `BookingItem`, `ShowSeat` và `TicketType` vẫn cần được bảo toàn hoặc migration dữ liệu nếu thay đổi mô hình reservation.

## Tiêu chí đánh giá lại

ADR cần được xem xét lại khi:

- Lock contention theo show tạo tỷ lệ `system_busy_try_again` hoặc latency có thể đo lường vượt ngưỡng vận hành.
- Redis outage làm booking không khả dụng vượt mức chấp nhận.
- Phát hiện `soldQuantity`, `ShowSeat`, booking và ticket không nhất quán.
- Payment callback và expiration cron tạo double-release hoặc state transition sai.
- Nhu cầu scale nhiều instance yêu cầu cơ chế lock/realtime có bảo đảm mạnh hơn.
- Mô hình booking thay đổi từ giữ 15 phút sang queue, waiting room hoặc reservation service riêng.
- Load test chứng minh mutex theo toàn bộ show là bottleneck.
- Đội ngũ triển khai Redis atomic inventory, Lua script hoặc reconciliation làm thay đổi source of truth hiện tại.

## Bằng chứng trong repository

- `src/apps/backend/src/bookings/booking.service.ts`: Redis mutex, seat lock, Prisma transaction, conditional inventory update, coupon row lock và idempotency lookup.
- `src/apps/backend/src/bookings/booking.cron.ts`: quét booking hết hạn và hoàn ghế, inventory, coupon.
- `src/apps/backend/src/bookings/booking.controller.ts`: API và guard cho booking/seat/coupon.
- `src/apps/backend/src/bookings/booking.dto.ts`: `showId`, booking items và `idempotencyKey` tùy chọn.
- `src/apps/backend/src/payments/payment.service.ts`: hoàn tất hoặc hủy booking trong VNPAY IPN.
- `src/apps/backend/src/concerts/concerts.service.ts`: đọc Redis seat lock khi trả trạng thái ghế.
- `src/apps/backend/src/concerts/seat.gateway.ts`: phát cập nhật trạng thái ghế.
- `src/apps/backend/src/redis/redis.service.ts`: Redis connection và lifecycle.
- `src/apps/backend/prisma/schema.prisma`: PostgreSQL datasource và các model/constraint liên quan.
- `src/apps/backend/package.json`: dependency `@prisma/client`, `prisma` và `ioredis`.
- `src/infra/redis.yaml`: Redis container, persistence và healthcheck cho môi trường được mô tả trong repository.
- `src/apps/tests/k6/stress-booking.js`: ý định kiểm thử oversell, nhưng interface hiện không còn khớp code.
- `blueprint/specs/booking.md`: mô tả hiện trạng booking đã được đối chiếu với code.
- `blueprint/design.md`: mô tả kiến trúc tổng thể; một số mục là định hướng, không phải implementation.
- `openspec/changes/ticket-booking-system/design.md`: tài liệu phương án; có nội dung Redis atomic/Lua chưa xuất hiện trong code hiện tại.

## Tham khảo

- `blueprint/specs/booking.md`
- `blueprint/design.md`
- `blueprint/specs/system-architecture.md`
- `openspec/changes/ticket-booking-system/design.md`
- `openspec/changes/ticket-booking-system/specs/booking-inventory-consistency/spec.md`
- `docs/c4-ticketbox-architecture.md`
