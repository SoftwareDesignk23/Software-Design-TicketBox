# ADR-001: Modular monolith với ba client độc lập

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Nguyễn Hưng Thịnh
- Phạm vi: Kiến trúc tổng thể TicketBox
- Liên quan: ADR-002, ADR-003, ADR-007, ADR-009, `blueprint/specs/system-architecture.md`, `blueprint/design.md`

## Bối cảnh

TicketBox phục vụ ba nhóm người dùng có hành vi và môi trường vận hành khác nhau:

- Khán giả cần duyệt concert, chọn ghế, đặt vé, thanh toán và quản lý vé.
- Admin/organizer cần quản lý concert, khách mời, nghệ sĩ, tài khoản và nhân viên.
- Nhân viên check-in cần ứng dụng camera trên thiết bị di động và tiếp tục làm việc khi kết nối không ổn định.

Repository hiện tổ chức một backend NestJS và ba dự án client:

- `src/apps/ui/web`: React/Vite dành cho khán giả.
- `src/apps/ui/admin-dashboard`: React/Vite dành cho `ADMIN` và `ORGANIZER`.
- `src/apps/ui/mobile-checkin`: Expo/React Native dành cho check-in, có camera, SQLite và luồng offline.

Mỗi client có `package.json`, lockfile, entry point, dependency và lệnh build/run riêng. Chúng cùng gọi REST API của backend theo prefix `/api/v1`; web khán giả còn dùng Socket.IO cho ghế và thông báo.

Backend có một entry point `main.ts` và một root `AppModule`. Các năng lực Auth, Concerts, Booking, Payment, Notification, Check-in, CSV, AI, Storage, Tickets và Admin được đóng gói thành Nest module nhưng chạy trong cùng application process. Cron task, WebSocket gateway và RabbitMQ consumer cũng được đăng ký trong backend này. Các module dùng chung Prisma/PostgreSQL, Redis và RabbitMQ.

Do đó đây là modular monolith ở phía server với ba client codebase độc lập về build. Repository chưa cung cấp bằng chứng rằng ba client hoặc backend đang có pipeline/deployment production độc lập; “độc lập” trong ADR này không được hiểu là đã chứng minh topology triển khai production.

## Decision Drivers

- Giữ nghiệp vụ booking, inventory, payment và ticket trong cùng transaction/process khi phù hợp.
- Giảm độ phức tạp vận hành so với microservices ở quy mô dự án hiện tại.
- Tách code backend theo năng lực nghiệp vụ để kiểm soát phạm vi thay đổi.
- Cung cấp UX riêng cho khán giả, người quản trị và nhân viên check-in.
- Cho phép mobile dùng API thiết bị, local database và offline flow không cần đưa vào web bundle.
- Cho phép web khán giả và admin có route, dependency và nhịp phát hành khác nhau.
- Dùng chung một mô hình xác thực, phân quyền và dữ liệu nghiệp vụ ở backend.
- Giữ khả năng tách module hoặc worker sau này nếu tải và tổ chức yêu cầu.

## Các phương án được xem xét

Repository không lưu đầy đủ biên bản đánh giá lịch sử. Các phương án dưới đây là phân tích kiến trúc; cấu trúc source là bằng chứng trực tiếp cho phương án được chọn.

### Phương án 1: Một backend microservices ngay từ đầu

Mỗi bounded context như Auth, Booking, Payment, Check-in và Notification là một service triển khai độc lập.

Ưu điểm:

- Có thể scale và phát hành từng năng lực độc lập.
- Giới hạn blast radius nếu ranh giới service và dữ liệu được thực thi tốt.
- Phù hợp khi nhiều team sở hữu các domain riêng.

Nhược điểm:

- Phát sinh service discovery, network failure, distributed tracing và contract versioning.
- Giao dịch booking/inventory/payment khó hơn và cần consistency pattern phân tán.
- Tăng chi phí CI/CD, môi trường, giám sát và on-call.
- Quá nhiều overhead so với cấu trúc team/repository quan sát được.

### Phương án 2: Một backend modular monolith và một client dùng chung

Backend chia module nhưng mọi persona dùng cùng một ứng dụng web/mobile hoặc cùng bundle.

Ưu điểm:

- Ít project frontend và giảm trùng lặp API/auth code.
- Một pipeline client và một bộ dependency.

Nhược điểm:

- Trộn route, quyền, UX và dependency của ba persona.
- Camera, SQLite và offline check-in không phù hợp với bundle quản trị/khán giả.
- Phạm vi phát hành client lớn và tăng nguy cơ lộ UI không liên quan.

