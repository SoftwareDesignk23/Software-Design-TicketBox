# ADR-006: Cập nhật thời gian thực bằng Socket.IO

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Lê Thành Công
- Phạm vi: Cập nhật ghế và thông báo in-app từ backend tới web client
- Liên quan: ADR-001, ADR-003, ADR-004, ADR-007, `blueprint/specs/system-architecture.md`

## Bối cảnh

TicketBox có hai loại dữ liệu mà client cần biết sớm hơn chu kỳ tải trang thông thường:

- trạng thái ghế thay đổi khi người dùng khóa, mở khóa, tạo booking hoặc khi booking/payment giải phóng ghế;
- thông báo in-app mới sau khi notification service xử lý thành công.

Chỉ dùng REST polling cho sơ đồ ghế có thể làm nhiều người nhìn thấy trạng thái cũ trong lúc cạnh tranh giữ ghế. Polling thông báo liên tục cũng tạo request dù không có dữ liệu mới. Backend NestJS và web React hiện cùng sử dụng Socket.IO để đẩy delta tới các room theo show hoặc user.

Repository có hai namespace:

- `/seats`: client gửi `join_show`/`leave_show`, tham gia room `show_{showId}` và nhận `seats_updated`.
- `/notifications`: client gửi `join_user_room`, tham gia room `user_{userId}` và nhận `new_notification`.

Socket.IO chỉ cập nhật giao diện. PostgreSQL/Redis và các REST command vẫn quyết định trạng thái ghế, booking và notification. Web tải snapshot ghế bằng REST trước khi áp dụng delta; notification hook vẫn poll REST mỗi 30 giây và dùng socket để kích hoạt refetch sớm.

## Decision Drivers

- Phản hồi trạng thái ghế nhanh cho nhiều người đang xem cùng show.
- Giảm polling dày đặc cho dữ liệu thay đổi không đều.
- Định tuyến event theo room thay vì broadcast tới mọi client.
- Tích hợp trực tiếp với NestJS và React bằng thư viện đang dùng.
- Hỗ trợ tự reconnect ở client khi mất kết nối ngắn hạn.
- Giữ REST/PostgreSQL/Redis làm nguồn xác nhận cuối cùng.
- Cho phép notification UI cập nhật sau xử lý RabbitMQ mà không chờ lần poll tiếp theo.
- Không đưa logic đặt ghế hoặc phân quyền quyết định vào WebSocket event phía client.

## Các phương án được xem xét

Repository không lưu đầy đủ benchmark hoặc biên bản so sánh lịch sử. Các phương án dưới đây là phân tích kiến trúc; source code là bằng chứng cho phương án được chọn.

### Phương án 1: Chỉ REST polling

Client định kỳ tải lại ghế và thông báo.

Ưu điểm:

- Dùng cùng authentication/API stack hiện tại.
- Dễ scale qua HTTP stateless và dễ phục hồi snapshot.
- Không cần connection state hoặc room management.

Nhược điểm:

- Tạo request ngay cả khi không có thay đổi.
- Trade-off giữa latency thấp và tải backend cao.
- Ghế dễ hiển thị cũ giữa hai lần poll.

### Phương án 2: Server-Sent Events (SSE)

Backend giữ stream một chiều từ server tới client; command vẫn qua REST.

Ưu điểm:

- Phù hợp với luồng server-to-client và giao thức đơn giản hơn WebSocket.
- Browser có cơ chế reconnect cơ bản.

Nhược điểm:

- Room join/leave và authentication cần quy ước riêng.
- Client gửi subscribe change qua REST hoặc reconnect URL.
- Mobile/browser/proxy behavior cần kiểm chứng riêng.

### Phương án 3: Socket.IO với namespace và room

Client duy trì connection hai chiều, gửi event tham gia room và nhận delta.

Ưu điểm:

- Room và namespace phù hợp với show/user fan-out.
- Có reconnect, heartbeat và transport fallback do thư viện cung cấp.
- NestJS có gateway integration trực tiếp.

