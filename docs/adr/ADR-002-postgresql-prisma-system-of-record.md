# ADR-002: PostgreSQL và Prisma làm system of record

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Chưa xác định
- Phạm vi: Toàn bộ backend modular monolith và dữ liệu nghiệp vụ bền vững
- Liên quan: ADR-003, ADR-004, ADR-009, `blueprint/design.md`, `blueprint/specs/system-architecture.md`

## Bối cảnh

TicketBox quản lý nhiều aggregate có quan hệ và vòng đời phụ thuộc nhau: user, organizer, concert, show, seat, ticket type, booking, payment, ticket, check-in log, notification và background job. Các luồng booking, payment, refresh-token rotation, guest-list import và check-in cần cập nhật nhiều record có ràng buộc trong cùng một đơn vị giao dịch.

Hệ thống đồng thời dùng Redis, RabbitMQ, Cloudinary và SQLite, nhưng các thành phần này phục vụ vai trò khác:

- Redis giữ cache concert và khóa tạm thời cho booking/seat.
- RabbitMQ vận chuyển domain event và background job.
- Cloudinary lưu nội dung object; PostgreSQL giữ URL/thông tin liên quan.
- SQLite trên mobile giữ snapshot vé và log check-in provisional.

Hệ thống cần một nguồn dữ liệu bền vững chung để các module có thể xác định trạng thái cuối cùng sau cache miss, service restart, payment callback hoặc offline sync.

Các ràng buộc quan sát được:

- Backend hiện là một NestJS modular monolith, không phải các service triển khai độc lập.
- Tất cả module nghiệp vụ dùng chung một Prisma schema và một PostgreSQL datasource.
- Domain có nhiều foreign key, unique constraint, composite key, enum và cascade/restrict rule.
- Các giá trị tiền dùng `Decimal(12,2)`.
- Một số đường concurrency phụ thuộc transaction và PostgreSQL-specific row locking.
- Repository có seed scripts và Prisma commands nhưng không có migration history được commit.

Nếu không có một system of record duy nhất, trạng thái booking, payment, ticket và check-in có thể mâu thuẫn giữa cache, queue, local device và các module backend.

## Decision Drivers

- Transaction ACID cho các cập nhật nhiều bảng.
- Referential integrity giữa các aggregate có quan hệ chặt chẽ.
- Unique constraint và index ở database làm lớp bảo vệ bền vững.
- Kiểu `Decimal` phù hợp dữ liệu tiền tệ.
- Một schema/type contract dùng chung trong TypeScript backend.
- Hỗ trợ row lock, conditional update và raw SQL ở các hot path.
- Khả năng truy vấn báo cáo/admin trên dữ liệu quan hệ.
- Giữ Redis, RabbitMQ và SQLite ở vai trò phụ trợ thay vì nguồn dữ liệu cuối cùng.
- Phù hợp topology modular monolith hiện tại.

## Các phương án được xem xét

Repository không có biên bản chứng minh đội ngũ đã đánh giá chính thức toàn bộ các phương án dưới đây. Blueprint/OpenSpec có nhắc database chung, database theo service và PostgreSQL, nhưng một phần tài liệu là thiết kế định hướng. Chỉ có thể khẳng định phương án thứ hai là implementation hiện tại.

### Phương án 1: PostgreSQL với truy cập SQL/repository thủ công

Backend dùng PostgreSQL nhưng tự quản lý SQL, mapping model và repository abstraction.

Ưu điểm:

- Kiểm soát hoàn toàn câu SQL và tính năng PostgreSQL.
- Ít phụ thuộc vào ORM/client generator.
- Dễ tối ưu riêng từng truy vấn phức tạp.

Nhược điểm:

- Phải tự duy trì mapping, type và CRUD boilerplate.
- Khó giữ model TypeScript đồng bộ với schema nếu không có tooling bổ sung.
- Tăng chi phí phát triển cho nhiều quan hệ domain.

### Phương án 2: Một PostgreSQL datasource với Prisma

Prisma schema định nghĩa model, enum, relation, constraint và index; `PrismaService` cung cấp client dùng chung cho các module. Raw SQL chỉ dùng tại các điểm Prisma API không biểu đạt đầy đủ row-lock semantics.

Ưu điểm:

- Prisma Client sinh type từ schema và hỗ trợ CRUD/relation thống nhất.
- Transaction và constraint của PostgreSQL vẫn là lớp consistency bền vững.
- Một datasource phù hợp transaction xuyên các record trong modular monolith.
- Có thể dùng tagged `$queryRaw` cho `FOR UPDATE`/`SKIP LOCKED` khi cần.