### Phương án 3: Một backend modular monolith và ba client riêng

Backend là một deployable logic được chia Nest module; mỗi persona có client project riêng và giao tiếp qua API/Socket.IO công khai của backend.

Ưu điểm:

- Backend giữ giao dịch và mô hình dữ liệu tập trung.
- Client tối ưu theo thiết bị, vai trò và use case.
- Mỗi client có dependency/build riêng, giảm ảnh hưởng bundle chéo.
- Ranh giới module tạo điểm tách service trong tương lai.

Nhược điểm:

- Backend vẫn có blast radius và đơn vị scale chung.
- Ba client có thể lặp auth/API code và lệch contract.
- Cần phối hợp version API với các client có tốc độ cập nhật khác nhau, đặc biệt mobile.

Đây là phương án được triển khai.

## Quyết định

### Backend

1. Duy trì một backend NestJS modular monolith với một `main.ts`, một `AppModule` và một HTTP listener.
2. Chia domain thành Nest module theo năng lực: Auth, Concerts, Booking, Payment, Notification, Check-in, CSV, AI, Storage, Tickets và Admin.
3. Dùng module import/export và dependency injection cho cộng tác nội bộ khi có thể; không coi module là network service.
4. Cho phép các module dùng chung hạ tầng Prisma/PostgreSQL, Redis, RabbitMQ, scheduler và WebSocket trong cùng runtime.
5. PostgreSQL giữ dữ liệu nghiệp vụ chuẩn; RabbitMQ/Redis là hạ tầng hỗ trợ theo các ADR liên quan.
6. API HTTP dùng prefix `/api/v1`; health endpoint nằm ngoài prefix. Backend là nơi thực thi xác thực, RBAC và invariant nghiệp vụ.

### Ba client

1. `ui/web` là React/Vite client cho khán giả, bao gồm catalog, booking, payment, ticket và notification.
2. `ui/admin-dashboard` là React/Vite client riêng cho admin/organizer và các thao tác quản trị.
3. `ui/mobile-checkin` là Expo/React Native client cho nhân viên check-in, có camera, secure storage, SQLite và offline synchronization.
4. Mỗi client giữ package, dependency, environment config và lệnh build/run riêng.
5. Các client chỉ truy cập dữ liệu nghiệp vụ qua API/Socket.IO được backend công bố; chúng không truy cập trực tiếp PostgreSQL, Redis hay RabbitMQ.
6. Kiểm tra role ở client chỉ phục vụ điều hướng/UX. Backend guard vẫn là security boundary bắt buộc.

Không có shared frontend workspace/package hoặc generated API SDK được quan sát trong repository. Vì vậy contract hiện được chia sẻ chủ yếu bằng endpoint, DTO và tài liệu, không phải type package dùng chung.

## Lý do

Các nghiệp vụ cốt lõi có độ liên kết giao dịch cao và đang dùng cùng Prisma schema. Một backend process giúp triển khai transaction và thay đổi domain mà không phải điều phối distributed transaction. Nest module cung cấp cấu trúc đủ rõ cho quy mô hiện tại mà không đưa network boundary vào mọi lời gọi.

Ba persona lại có nhu cầu giao diện khác biệt đáng kể. Đặc biệt, check-in cần camera, SQLite, QR verification và offline state; đây là lý do kỹ thuật rõ ràng để có mobile client riêng. Tách admin khỏi web khán giả cũng giảm trộn route và dependency quản trị với public experience.

## Hệ quả

### Tích cực

- Một backend build/start path và một điểm áp dụng guard, exception filter, interceptor, throttling và CORS.
- Prisma transaction có thể bao phủ thay đổi liên module khi chúng dùng cùng database.
- Domain code được nhóm theo Nest module thay vì một service/controller duy nhất.
- Ba client có bundle, dependency và UX phù hợp persona.
- Mobile có thể phát hành và lưu dữ liệu offline độc lập với web.
- RabbitMQ worker, cron và WebSocket gateway tái sử dụng provider/service trong cùng codebase.
- Có thể xác định module nóng để tách sau dựa trên số liệu thay vì tách sớm.

### Tiêu cực