Nhược điểm:

- Cần xác thực handshake và authorize room membership.
- Multi-instance cần shared adapter và thường cần load-balancer configuration.
- Event không tự có durable replay, exactly-once hoặc ordering nghiệp vụ.

Đây là phương án được triển khai.

## Quyết định

Sử dụng Socket.IO như kênh cập nhật best-effort, không phải system of record hoặc command authority.

### Seat updates

1. `SeatGateway` chạy tại namespace `/seats`.
2. Client tham gia room `show_{showId}` bằng `join_show` và rời bằng `leave_show`.
3. Backend phát `seats_updated` chứa mảng `{ showSeatId, status, lockedBy? }` tới room của show.
4. `BookingService`, booking expiry cron và `PaymentService` gọi gateway sau các thao tác khóa/giải phóng ghế ở những vị trí hiện tại.
5. Web tải snapshot ghế từ REST, sau đó merge delta theo `showSeatId`.
6. Thao tác lock/unlock/booking vẫn đi qua REST; nhận event không chứng minh client sở hữu ghế.

### Notification updates

1. `NotificationGateway` chạy tại namespace `/notifications`.
2. Client tham gia room `user_{userId}` bằng `join_user_room`.
3. Khi notification IN_APP đã được lưu và provider trả thành công, backend phát `new_notification`.
4. Web không dùng socket payload làm nguồn danh sách cuối cùng; event kích hoạt invalidation/refetch REST.
5. REST polling 30 giây là cơ chế soft-consistency khi event bị bỏ lỡ.

### Ràng buộc bắt buộc

- Connection/room notification phải được xác thực; `userId` room phải lấy từ identity đã xác minh, không tin payload client.
- Event chỉ nên phát sau khi transaction tạo ra trạng thái tương ứng đã commit.
- Client phải có khả năng tải lại snapshot sau reconnect hoặc khi phát hiện gap.
- Scale nhiều backend instance phải dùng shared Socket.IO adapter/pub-sub và load-balancer setup phù hợp.

Các ràng buộc trên thể hiện trạng thái kiến trúc cần duy trì. Code hiện tại chưa đáp ứng đầy đủ authentication/authorization room, post-commit emission, replay/version và multi-instance adapter.

## Lý do

Socket.IO phù hợp với hai kiểu fan-out hiện tại: nhiều client theo một show và một/nhiều session theo một user. Room giúp backend chỉ gửi delta cho người quan tâm, còn Nest gateway cho phép service gọi phát event trong cùng modular monolith.

Việc xem event như hint thay vì nguồn dữ liệu chuẩn là cần thiết vì Socket.IO không lưu durable history trong implementation hiện tại. REST snapshot, PostgreSQL và Redis vẫn cho phép client khôi phục sau disconnect hoặc event bị mất.

## Hệ quả

### Tích cực

- Trạng thái ghế được phản ánh nhanh hơn polling đơn thuần.
- Room theo show giảm broadcast không liên quan.
- Room theo user hỗ trợ nhiều tab/session nhận cùng thông báo.
- Notification event kích hoạt refetch dữ liệu đã lưu trong PostgreSQL.
- Backend tái sử dụng service/gateway trong cùng Nest process.
- Web client giới hạn reconnect còn ba lần thay vì lặp vô hạn.

### Tiêu cực

- Hai gateway hiện không xác thực handshake hoặc room join.
- Notification client tự gửi `userId`; bất kỳ socket nào cũng có thể thử tham gia room người khác.
- Gateway CORS hiện là `origin: '*'`, làm tăng bề mặt truy cập từ origin không tin cậy.
- `new_notification` phát toàn bộ notification record/payload; payload thanh toán có thể chứa email, thông tin vé hoặc QR.
- Seat event có thể phát `lockedBy` là user ID tới mọi client trong room show.
- Không có event ID, sequence, version hoặc replay; client không phát hiện chắc chắn event mất/đảo thứ tự.
- Không thấy Redis/cluster Socket.IO adapter; nhiều backend instance chỉ phát tới socket gắn với instance cục bộ.
- Không có delivery acknowledgement từ client hoặc durable queue cho socket event.
- Một số seat event được phát bên trong Prisma transaction; transaction rollback sau đó có thể để client thấy trạng thái chưa commit.
- Payload dùng type lỏng (`any` hoặc string status), không có schema/version runtime chung với client.