Nhược điểm:

- Service phụ thuộc trực tiếp Prisma API và generated types.
- Một schema/database chung làm tăng coupling giữa module.
- Raw PostgreSQL query làm giảm khả năng đổi database provider.

Đây là phương án đang được triển khai.

### Phương án 3: Database per module/service hoặc polyglot persistence

Mỗi bounded context có schema/database riêng; một số domain có thể dùng document store hoặc Redis làm primary state.

Ưu điểm:

- Ranh giới ownership và scale độc lập rõ hơn.
- Có thể chọn database phù hợp từng workload.
- Giảm direct table coupling giữa các service độc lập.

Nhược điểm:

- Transaction xuyên booking, payment và ticket trở thành distributed consistency problem.
- Tăng yêu cầu event, idempotency, reconciliation và vận hành.
- Không phù hợp topology một backend hiện tại nếu chưa có service boundary độc lập.
- Repository chưa có database-per-module, schema-per-service hoặc saga/outbox đầy đủ.

## Quyết định

TicketBox dùng PostgreSQL làm system of record cho dữ liệu nghiệp vụ bền vững và Prisma làm data-access client chính trong backend NestJS.

### Data topology

`schema.prisma` khai báo một datasource `postgresql` với `DATABASE_URL` và `DIRECT_URL`. Mọi model nghiệp vụ nằm trong cùng logical schema và được truy cập qua một generated Prisma Client.

`PrismaService` kế thừa `PrismaClient`, kết nối khi Nest module khởi tạo và ngắt kết nối khi ứng dụng shutdown. `PrismaModule` export service này cho các module nghiệp vụ.

Các service gọi `PrismaService` trực tiếp; repository không có lớp repository/domain persistence abstraction riêng giữa service và Prisma.

### Dữ liệu authoritative

PostgreSQL giữ trạng thái cuối cùng của:

- Identity và authorization: `User`, `RefreshSession`, `ConcertAssignment`.
- Catalog: `Concert`, `ConcertShow`, `Venue`, `Artist`, `Sponsor`, `Gate`, `TicketType`, seat models.
- Giao dịch: `Booking`, `BookingItem`, `Coupon`, `Payment`, `Ticket`.
- Vận hành: `CheckInLog`, `Notification`, `BackgroundJob`.

Redis key không thay thế các record trên. Cache miss phải có thể tái tạo từ PostgreSQL; mất seat lock không được làm mất booking đã commit. SQLite check-in chỉ là local working copy; sau sync, `Ticket` và `CheckInLog` quyết định trạng thái cuối cùng. RabbitMQ message là tín hiệu xử lý, không phải ledger nghiệp vụ.

### Integrity và transaction

Prisma schema dùng:

- UUID primary key cho phần lớn model.
- Foreign key relation với `Cascade`, `Restrict` hoặc `SetNull` tùy quan hệ.
- Unique constraint cho email, ticket code, booking idempotency key, provider reference và các composite identity.
- Index cho các query user, concert, booking, ticket, check-in và notification.
- Enum cho role và các state machine chính.
- PostgreSQL `Decimal(12,2)` cho amount/price.
- `Json` cho payload linh hoạt như notification, job result và payment raw payload.

Các transition nhiều record dùng Prisma transaction, bao gồm booking/inventory/coupon, payment/ticket issuance, refresh-token rotation, guest-list row processing và online check-in. Code dùng tagged `$queryRaw` với `FOR UPDATE` cho coupon và `FOR UPDATE SKIP LOCKED` khi chọn ghế guest-list.

### Quan hệ với các store khác

- Concert cache được xóa sau mutation PostgreSQL và tái tạo khi đọc.
- Redis booking/seat lock giảm cạnh tranh trước transaction nhưng PostgreSQL giữ booking/inventory đã commit.
- Payment success publish RabbitMQ event sau khi cập nhật dữ liệu trong payment flow; repository chưa triển khai transactional outbox.
- Notification/background-job state được lưu PostgreSQL dù việc kích hoạt/xử lý dùng RabbitMQ hoặc cron.
- File/blob nằm ở Cloudinary hoặc local temporary storage; database giữ URL và metadata domain.