- Lỗi khởi động, memory leak hoặc saturation trong một module có thể ảnh hưởng toàn backend.
- Không thể scale riêng HTTP, AI worker, CSV worker, notification consumer hoặc WebSocket gateway với topology hiện tại mà không chạy thừa các thành phần khác.
- Nhiều service domain inject trực tiếp `PrismaService`; ranh giới dữ liệu giữa module không được database/schema thực thi.
- Một số module import lẫn nhau và có `forwardRef`, tạo nguy cơ coupling/cycle tăng dần.
- Một deployment backend chứa thay đổi của mọi module, làm tăng phạm vi regression.
- Ba client lặp API/auth logic và không dùng chung generated contract, dễ drift endpoint/response/token handling.
- Ba project có dependency/lockfile riêng, làm tăng công việc cập nhật và security patch.
- Không thấy root workspace/build orchestrator, nên build/test toàn hệ thống cần được điều phối bên ngoài hoặc thủ công.

### Trung lập

- “Monolith” chỉ mô tả backend application boundary; PostgreSQL, Redis, RabbitMQ, object storage và provider bên ngoài vẫn là process/service riêng.
- Các RabbitMQ consumer đang bất đồng bộ về logic nhưng vẫn thuộc cùng backend deployable.
- Ba client có thể được host/phát hành riêng, nhưng repository hiện chỉ chứng minh khả năng build riêng, không chứng minh pipeline production.
- Một repository không đồng nghĩa một artifact: backend và từng client tạo artifact khác nhau.

## Các invariant cần duy trì

- Backend là nguồn thực thi cuối cùng cho authentication, authorization và business invariant.
- Client không được truy cập trực tiếp database, cache hoặc broker.
- Mọi module backend được đăng ký qua module graph có chủ đích; tránh import implementation nội bộ không được export.
- Shared database không cho phép module sửa dữ liệu domain khác tùy tiện mà không qua use case/ràng buộc đã thống nhất.
- API thay đổi không tương thích phải có migration/version strategy cho cả ba client.
- Mobile offline phải tiếp tục hoạt động với contract/data đã tải trong khoảng version được hỗ trợ.
- Client route guard không thay thế Nest guard/RBAC ở API.
- Background consumer phải giả định cùng deployable có thể restart và message có thể redeliver.
- Mỗi client không được đóng gói secret; biến môi trường frontend là dữ liệu có thể bị đọc từ artifact/device.
- Tách một module thành service không được làm thay đổi system of record hoặc consistency invariant mà không có ADR mới.

Một số ranh giới module mới là quy ước code review; repository chưa có architecture test tự động để cấm import hoặc truy cập dữ liệu chéo.

## Failure Modes

| Tình huống | Hành vi/đặc điểm hiện tại | Ảnh hưởng | Giảm thiểu/việc cần làm |
|---|---|---|---|
| Backend process dừng | Cả REST, Socket.IO, cron và consumer cùng dừng | Ba client mất chức năng online | Health/readiness, restart, replica và graceful shutdown |
| Một worker dùng nhiều CPU/memory | Worker chạy cùng backend | HTTP/WebSocket có thể chậm | Giới hạn concurrency; tách worker khi có số liệu |
| Module thay đổi Prisma schema dùng chung | Migration áp dụng cho toàn backend | Nhiều domain có thể regression | Migration review, compatibility window và integration test |
| Circular dependency giữa module tăng | Đã có `forwardRef` giữa Booking/Concerts | Khó tách và khó hiểu vòng đời DI | Interface/application service và architecture rule |
| Client/backend lệch API contract | Không có shared generated SDK quan sát được | Runtime lỗi ở một hoặc nhiều client | OpenAPI/schema contract test và versioning |
| Mobile cũ gọi API mới | Mobile không cập nhật đồng thời như web | Check-in hoặc sync lỗi tại sự kiện | Backward compatibility, minimum-version policy, staged rollout |
| Frontend role check bị bypass | Client code có thể bị sửa | Người dùng gọi API quản trị trực tiếp | Backend guard/RBAC trên mọi endpoint nhạy cảm |
| CORS cấu hình quá rộng | Backend hiện dùng `origin: true` cùng credentials | Origin không mong muốn có thể gọi API | Allowlist origin theo môi trường |
| Deploy backend regression một module | Một artifact chứa mọi domain | Toàn hệ thống chịu blast radius | Smoke/integration test và rollback artifact |
| Một client dependency bị lỗi | Lockfile/build riêng | Chỉ client đó bị ảnh hưởng nếu deploy riêng | Per-client CI, dependency scanning và rollback |
| RabbitMQ/Redis lỗi | Backend phụ thuộc hạ tầng ngoài với mức fallback khác nhau | Một phần chức năng chậm/mất | Readiness theo capability và degrade có chủ đích |
| Socket.IO và HTTP scale ngang | Room/connection gắn instance; adapter phân tán không được thấy | Event có thể không tới mọi client | Xác minh sticky session/Redis adapter trước scale ngang |