### Trung lập

- Socket.IO connection thuộc backend modular monolith; gateway restart cùng backend.
- Notification vẫn poll 30 giây, nên Socket.IO tối ưu latency chứ không loại bỏ REST read path.
- Seat client dừng realtime sau lỗi reconnect giới hạn và tiếp tục với dữ liệu tĩnh cho tới khi tải lại.

## Các invariant cần duy trì

- PostgreSQL/Redis và REST command là nguồn trạng thái cuối cùng; socket event không cấp quyền sở hữu ghế.
- Chỉ backend phát `seats_updated` và `new_notification`.
- User chỉ được join notification room tương ứng identity đã xác thực.
- Room show phải được validate và chỉ nhận dữ liệu public tối thiểu cần thiết.
- Event chỉ phát sau commit hoặc có cơ chế reconciliation nếu phát sớm.
- Client phải tải snapshot ban đầu và refetch sau reconnect/gap.
- Event payload phải có schema/version ổn định và không chứa secret/PII không cần thiết.
- Mọi client phải chịu được duplicate, missing và out-of-order event.
- Multi-instance phải có shared adapter trước khi được xem là realtime toàn cụm.
- Socket failure không được làm rollback nghiệp vụ đã commit.

Authentication room, payload minimization, sequence/replay và shared adapter hiện chưa được code thực thi đầy đủ.

## Failure Modes

| Tình huống | Hành vi hiện tại | Ảnh hưởng | Giảm thiểu/việc cần làm |
|---|---|---|---|
| Socket không kết nối được | Web thử reconnect ba lần; seat flow chuyển sang dữ liệu tĩnh | Ghế có thể hiển thị cũ | Poll/refetch ghế định kỳ hoặc theo focus/reconnect |
| Notification event bị mất | REST poll 30 giây vẫn tải dữ liệu | Thông báo hiển thị trễ | Giữ polling và refetch khi focus |
| Seat event bị mất khi disconnect | Không có replay/refetch bắt buộc sau reconnect | Client giữ delta thiếu | Snapshot refresh khi reconnect |
| Event đến sai thứ tự | Không có sequence/version | Trạng thái cũ có thể ghi đè mới | Version theo seat và bỏ event cũ |
| Client giả `userId` | Gateway tin payload `join_user_room` | Có thể đọc notification của user khác | JWT handshake và derive room từ token |
| Origin độc hại kết nối | Gateway cho CORS `*` | Tăng khả năng khai thác room không bảo vệ | Allowlist origin và authentication |
| Payload notification chứa dữ liệu vé | Gateway phát record/payload tới room | Rò rỉ PII/QR nếu room bị chiếm | Payload tối thiểu; event chỉ mang notification ID |
| Seat event chứa `lockedBy` | User ID được broadcast theo show | Lộ định danh không cần thiết | Dùng cờ `lockedByMe` ở response riêng hoặc opaque owner token |
| Transaction rollback sau emit | Cron/payment có emit trong transaction callback | UI thấy trạng thái không tồn tại trong DB | Ghi event sau commit/outbox |
| Backend restart | Tất cả connection cục bộ bị ngắt | Khoảng trống event cho tới reconnect | Reconnect + snapshot recovery |
| Nhiều backend instance | Default in-memory adapter chỉ biết socket local | Client instance khác không nhận event | Redis adapter/pub-sub và sticky-session review |
| Room không được rời rõ ở notification | Chỉ disconnect dọn membership | Session đổi user sai cách có thể còn room cũ | Re-auth/reconnect hoặc `leave_user_room` |
| Payload thay đổi không tương thích | Không có schema/version | Client runtime lỗi hoặc bỏ event | Shared schema/contract test |
| Gateway emit lỗi | Không thấy xử lý/metric riêng | UI không cập nhật dù business state đã đổi | Treat emit best-effort, log/metric và REST recovery |