`schema.prisma` là mô tả schema hiện tại trong source. Tuy nhiên không có thư mục `prisma/migrations` trong repository, nên chưa thể xem repository là nguồn đầy đủ của lịch sử migration database.

## Lý do

**Có bằng chứng trực tiếp:** Prisma datasource chọn PostgreSQL; mọi module nghiệp vụ inject `PrismaService`; schema chứa toàn bộ model quan hệ; nhiều luồng sử dụng `$transaction`, unique constraint và PostgreSQL row lock. Blueprint/C4 ghi PostgreSQL là system of record.

**Suy luận hợp lý:** database quan hệ chung phù hợp modular monolith và giảm độ phức tạp distributed transaction giữa booking, payment, ticket và check-in. Prisma giảm mapping boilerplate và giữ TypeScript type gần schema.

**Cần xác minh:** repository không ghi rõ benchmark, quy mô dữ liệu, lý do chọn Prisma thay ORM khác, cách database production được triển khai hoặc quyết định không commit migration history.

## Hệ quả

### Tích cực

- Một nguồn dữ liệu bền vững thống nhất cho các module.
- Transaction database bảo vệ transition nhiều record.
- Foreign key và unique constraint phát hiện một số trạng thái không hợp lệ ngoài application check.
- Generated Prisma Client cung cấp model/type thống nhất trong TypeScript.
- PostgreSQL hỗ trợ row lock cần cho coupon và guest-list seat allocation.
- Redis/cache/SQLite có thể được xem là state tái tạo hoặc provisional thay vì authority cạnh tranh.
- Admin/reporting có thể truy vấn quan hệ domain trực tiếp qua Prisma.

### Tiêu cực

- PostgreSQL là dependency trọng yếu; phần lớn chức năng backend dừng khi database không khả dụng.
- Một database/schema chung làm các module coupling qua model và transaction.
- Service phụ thuộc trực tiếp Prisma, nên đổi ORM hoặc tách service đòi hỏi refactor rộng.
- Raw SQL `FOR UPDATE`/`SKIP LOCKED` và `Decimal` làm thiết kế gắn với PostgreSQL semantics.
- Không có migration history được commit làm tăng rủi ro schema drift và khó tái tạo database theo version.
- Không thấy backup, point-in-time recovery, replica, failover hoặc connection-pool policy trong repository.
- Publish event không có outbox có thể lệch với transaction: database đã commit nhưng RabbitMQ event không được publish, hoặc event được publish trước khi transaction outer commit hoàn tất ở một số flow.
- Cascade delete có thể xóa lượng lớn dữ liệu liên quan nếu application cho phép xóa parent record.
- PII, credential hash, payment payload và attendee data tập trung trong một database làm tăng blast radius bảo mật.

### Trung tính

- Mọi thay đổi model cần regenerate Prisma Client và đồng bộ schema database.
- Module muốn dùng transaction xuyên repository phải dùng cùng Prisma datasource/client context.
- Cache invalidation và event payload phải được phát sinh từ state PostgreSQL đã được chấp nhận.
- Dữ liệu JSON linh hoạt không nhận được cùng mức schema enforcement như column quan hệ.
- Các environment phải cung cấp database connection configuration phù hợp mà không commit credential.

## Invariant và nguyên tắc bắt buộc

- PostgreSQL là source of truth cho dữ liệu nghiệp vụ bền vững.
- Redis cache/lock, RabbitMQ message và mobile SQLite không được xem là nguồn dữ liệu cuối cùng cho booking, payment, ticket hoặc check-in.
- Transition nhiều record có yêu cầu all-or-nothing phải chạy trong một Prisma transaction.
- Integrity quan trọng phải được bảo vệ bằng constraint/index database khi schema hiện có hỗ trợ, không chỉ bằng kiểm tra trước trong application.
- Giá trị tiền phải dùng `Decimal`, không chuyển thành floating-point trong phép tính authoritative.
- Raw SQL phải dùng parameter binding/tagged template và được review cho PostgreSQL semantics.
- Mutation tạo dữ liệu cacheable phải invalidation cache liên quan hoặc chấp nhận rõ khoảng stale.
- Mỗi thay đổi schema phải có quy trình migration có thể tái tạo và rollback; quy trình này hiện cần xác minh vì migration files không có trong repository.
- Event/notification không được trở thành bằng chứng duy nhất rằng transaction nghiệp vụ đã thành công.
- Local check-in chỉ được coi server-final sau khi trạng thái tương ứng tồn tại trong PostgreSQL.
- Không ghi database credential hoặc dữ liệu production vào source, ADR, seed hay log.