## Thành phần bị ảnh hưởng

| Thành phần | Vai trò kiến trúc |
|---|---|
| `backend/src/main.ts` | Entry point duy nhất của backend |
| `backend/src/app.module.ts` | Composition root của modular monolith |
| Các Nest domain module | Ranh giới tổ chức code và dependency injection |
| Prisma/PostgreSQL | Data model và transaction dùng chung |
| Redis | Cache và distributed lock hỗ trợ backend |
| RabbitMQ | Transport bất đồng bộ cho notification/job |
| Socket.IO gateways | Real-time seat/notification trong backend process |
| `ui/web` | Client khán giả React/Vite |
| `ui/admin-dashboard` | Client quản trị React/Vite |
| `ui/mobile-checkin` | Client Expo/React Native, local/offline check-in |

## Bảo mật

- Backend RBAC là security boundary; ẩn route hoặc kiểm tra role trong React/Expo chỉ là defense-in-depth cho UX.
- Ba client dùng cùng backend auth flow nên thay đổi token/refresh phải được kiểm tra trên cả ba implementation.
- `enableCors({ origin: true, credentials: true })` hiện rộng; production cần allowlist origin của web/admin và xử lý riêng mobile/native.
- Mobile public key dùng xác minh chữ ký có thể được phân phối cho client, nhưng private key và mọi server secret không được nằm trong client environment/artifact.
- Mỗi client cần lưu token phù hợp nền tảng; mobile có SecureStore, còn browser phải đánh giá XSS/refresh-token exposure.
- Admin API phải kiểm tra role và ownership ở server dù admin dashboard đã chặn điều hướng.
- API versioning và validation cần chống client cũ gửi payload không còn hợp lệ.
- Dependency scanning phải chạy riêng cho bốn package vì chúng có lockfile độc lập.

## Vận hành và quan sát

Backend có một health endpoint, global exception filter, response interceptor, logger rải theo service/worker và shutdown hooks. Ba client có lệnh dev/build riêng. RabbitMQ và Redis có file hạ tầng riêng trong `src/infra`.

Chưa thấy trong repository:

- root workspace/build orchestrator chạy toàn bộ package;
- deployment manifest cho backend và từng client;
- distributed tracing/correlation xuyên ba client và backend;
- metric theo Nest module hoặc tách HTTP/worker/WebSocket workload;
- architecture test kiểm tra dependency direction giữa module;
- generated API client hoặc schema contract dùng chung;
- release compatibility matrix giữa backend và ba client;
- Socket.IO adapter cho multi-instance được cấu hình rõ ràng.

## Chiến lược kiểm thử

Không chạy test trong quá trình lập ADR. Kiến trúc này cần các tầng kiểm thử sau:

- unit test service/provider trong từng Nest module;
- module integration test với Prisma và dependency thật hoặc test double phù hợp;
- API contract test dùng chung cho web, admin và mobile;
- end-to-end test riêng cho hành trình khán giả, quản trị và check-in;
- compatibility test mobile cũ với backend mới trong support window;
- test RBAC bằng cách gọi API trực tiếp, không dựa vào route guard client;
- test backend restart khi đang có cron, RabbitMQ message và WebSocket connection;
- smoke build cho cả bốn package trong CI;
- architecture test cấm dependency cycle/import nội bộ không cho phép;
- load test xác định khi nào cần tách worker hoặc gateway khỏi monolith.

## Rollback hoặc thay thế

### Rollback backend

Rollback bằng artifact backend trước đó chỉ an toàn khi migration database tương thích ngược. Redis cache và RabbitMQ message đang chờ phải được xem xét theo contract của version cũ.

### Rollback client

Web/admin có thể rollback artifact tĩnh nếu API còn tương thích. Mobile cần phát hành version mới hoặc dùng cơ chế store/update phù hợp; không thể giả định mọi thiết bị cập nhật đồng thời.

### Tách module thành service

Nếu một module cần tách:

1. Xác định ownership dữ liệu và API nội bộ hiện đang được gọi.
2. Tạo contract có version và observability trước khi thêm network boundary.
3. Tách read/write path theo giai đoạn, giữ idempotency và consistency.
4. Chuyển worker/dependency liên quan, đối soát dữ liệu và queue.
5. Chỉ gỡ module cũ sau khi traffic và background work đã chuyển hết.

Việc tách service cần ADR riêng vì làm thay đổi transaction, failure mode và vận hành.

## Tiêu chí xem xét lại