## Thành phần bị ảnh hưởng

| Thành phần | Vai trò |
|---|---|
| `SeatGateway` | Namespace `/seats`, show room và `seats_updated` |
| `BookingService` | Phát event khi lock, unlock hoặc reserve ghế |
| Booking expiry cron | Phát event khi giải phóng ghế hết hạn |
| `PaymentService` | Phát event khi thanh toán thất bại giải phóng ghế |
| `NotificationGateway` | Namespace `/notifications`, user room và `new_notification` |
| `NotificationService` | Phát notification sau khi IN_APP thành công |
| Web `SeatSelectionPage` | REST snapshot, join show và merge seat delta |
| Web `useNotifications` | Join user room, refetch event và polling fallback |
| Load balancer/backend replicas | Connection routing và cross-instance fan-out |

## Bảo mật

- Rủi ro lớn hiện tại: gateway không xác thực socket, notification room tin `userId` từ client và CORS cho mọi origin.
- WebSocket handshake phải xác minh JWT bằng cùng quy tắc/revocation policy của HTTP auth.
- Server phải lấy user ID từ token; không cho client chọn room notification tùy ý.
- Authorization phải được kiểm tra lại khi token hết hạn hoặc user bị vô hiệu hóa.
- `new_notification` nên chỉ mang ID/type tối thiểu rồi client dùng REST có guard để tải chi tiết.
- Không broadcast QR payload, attendee email, token hoặc thông tin thanh toán qua room không được bảo vệ.
- `lockedBy` không nên là raw user ID cho client khác.
- CORS origin cần allowlist theo môi trường; CORS không thay thế authentication.
- Cần rate limit connection/join event và giới hạn độ dài/định dạng `showId`.
- Log connection không nên ghi token hoặc payload nhạy cảm.

## Vận hành và quan sát

Gateway hiện log connect, disconnect, room join/leave và số seat update được emit. Client log connect/connect error. Notification có REST polling làm fallback.

Chưa thấy trong repository:

- metric connection count, room size, emit rate, delivery latency và error;
- JWT authentication middleware cho Socket.IO;
- shared adapter cho backend replicas;
- connection draining khi deploy;
- event ID/correlation với REST transaction hoặc RabbitMQ message;
- alert cho reconnect storm hoặc dropped connection;
- dashboard namespace/room;
- schema registry/validation cho event payload;
- runbook scale hoặc incident realtime.

## Chiến lược kiểm thử

Không tìm thấy automated test chuyên biệt cho hai gateway trong các đường dẫn đã rà soát. Không chạy test trong quá trình lập ADR.

Cần bổ sung:

- kết nối/join/leave đúng namespace và room;
- từ chối socket thiếu, sai hoặc hết hạn JWT;
- user không thể join room của user khác;
- event show chỉ tới client trong đúng room;
- notification payload không chứa trường nhạy cảm;
- initial snapshot cộng delta cho kết quả đúng;
- reconnect bắt buộc refetch và chịu được event bị mất;
- duplicate/out-of-order event không làm lùi trạng thái;
- transaction rollback không phát trạng thái giả;
- hai backend instance với shared adapter vẫn fan-out đúng;
- REST polling notification khôi phục khi socket tắt;
- load test connection, room churn và broadcast lớn.

## Rollback hoặc thay thế

Có thể tắt Socket.IO mà không mất dữ liệu nghiệp vụ vì REST/PostgreSQL/Redis vẫn là nguồn chuẩn. Notification đã có polling 30 giây; seat flow cần bổ sung polling/refetch trước khi tắt realtime để tránh UI cũ.