## Failure Modes

| Failure mode | Ảnh hưởng | Cách hệ thống hiện tại xử lý | Khoảng trống hoặc rủi ro còn lại |
|---|---|---|---|
| PostgreSQL không kết nối được khi startup | Backend không thể phục vụ phần lớn chức năng | `PrismaService.onModuleInit` chờ `$connect` và startup thất bại/ném lỗi | Không thấy retry policy, readiness probe hoặc degraded mode |
| PostgreSQL mất kết nối khi đang chạy | Query/transaction thất bại | Lỗi đi qua application/global exception handling | Không thấy circuit breaker, database-specific retry hoặc failover config |
| Transaction bị deadlock/serialization conflict | Request thất bại hoặc rollback | PostgreSQL/Prisma rollback transaction | Không thấy retry có giới hạn cho transient database error ở các hot path |
| Schema database lệch `schema.prisma` | Runtime query lỗi hoặc thiếu column/constraint | Chưa tìm thấy cơ chế tự động phát hiện | Không có committed migration history hoặc CI migration check |
| Deploy code mới trước schema tương thích | Request phiên bản mới thất bại | Chưa tìm thấy backward-compatible deployment strategy | Không có expand/contract migration policy |
| Database commit thành công nhưng RabbitMQ publish thất bại | Notification/job downstream bị mất | Một số flow catch/log publish error | Không có transactional outbox/reconciliation chung |
| RabbitMQ nhận event nhưng transaction database chưa commit | Consumer có thể quan sát state chưa sẵn sàng | Chưa tìm thấy cơ chế phối hợp | Publish nằm trong transaction callback ở payment flow; cần integration test |
| Redis cache chứa dữ liệu cũ | Client đọc state không mới | Mutation chủ động xóa các cache key concert liên quan | Invalidation thủ công có thể bị bỏ sót; không có cache version/reconciliation |
| Xóa parent có cascade relation | Dữ liệu con bị xóa hàng loạt | Prisma/PostgreSQL thực thi `onDelete` đã khai báo | Cần xác minh authorization, backup và audit cho destructive operation |
| Query lớn hoặc N+1 làm cạn connection pool | Latency tăng, request timeout | Chưa tìm thấy cơ chế xử lý cụ thể | Không có query metric, slow-query dashboard hoặc pool sizing trong repo |
| `DIRECT_URL`/`DATABASE_URL` cấu hình sai | Migration/runtime có thể trỏ khác database | Prisma đọc environment tương ứng | Không thấy deployment validation bảo đảm hai URL đúng môi trường |
| Seed chạy nhầm production | Có thể ghi/ghi đè dữ liệu không mong muốn | Seed là command thủ công | Không thấy environment guard trong seed lifecycle được xác minh |
| Backup/restore thất bại | Mất system-of-record data | Chưa tìm thấy cơ chế xử lý trong repository | Không có backup, PITR hoặc restore-test artifact |

## Tác động đến các thành phần

| Thành phần | Tác động |
|---|---|
| `PrismaModule`/`PrismaService` | Cung cấp data client và quản lý connection lifecycle |
| `schema.prisma` | Định nghĩa datasource, model, enum, relation, constraint và index |
| `AuthModule` | Lưu user, role, assignment và refresh session |
| `ConcertsModule` | Lưu catalog/show/seat; dùng Redis cache nhưng đọc gốc từ PostgreSQL |
| `BookingModule` | Dùng transaction và PostgreSQL inventory state kết hợp Redis lock |
| `PaymentModule` | Lưu payment, chuyển booking state và phát hành ticket trong transaction |
| `CheckinModule` | Lưu ticket state và check-in log authoritative |
| `NotificationModule` | Lưu notification status/payload trước và sau provider delivery |
| `AiModule`/`CsvModule` | Lưu `BackgroundJob` và kết quả nghiệp vụ |
| `AdminModule` | Truy vấn trực tiếp Prisma cho dashboard và quản trị |
| Redis | Cache/lock phụ trợ; không phải persistent authority |
| RabbitMQ | Vận chuyển message; database giữ business state |
| Mobile SQLite | Snapshot/provisional check-in state hội tụ về PostgreSQL |
| Cloudinary | Lưu object; PostgreSQL lưu URL trong entity domain |

## Bảo mật