- Một module cần scale khác biệt rõ rệt và thường xuyên so với phần còn lại.
- AI/CSV/RabbitMQ worker gây ảnh hưởng latency HTTP hoặc cần deploy riêng.
- Nhiều team cần ownership và release cadence độc lập ở backend.
- Thời gian build/deploy hoặc blast radius monolith vượt ngưỡng chấp nhận.
- Shared Prisma schema tạo coupling/migration conflict đáng kể.
- Ba client drift API thường xuyên và cần shared SDK/design system/workspace.
- Admin và audience cần hợp nhất hoặc chia nhỏ thêm vì sản phẩm thay đổi.
- Mobile offline yêu cầu backend compatibility dài hạn hơn API version hiện tại.
- Yêu cầu compliance buộc cô lập payment, identity hoặc dữ liệu nhạy cảm.
- Socket.IO/HTTP cần scale ngang theo topology khác nhau.

## Bằng chứng trong repository

- `src/apps/backend/src/main.ts`: tạo một Nest application, prefix `/api/v1` và một HTTP listener.
- `src/apps/backend/src/app.module.ts`: composition root đăng ký toàn bộ domain và infrastructure module.
- `src/apps/backend/package.json`: một backend package với lệnh build/start/test riêng.
- `src/apps/backend/src/auth/auth.module.ts`: module Identity/Auth.
- `src/apps/backend/src/concerts/concerts.module.ts`: module catalog/concert.
- `src/apps/backend/src/bookings/booking.module.ts`: module booking và dependency `forwardRef` với concerts.
- `src/apps/backend/src/payments/payment.module.ts`: module payment.
- `src/apps/backend/src/notifications/notification.module.ts`: notification service, gateway, reminder và RabbitMQ consumer trong backend.
- `src/apps/backend/src/ai/ai.module.ts`: AI worker là provider trong backend module.
- `src/apps/backend/src/csv/csv.module.ts`: CSV worker là provider trong backend module.
- `src/apps/backend/src/checkin/checkin.module.ts`: API check-in dùng Prisma chung.
- `src/apps/ui/web/package.json`: React/Vite package cho web khán giả.
- `src/apps/ui/web/src/app/routes.jsx`: route catalog, checkout, ticket, history và profile.
- `src/apps/ui/web/src/shared/services/apiClient.js`: cấu hình REST base URL riêng của web.
- `src/apps/ui/admin-dashboard/package.json`: React/Vite package quản trị độc lập.
- `src/apps/ui/admin-dashboard/src/App.jsx`: role check và route quản trị.
- `src/apps/ui/admin-dashboard/src/auth.js`: API/auth client riêng của admin.
- `src/apps/ui/mobile-checkin/package.json`: Expo/React Native và dependency camera/SQLite/network/secure storage.
- `src/apps/ui/mobile-checkin/app.json`: cấu hình Expo, camera và secure store.
- `src/apps/ui/mobile-checkin/src/services/api.ts`: API/auth/check-in client của mobile.
- `src/apps/ui/mobile-checkin/src/app/_layout.tsx`: role check cho ứng dụng check-in.
- `blueprint/specs/system-architecture.md`: đặc tả ba client và backend dạng module.
- `blueprint/design.md`: quyết định thiết kế modular monolith và C4 diagrams.

## Cần xác minh

- Backend và ba client được deploy/host ở đâu, có pipeline độc lập hay không.
- Có API gateway, reverse proxy, WAF hoặc CORS policy ngoài repository hay không.
- Health/readiness production có bao phủ PostgreSQL, Redis và RabbitMQ hay không.
- Có shared contract/OpenAPI generation hoặc CI script nằm ngoài repository hay không.
- Chiến lược backward compatibility và minimum supported version cho mobile.
- Topology scale ngang, sticky session và Socket.IO adapter ở production.
- Có architecture governance để kiểm soát module dependency/data ownership hay không.
- Team ownership và release cadence thực tế của từng client/module.
- Lịch sử benchmark/đánh giá microservices so với modular monolith không được lưu trong repository.

## Tham chiếu

- `docs/adr/ADR-002-postgresql-prisma-system-of-record.md`
- `docs/adr/ADR-003-jwt-refresh-token-rotation-rbac.md`
- `docs/adr/ADR-007-rabbitmq-asynchronous-communication.md`
- `docs/adr/ADR-009-offline-checkin-eventual-consistency.md`
- `blueprint/specs/system-architecture.md`
- `blueprint/design.md`
- `openspec/changes/ticketbox-system-architecture/design.md`