Nếu thay bằng SSE hoặc broker-to-edge gateway:

1. Giữ event name/payload version hoặc triển khai dual-consume ở client.
2. Chuyển authentication và room/filter semantics sang transport mới.
3. Chạy song song, so sánh delivery và snapshot reconciliation.
4. Ngừng client join Socket.IO sau khi fallback hoạt động.
5. Drain connection cũ rồi gỡ gateway/dependency.

## Tiêu chí xem xét lại

- Backend cần chạy nhiều replica hoặc scale gateway riêng.
- Rò rỉ room/payload hoặc yêu cầu bảo mật buộc thay đổi handshake.
- Seat event loss/out-of-order gây sai UI đáng kể.
- Connection count hoặc broadcast throughput ảnh hưởng backend HTTP.
- Cần durable replay, offline delivery hoặc audit event.
- Mobile/admin cũng cần realtime và contract hiện tại không mở rộng tốt.
- Notification polling đủ đáp ứng và Socket.IO không mang lại lợi ích tương xứng.
- SSE/managed realtime service giảm vận hành đáng kể.
- Cần tách WebSocket gateway khỏi modular monolith.

## Bằng chứng trong repository

- `src/apps/backend/src/concerts/seat.gateway.ts`: namespace, CORS, room và seat event.
- `src/apps/backend/src/notifications/notification.gateway.ts`: user room không xác thực và notification event.
- `src/apps/backend/src/concerts/concerts.module.ts`: đăng ký/export `SeatGateway`.
- `src/apps/backend/src/notifications/notification.module.ts`: đăng ký `NotificationGateway` trong backend.
- `src/apps/backend/src/bookings/booking.service.ts`: emit khi lock/unlock/reserve ghế.
- `src/apps/backend/src/bookings/booking.cron.ts`: emit khi booking hết hạn giải phóng ghế.
- `src/apps/backend/src/payments/payment.service.ts`: emit khi payment thất bại giải phóng ghế.
- `src/apps/backend/src/notifications/notification.service.ts`: emit record notification IN_APP sau provider success.
- `src/apps/ui/web/src/features/checkout/SeatSelectionPage.jsx`: REST snapshot, Socket.IO reconnect và merge delta.
- `src/apps/ui/web/src/features/notifications/hooks/useNotifications.js`: user room, query invalidation và polling 30 giây.
- `src/apps/backend/package.json`: Nest WebSocket/Socket.IO dependencies.
- `src/apps/ui/web/package.json`: `socket.io-client` dependency.
- `blueprint/specs/system-architecture.md`: mô tả hai namespace và event.
- `blueprint/specs/notification.md`: luồng notification in-app.

## Cần xác minh

- Production hiện chạy một hay nhiều backend replica.
- Có load balancer sticky session hoặc Socket.IO adapter được cấu hình ngoài repository hay không.
- Gateway có được bảo vệ bởi proxy/auth middleware ngoài source hay không.
- Notification payload production có chứa QR/PII đầy đủ như payment event hay đã được lọc ở lớp khác.
- Mức chấp nhận stale seat UI và chiến lược refetch khi socket lỗi.
- Có monitoring, WAF/rate limit hoặc connection limit ngoài repository hay không.
- Thứ tự emit trong transaction có từng gây phantom update thực tế hay không.
- Lịch sử đánh giá Socket.IO so với SSE/polling không được lưu trong repository.

## Tham chiếu

- `docs/adr/ADR-001-modular-monolith-three-independent-clients.md`
- `docs/adr/ADR-003-jwt-refresh-token-rotation-rbac.md`
- `docs/adr/ADR-004-booking-consistency-redis-postgresql.md`
- `docs/adr/ADR-007-rabbitmq-asynchronous-communication.md`
- `blueprint/specs/system-architecture.md`
- `blueprint/specs/notification.md`
- `blueprint/specs/booking.md`
- `blueprint/design.md`