- Database connection được cấu hình qua environment; ADR không chứa connection string hoặc credential.
- Prisma parameterize các query API thông thường. Các raw query hiện dùng tagged template, nhưng vẫn cần review kỹ khi thay đổi.
- Authorization được thực thi ở API/service; repository không thể hiện PostgreSQL Row-Level Security hoặc database user riêng theo module.
- Một application database identity có khả năng truy cập nhiều bounded context, làm tăng blast radius nếu backend bị compromise.
- PostgreSQL giữ password hash, refresh-token hash, attendee PII, payment raw payload và ticket/check-in data; cần encryption, access control, backup security và retention phù hợp. Repository chưa thể hiện các policy production này.
- `onDelete: Cascade` là integrity rule nhưng cũng là destructive-data risk; endpoint xóa cần authorization/audit/backup.
- Seed và script trực tiếp dùng Prisma có thể bỏ qua API authorization; quyền chạy chúng phải được giới hạn ở môi trường vận hành.
- Không thấy audit log chung cho admin mutation hoặc direct database operation.

## Khả năng vận hành và quan sát

**Đã tồn tại:** `PrismaService` kết nối/ngắt kết nối theo Nest lifecycle; một số service log lỗi cron/provider; Redis cache path có log khi query database; schema có index cho một số access pattern.

**Chưa tìm thấy:**

- Database health/readiness endpoint có query kiểm tra PostgreSQL.
- Query latency, connection-pool saturation, transaction rollback/deadlock metric.
- Slow-query log/dashboard và alert storage/capacity.
- Schema drift check hoặc migration status trong CI/CD.
- Backup/PITR configuration và restore drill.
- Primary/replica/failover manifest cho PostgreSQL.
- Trace/correlation ID qua REST request, Prisma transaction và RabbitMQ event.
- Reconciliation dashboard cho booking inventory, payment/ticket và offline check-in.

Các mục chưa tìm thấy là nhu cầu vận hành của system of record, không phải cơ chế đã triển khai.

## Kiểm thử và xác minh

Repository có Jest test chủ yếu quanh auth token/guard và các k6 script gọi HTTP API. Không tìm thấy bộ integration test PostgreSQL cho transaction nghiệp vụ, migration test hoặc test restore database. Không có thư mục Prisma migration để chạy migration trong test.

Seed scripts cung cấp dữ liệu development nhưng không thay thế migration/integration test.

Quyết định cần được xác minh bằng:

- Integration test với PostgreSQL thật cho booking, payment, refresh rotation, guest-list và check-in transaction.
- Test unique/foreign-key/cascade/restrict behavior của các invariant quan trọng.
- Concurrency test cho `soldQuantity`, coupon row lock, guest-list `SKIP LOCKED` và check-in duplicate.
- Migration test từ mỗi schema version được hỗ trợ và test rollback/forward-fix.
- Schema drift test giữa database và `schema.prisma` trong CI.
- Failure injection khi database disconnect giữa transaction và khi publish RabbitMQ event.
- Backup/restore test và kiểm tra tính toàn vẹn sau restore.
- Load test cùng metric query latency/pool saturation, không chỉ HTTP status.
- Security test quyền database, script/seed access và destructive cascade operation.

Không chạy test trong tác vụ viết ADR này.

## Kế hoạch rollback hoặc thay thế

Đây là quyết định rất khó rollback vì mọi module backend, model quan hệ và dữ liệu hiện hữu phụ thuộc PostgreSQL/Prisma.

Đổi ORM nhưng giữ PostgreSQL yêu cầu:

- Xây data-access layer mới cho mọi service.
- Tái tạo transaction, relation loading, Decimal, enum và error mapping.
- Thay các raw-query/Prisma-specific type.
- Chạy contract/integration test song song trước khi cắt Prisma.

Đổi database provider yêu cầu thêm migration dữ liệu, chuyển đổi type/constraint/index, thay PostgreSQL row-lock query và xác minh lại concurrency semantics. Việc tách database per service còn cần xác định ownership, API/event contract, saga/outbox và giai đoạn đồng bộ dữ liệu kép.

Rollback schema cụ thể không nên dựa vào xóa column/table trực tiếp nếu có dữ liệu production. Cần expand/contract hoặc forward-fix và backup đã kiểm chứng. Repository hiện chưa cung cấp migration history/runbook để thực hiện việc này.

## Tiêu chí đánh giá lại

ADR cần được xem xét lại khi:

- PostgreSQL hoặc connection pool trở thành bottleneck có metric rõ ràng.
- Một bounded context cần scale/deploy độc lập và database chung cản trở ownership.
- Transaction xuyên module không còn phù hợp với service boundary mới.
- Schema/migration drift gây incident hoặc làm deployment không tái tạo được.
- Yêu cầu HA, regional deployment hoặc data residency vượt topology hiện tại.
- Dung lượng, retention hoặc workload analytics cần storage chuyên biệt.
- Prisma không hỗ trợ query/feature quan trọng hoặc raw SQL chiếm phần lớn data access.
- Compliance yêu cầu RLS, audit, encryption, retention hoặc database segregation mạnh hơn.
- Event-driven flow cần outbox/CDC để bảo đảm database–broker consistency.
- Backup/restore objective không đạt RPO/RTO được thống nhất.

## Bằng chứng trong repository

- `src/apps/backend/prisma/schema.prisma`: PostgreSQL datasource và toàn bộ data model/constraint/index.
- `src/apps/backend/src/prisma/prisma.service.ts`: Prisma connection lifecycle.
- `src/apps/backend/src/prisma/prisma.module.ts`: export data client cho các module.
- `src/apps/backend/package.json`: Prisma Client, Prisma CLI và các script generate/migrate/seed.
- `src/apps/backend/prisma/seed.ts`: seed data development cho schema hiện tại.
- `src/apps/backend/src/auth/auth.store.ts`: persistence user/session/assignment.
- `src/apps/backend/src/bookings/booking.service.ts`: transaction, conditional inventory update và PostgreSQL coupon row lock.
- `src/apps/backend/src/payments/payment.service.ts`: payment/booking/ticket transaction.
- `src/apps/backend/src/csv/csv.service.ts`: per-row transaction và `FOR UPDATE SKIP LOCKED`.
- `src/apps/backend/src/checkin/checkin.service.ts`: authoritative ticket/check-in updates.
- `src/apps/backend/src/notifications/notification.service.ts`: notification persistence và RabbitMQ consumer.
- `src/apps/backend/src/ai/ai.service.ts`: durable `BackgroundJob` lifecycle.
- `src/apps/backend/src/concerts/concerts.service.ts`: PostgreSQL read source và Redis cache-aside.
- `src/apps/backend/src/redis/redis.service.ts`: Redis lifecycle, thể hiện store phụ trợ riêng.
- `blueprint/design.md`: PostgreSQL cho dữ liệu giao dịch và Redis cho cache/lock.
- `blueprint/specs/system-architecture.md`: mô tả Prisma/PostgreSQL trong kiến trúc hiện tại.
- `docs/c4-ticketbox-architecture.md`: PostgreSQL được mô tả là system of record.
- `docs/adr/ADR-003-jwt-refresh-token-rotation-rbac.md`: PostgreSQL giữ identity/refresh session.
- `docs/adr/ADR-004-booking-consistency-redis-postgresql.md`: PostgreSQL là lớp correctness bền vững của booking.
- `docs/adr/ADR-009-offline-checkin-eventual-consistency.md`: PostgreSQL giữ check-in state cuối cùng.

## Nội dung cần xác minh

- Người hoặc nhóm phê duyệt PostgreSQL/Prisma và thời điểm quyết định ban đầu.
- Lý do chọn Prisma thay TypeORM, query builder hoặc repository/raw SQL.
- Database production được host ở đâu và topology primary/replica/failover.
- Connection pool, timeout, retry, backup, PITR, RPO và RTO.
- Vì sao migration history không có trong repository và quy trình schema deployment hiện tại.
- `DATABASE_URL`/`DIRECT_URL` có dùng connection pooler hay môi trường managed database không.
- Chính sách encryption at rest/in transit, database role và secret rotation.
- Retention/audit policy cho PII, payment payload, refresh session và check-in log.
- Quy trình xử lý database–RabbitMQ inconsistency khi publish event thất bại.
- Kết quả load test gắn với query latency, lock contention và pool saturation thực tế.

## Tham khảo

- `docs/adr/ADR-003-jwt-refresh-token-rotation-rbac.md`
- `docs/adr/ADR-004-booking-consistency-redis-postgresql.md`
- `docs/adr/ADR-009-offline-checkin-eventual-consistency.md`
- `blueprint/design.md`
- `blueprint/specs/system-architecture.md`
- `blueprint/specs/booking.md`
- `openspec/changes/ticket-booking-system/design.md`
- `docs/c4-ticketbox-architecture.md`
