# ADR-003: JWT, refresh-token rotation và RBAC

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Nguyễn Hưng Thịnh
- Phạm vi: Toàn hệ thống, trọng tâm `AuthModule` và các REST API được bảo vệ
- Liên quan: `blueprint/specs/auth.md`, `blueprint/design.md`, `openspec/changes/authentication-and-rbac/design.md`, ADR-004

## Bối cảnh

TicketBox có ba client độc lập — Audience Web, Admin Dashboard và Mobile Check-in — cùng gọi REST API của backend NestJS. Hệ thống phải xác thực người dùng, duy trì phiên đăng nhập, phân biệt quyền của `AUDIENCE`, `ORGANIZER`, `CHECK_IN_STAFF` và `ADMIN`, đồng thời giới hạn một số thao tác theo concert hoặc gate được phân công.

Các ràng buộc quan sát được trong repository:

- Backend không duy trì HTTP session trong memory; client gửi Bearer access token trên request được bảo vệ.
- Người dùng và refresh session được lưu trong PostgreSQL qua Prisma.
- Web, Admin và Mobile cần cùng sử dụng một contract login/refresh/logout.
- Mobile Check-in phải tiếp tục có danh tính nhân viên khi hoạt động offline.
- Role và concert assignment có thể thay đổi độc lập với client.
- API nghiệp vụ được chia theo role và dùng guard/decorator của NestJS.

Nếu chỉ dùng credential ở từng request hoặc một token dài hạn duy nhất, hệ thống khó duy trì phiên trên nhiều client và khó thu hồi quyền. Nếu chỉ kiểm tra đăng nhập mà không kiểm tra role/scope, người dùng hợp lệ có thể gọi API ngoài phạm vi được cấp.

## Decision Drivers

- Xác thực thống nhất cho Web, Admin và Mobile.
- Access token có thể được kiểm tra cục bộ tại backend mà không truy vấn session trên mọi request.
- Refresh token có thể thu hồi, quay vòng và phát hiện sử dụng lại.
- Role phải được thực thi ở backend, không chỉ ẩn chức năng trên UI.
- Hỗ trợ giới hạn quyền theo concert và gate.
- Giảm tác động của access token thông thường bị lộ bằng TTL ngắn.
- Cho phép nhân viên check-in tiếp tục dùng ứng dụng trong điều kiện mạng không ổn định.
- Không lưu refresh token dạng rõ trong database.

## Các phương án được xem xét

Tài liệu OpenSpec nêu các phương án dưới đây, nhưng repository không có biên bản quyết định hoặc benchmark. Vì vậy chỉ có thể khẳng định phương án thứ ba là thiết kế đã được triển khai; lý do lịch sử cụ thể vẫn cần xác minh.

### Phương án 1: JWT dài hạn không có refresh session

Client dùng một JWT duy nhất trong toàn bộ thời gian đăng nhập.

Ưu điểm:

- Ít endpoint và ít trạng thái server-side.
- Không cần lưu refresh session.

Nhược điểm:

- Khó thu hồi token trước khi hết hạn.
- Token bị lộ có thời gian sử dụng dài.
- Role hoặc assignment trong token có thể cũ trong thời gian dài.

### Phương án 2: Phiên đăng nhập hoàn toàn server-side

Mỗi request dùng session identifier và backend tra session từ kho dữ liệu.

Ưu điểm:

- Có thể thu hồi phiên ngay lập tức.
- Quyền và trạng thái tài khoản có thể được kiểm tra lại trên mọi request.

Nhược điểm:

- Mỗi request phụ thuộc vào session store.
- Phức tạp hơn khi dùng chung cho browser, admin client và mobile API.
- Không phù hợp trực tiếp với yêu cầu giữ danh tính trên thiết bị check-in offline.

### Phương án 3: Access JWT ngắn hạn kết hợp refresh session quay vòng

Backend phát access JWT để xác thực request và opaque refresh token để gia hạn phiên. Refresh token được hash, lưu trong PostgreSQL và rotate sau mỗi lần sử dụng.

Ưu điểm:

- Request thông thường không cần truy vấn refresh session.
- Refresh session có thể revoke khi logout hoặc khi phát hiện reuse.
- Một contract token có thể dùng cho cả ba client.

Nhược điểm:

- Client và backend phải xử lý hai loại token và refresh race.
- Thu hồi refresh session không làm access token đã phát mất hiệu lực ngay.
- Token nhân viên check-in không hết hạn tạo ngoại lệ lớn so với mô hình access token ngắn hạn.

Đây là phương án thể hiện trong source code hiện tại.

## Quyết định

Hệ thống sử dụng access JWT ký bằng signing secret cho xác thực API, kết hợp opaque refresh token được quay vòng và lưu dưới dạng hash trong PostgreSQL. Authorization được thực thi bằng role metadata, NestJS guard và, tại các route có áp dụng, concert assignment lookup.

### Access token

`AuthTokenService` phát JWT chứa `sub`, `role`, `sid`, `issuer`, `audience`, `iat` và thông thường có `exp`. TTL mặc định là 900 giây. `JwtStrategy` lấy Bearer token từ header, xác minh chữ ký, issuer, audience và expiration rồi gắn payload vào request.

Khi `CHECK_IN_STAFF` đăng nhập, `AuthService.login` gọi `signAccessToken` với `noExpiry`; token trả về không có `exp`. Đây là ngoại lệ quan sát được nhằm phục vụ check-in offline. Các access token khác sử dụng TTL cấu hình.

### Refresh session và rotation

Sau login hoặc register, backend:

1. Sinh refresh token ngẫu nhiên bằng `randomBytes`.
2. Băm token bằng SHA-256.
3. Tạo `RefreshSession` có `familyId`, `userId`, `tokenHash` và `expiresAt` trong PostgreSQL.
4. Trả refresh token dạng rõ cho client đúng một lần cùng access token.

Khi refresh:

1. Backend băm token client gửi và tìm session theo `tokenHash`.
2. Token không tồn tại, hết hạn hoặc đã bị revoke bị từ chối.
3. Nếu session đã revoke được sử dụng lại, backend revoke mọi session đang hoạt động trong cùng `familyId`.
4. Backend tạo refresh session mới và revoke session cũ trong một Prisma transaction.
5. Backend phát access token và refresh token mới.

Logout revoke refresh session tương ứng. Access token đã phát không được đưa vào denylist và tiếp tục hợp lệ cho tới khi hết hạn; với token staff không có `exp`, logout không làm token đó mất hiệu lực.

### RBAC và phạm vi tài nguyên

- `JwtAuthGuard` chuyển lỗi thiếu, sai hoặc hết hạn token thành error code của ứng dụng.
- `Roles` gắn danh sách role được phép vào route; `RolesGuard` so sánh role trong JWT với metadata này.
- `ConcertScope` và `ConcertScopeGuard` tra `ConcertAssignment` trong PostgreSQL. `ADMIN` được phép bỏ qua assignment trong implementation guard.
- Guard theo role được sử dụng trên các API booking, payment, ticket, admin, notification, storage và check-in.
- `ConcertScopeGuard` được áp dụng rõ ràng tại các route đại diện trong `DemoController`; các controller nghiệp vụ còn lại không áp dụng guard này đồng nhất và có thể kiểm tra ownership/scope trong service theo cách riêng.
- Tài khoản `CHECK_IN_STAFF` được Organizer hoặc Admin tạo và gắn `assignedGateId`; backend check-in dùng assignment cổng khi xác minh vé.

PostgreSQL là source of truth cho `User`, `RefreshSession`, `ConcertAssignment` và `assignedGateId`. JWT là snapshot của identity/role tại thời điểm phát hành, không phải nguồn cuối cùng cho trạng thái tài khoản hoặc assignment.

### Lưu token phía client

- Audience Web giữ access token trong memory và refresh token trong `localStorage`.
- Admin Dashboard lưu cả access token và refresh token trong `localStorage`.
- Mobile Check-in dùng Expo SecureStore trên native; bản web của mobile fallback sang `localStorage`.
- Các API client gom request chờ khi refresh đang diễn ra để hạn chế nhiều refresh đồng thời trong cùng client process.

## Lý do

**Có bằng chứng trực tiếp:** OpenSpec và blueprint mô tả access JWT ngắn hạn, refresh rotation, token-family revocation và RBAC; source code, Prisma schema và test triển khai đúng phần lớn contract này. Role guard được sử dụng trên nhiều module.

**Suy luận hợp lý:** access JWT giúp các API protected không phải đọc session trên mọi request, trong khi refresh session lưu database cung cấp điểm kiểm soát để gia hạn và thu hồi phiên. Role được giữ trong token giúp authorization nhanh; concert assignment lookup dành cho quyền thay đổi thường xuyên hơn.

**Cần xác minh:** repository không ghi rõ ai quyết định ngoại lệ token staff không hết hạn, threat model đã chấp nhận rủi ro nào, hay vì sao Admin Dashboard lưu access token khác Audience Web.

## Hệ quả

### Tích cực

- Cùng một cơ chế xác thực được dùng trên Web, Admin, Mobile và các module backend.
- Access token thông thường có TTL ngắn và được kiểm tra issuer/audience.
- Refresh token không được lưu dạng rõ trong PostgreSQL.
- Refresh rotation giới hạn việc tái sử dụng token cũ và hỗ trợ revoke cả token family.
- Backend thực thi role trước handler thay vì dựa vào UI.
- Concert assignment không cần được nhúng toàn bộ vào JWT, tránh token phình to và cho phép kiểm tra từ dữ liệu hiện tại tại route có dùng guard.
- Mobile native lưu token bằng SecureStore.

### Tiêu cực

- Logout chỉ revoke refresh session, không thu hồi access token đã phát.
- `JwtStrategy.validate` trả payload mà không kiểm tra `User.isActive`, role hiện tại hoặc trạng thái session `sid` trong PostgreSQL.
- Access token `CHECK_IN_STAFF` không hết hạn nên có thể tiếp tục được dùng sau logout, đổi role, vô hiệu hóa tài khoản hoặc mất thiết bị.
- Role trong access token thông thường có thể cũ tối đa tới khi token hết hạn.
- Refresh token trong browser `localStorage` chịu rủi ro bị đọc nếu xảy ra XSS; Admin Dashboard còn lưu cả access token tại đó.
- Concert-scope enforcement chưa được áp dụng nhất quán trên các controller nghiệp vụ.
- Rotation hiện đọc trạng thái session trước transaction tạo session mới; hai refresh đồng thời dùng cùng token có khả năng cùng vượt qua kiểm tra trước khi một request revoke token cũ.
- Có nhiều cách áp dụng authorization: guard chuẩn, kiểm tra thủ công trong controller và ownership check trong service, làm tăng nguy cơ policy không đồng nhất.

### Trung tính

- Client phải thay access/refresh token sau mỗi refresh và xử lý `401`.
- Mỗi role mới yêu cầu cập nhật Prisma enum, type, guard metadata và policy tại các module liên quan.
- Thay signing secret làm mọi access token hiện tại mất hiệu lực.
- Refresh session làm tăng dữ liệu cần cleanup hoặc lưu giữ trong PostgreSQL.

## Invariant và nguyên tắc bắt buộc

- Access JWT chỉ hợp lệ khi chữ ký, issuer và audience đúng; token có `exp` phải chưa hết hạn.
- Protected endpoint phải chạy `JwtAuthGuard` trước khi dựa vào `request.user`.
- Endpoint có giới hạn role phải thực thi `RolesGuard` hoặc kiểm tra backend tương đương; UI guard không thay thế backend authorization.
- Refresh token chỉ được lưu trong PostgreSQL dưới dạng hash.
- Một refresh token đã rotate hoặc revoke không được dùng để phát token mới.
- Khi phát hiện reuse của session đã revoke, các session đang hoạt động trong cùng family phải bị revoke.
- Rotation phải revoke session cũ và tạo session mới trong cùng `familyId`.
- `User`, `RefreshSession` và `ConcertAssignment` trong PostgreSQL là nguồn dữ liệu chuẩn.
- Password chỉ được lưu dưới dạng bcrypt hash.
- Role nhận từ request đăng ký không được phép nâng quyền nếu caller không phải `ADMIN`.
- Quyền theo concert hoặc gate phải được kiểm tra từ assignment hiện tại tại các thao tác yêu cầu scope đó.
- Không được dùng access JWT cho API auth và JWT QR vé như cùng một key lifecycle; QR vé sử dụng cơ chế RS256 riêng ngoài phạm vi ADR này.

## Failure Modes

| Failure mode | Ảnh hưởng | Cách hệ thống hiện tại xử lý | Khoảng trống hoặc rủi ro còn lại |
|---|---|---|---|
| Sai email/password hoặc tài khoản inactive | Không thể đăng nhập | Trả lỗi credential chung | Không thấy lockout, progressive delay hoặc audit login failure |
| Thiếu/sai/hết hạn access token | Protected API bị từ chối | `JwtAuthGuard` ánh xạ sang lỗi auth tương ứng | Không thấy security-event logging hoặc correlation ID |
| Refresh token không tồn tại | Không thể gia hạn phiên | Trả `AuthRefreshInvalid` | Không phân biệt cho client để tránh lộ thông tin, phù hợp bảo mật nhưng quan sát vận hành hạn chế |
| Refresh token hết hạn | Không thể gia hạn phiên | Revoke session rồi trả `AuthRefreshExpired` | Không thấy scheduled cleanup session hết hạn |
| Refresh token đã revoke bị dùng lại | Nguy cơ token theft/replay | Revoke toàn bộ session family và trả `AuthRefreshReused` | Không thấy alert hoặc audit record cho reuse event |
| Hai request refresh đồng thời cùng token | Có thể phát nhiều token kế nhiệm | Client gom refresh trong cùng process; database rotation chạy transaction | Nhiều client/process vẫn có thể race vì không có conditional revoke/row lock trước khi rotate |
| Logout khi access token còn hiệu lực | Caller vẫn gọi API bằng access token cũ | Refresh session bị revoke | Không có access-token denylist; staff token không hết hạn làm rủi ro kéo dài |
| User bị disable hoặc đổi role sau khi token phát | Token có thể giữ quyền cũ | Login mới kiểm tra `isActive`; token thông thường tự hết hạn theo TTL | `JwtStrategy` không đọc user/session; staff token có thể giữ quyền vô thời hạn |
| Signing secret thiếu hoặc quá ngắn | Backend dùng cấu hình không an toàn hoặc không khởi động đúng mong đợi | Zod yêu cầu tối thiểu 16 ký tự nhưng có default development | Default có thể bị dùng ngoài ý muốn; chưa thấy secret-manager/deployment validation riêng |
| XSS trên Web/Admin | Token browser có thể bị đánh cắp | Audience Web giữ access token trong memory | Refresh token vẫn ở `localStorage`; Admin lưu cả hai token trong `localStorage` |
| Route thiếu `RolesGuard` hoặc scope check | Người dùng hợp lệ có thể vượt quyền nghiệp vụ | Một số service tự kiểm tra ownership/organizer | Không có global authorization guard và không thấy test bao phủ toàn bộ controller |

## Tác động đến các thành phần

| Thành phần | Tác động |
|---|---|
| `AuthModule` | Đóng gói controller, service, store, token service và Passport strategy |
| `AuthController` | Cung cấp login, register, refresh, logout, create staff và current-user API |
| `AuthService` | Điều phối credential validation, token issue/rotation/revocation và profile |
| `AuthStore` | Truy cập `User`, `RefreshSession`, `ConcertAssignment` và `Gate` qua Prisma |
| `AuthTokenService` | Ký và xác minh access JWT |
| `JwtStrategy`/`JwtAuthGuard` | Xác thực Bearer token và chuẩn hóa lỗi authentication |
| `RolesGuard` | Thực thi role metadata trên route |
| `ConcertScopeGuard` | Kiểm tra assignment theo concert tại route có áp dụng |
| `User` | Lưu credential hash, role, trạng thái hoạt động, organizer và gate assignment |
| `RefreshSession` | Lưu hash, family, expiry, revoke và replacement chain |
| `ConcertAssignment` | Lưu quyền theo concert |
| Audience Web | Giữ access token trong memory, refresh token trong `localStorage`, tự refresh khi 401 |
| Admin Dashboard | Lưu token trong `localStorage`, refresh và retry request |
| Mobile Check-in | Lưu token bằng SecureStore trên native và gắn Bearer token vào API call |
| Các module nghiệp vụ | Khai báo guard/role và dùng identity từ request |

## Bảo mật

- Password được hash bằng bcrypt với cost hiện tại là 10.
- Refresh token có entropy từ `randomBytes(48)` và chỉ hash SHA-256 được lưu server-side.
- Access JWT dùng signing secret đối xứng; mọi instance backend xác minh token phải cùng quản lý secret này.
- Issuer và audience giảm nguy cơ chấp nhận token phát cho hệ thống khác.
- Reuse detection chỉ có giá trị khi rotation được thực thi atomically dưới concurrent refresh; đây là điểm cần tăng cường/xác minh.
- Token browser trong `localStorage` yêu cầu CSP, XSS prevention và dependency hygiene; repository chưa thể hiện đầy đủ các kiểm soát này.
- Không thấy log audit bền vững cho login, refresh, reuse, logout, role change hoặc authorization denial.
- Token `CHECK_IN_STAFF` không hết hạn là rủi ro bảo mật đáng kể và phải đi kèm quy trình thu hồi thiết bị/token; chưa tìm thấy quy trình đó.
- `sid` có trong JWT nhưng hiện chưa được dùng để kiểm tra session revoke trên request protected.
- Endpoint register role cao tự xác minh Bearer token trong controller thay vì dùng guard chuẩn, làm policy khó kiểm tra đồng nhất.
- Không đưa signing secret, token thật hoặc credential vào ADR này.

## Khả năng vận hành và quan sát

**Đã tồn tại:** global exception filter và error code phân biệt thiếu token, token hết hạn, refresh invalid/expired/reused và forbidden. Refresh session lưu `createdAt`, `lastUsedAt`, `revokedAt`, `replacedByTokenId` và `familyId`, cung cấp dữ liệu điều tra cơ bản.

**Chưa tìm thấy:**

- Structured security log cho login success/failure, refresh reuse, logout và RBAC denial.
- Metric login failure, refresh success/failure, token reuse và authorization denial theo route/role.
- Alert khi reuse token tăng, refresh error tăng hoặc có staff token dùng sau khi tài khoản bị disable.
- Correlation ID nối request với `sid`/session family mà không ghi token.
- Dashboard vòng đời session và cleanup session hết hạn.
- Secret rotation procedure và cách phát hiện instance dùng signing secret không đồng nhất.

Các mục chưa có là nhu cầu vận hành suy ra từ security model, không phải chức năng hiện tại.

## Kiểm thử và xác minh

Repository có các test sau:

- `auth.tokens.spec.ts`: ký và xác minh access JWT cùng các claim chính.
- `auth.service.spec.ts`: refresh rotation, reuse detection và logout revocation.
- `auth.guards.spec.ts`: role allow/deny và concert assignment allow/deny.

Các test này thể hiện ý định kiến trúc, nhưng ADR không khẳng định chúng đang pass vì không chạy test trong tác vụ tài liệu này. Một số test khởi tạo `AuthStore` không truyền `PrismaService`, cần được đội ngũ xác minh với cấu hình test thực tế.

Các kiểm thử quan trọng cần có hoặc cần xác minh thêm:

- Integration test với PostgreSQL cho hai refresh đồng thời dùng cùng token.
- Test access token sau logout, user disable và role change.
- Test riêng cho token `CHECK_IN_STAFF` không có `exp` và quy trình thu hồi.
- Controller authorization matrix cho mọi route protected.
- Test mọi thao tác theo concert/gate đều kiểm tra assignment đúng cách.
- Security test XSS/token storage cho Web và Admin.
- Test thay signing secret và issuer/audience mismatch.
- Test register role escalation và create-staff authorization.

## Kế hoạch rollback hoặc thay thế

Đây là quyết định khó rollback vì token contract được dùng bởi ba client và hầu hết controller backend; `RefreshSession` và role/assignment nằm trong schema PostgreSQL.

Chuyển sang server-side session yêu cầu:

- Thay Bearer JWT contract hoặc thêm session lookup cho mọi request.
- Migration/revoke các refresh session và access token đang tồn tại.
- Cập nhật API client của Web, Admin và Mobile.
- Thiết kế riêng cho hoạt động offline của check-in staff.

Chuyển sang asymmetric signing cho access token yêu cầu phân phối public key, rotation/key identifier và giai đoạn chấp nhận đồng thời key cũ/mới. Thay đổi role hoặc claim schema cần bảo đảm backward compatibility với token chưa hết hạn.

Ngoại lệ staff token không hết hạn có thể được thay thế độc lập bằng access token có TTL kết hợp offline credential/device certificate, nhưng repository chưa có mô hình thay thế đó.

## Tiêu chí đánh giá lại

ADR cần được xem xét lại khi:

- Có sự cố access token staff bị lộ, thiết bị thất lạc hoặc token vẫn dùng được sau khi tài khoản bị khóa.
- Concurrent refresh phát hành nhiều session kế nhiệm từ cùng token.
- Yêu cầu thu hồi access token ngay lập tức trở thành bắt buộc.
- Role hoặc concert assignment thay đổi thường xuyên đến mức claim trong JWT gây quyền stale không chấp nhận được.
- Hệ thống cần SSO, OAuth/OIDC hoặc identity provider bên ngoài.
- Số backend/service tăng và việc chia sẻ signing secret trở thành rủi ro vận hành.
- XSS hoặc browser security policy khiến lưu refresh token trong `localStorage` không còn phù hợp.
- Audit/compliance yêu cầu log đăng nhập, session và authorization bền vững.
- Concert/gate scope cần được thực thi đồng nhất trên toàn bộ API thay vì route/service riêng lẻ.

## Bằng chứng trong repository

- `src/apps/backend/src/auth/auth.module.ts`: cấu trúc `AuthModule` và Passport JWT.
- `src/apps/backend/src/auth/auth.controller.ts`: login, register, refresh, logout, staff và current-user endpoints.
- `src/apps/backend/src/auth/auth.service.ts`: credential flow, refresh generation/rotation/reuse/logout và staff token không hết hạn.
- `src/apps/backend/src/auth/auth.store.ts`: Prisma persistence cho user, refresh session và concert assignment.
- `src/apps/backend/src/auth/auth.tokens.ts`: access JWT signing/verification, issuer, audience và TTL.
- `src/apps/backend/src/auth/jwt.strategy.ts`: Bearer extraction và JWT validation.
- `src/apps/backend/src/auth/auth.guards.ts`: JWT error handling, role guard và concert-scope guard.
- `src/apps/backend/src/auth/auth.decorators.ts`: `Roles`, `ConcertScope` và `CurrentUser`.
- `src/apps/backend/src/auth/demo.controller.ts`: route đại diện áp dụng role và concert scope.
- `src/apps/backend/src/auth/auth.config.ts`: schema cấu hình issuer, audience và token TTL.
- `src/apps/backend/prisma/schema.prisma`: `Role`, `User`, `RefreshSession`, `ConcertAssignment` và gate assignment.
- `src/apps/backend/package.json`: dependency Passport, JWT, bcrypt, Zod và Prisma.
- `src/apps/backend/src/auth/auth.tokens.spec.ts`: test access token.
- `src/apps/backend/src/auth/auth.service.spec.ts`: test rotation, reuse và logout.
- `src/apps/backend/src/auth/auth.guards.spec.ts`: test role và concert assignment.
- `src/apps/ui/web/src/shared/services/auth.js`: access token trong memory và refresh token trong browser storage.
- `src/apps/ui/admin-dashboard/src/auth.js`: token persistence và refresh của Admin Dashboard.
- `src/apps/ui/mobile-checkin/src/services/tokenStore.ts`: SecureStore native và fallback browser storage.
- `src/apps/ui/mobile-checkin/src/services/api.ts`: Bearer interceptor và refresh flow của mobile.
- `blueprint/specs/auth.md`: đặc tả hiện trạng auth/RBAC.
- `blueprint/design.md`: Auth/RBAC trong kiến trúc modular monolith.
- `openspec/changes/authentication-and-rbac/design.md`: các quyết định và đánh đổi được mô tả cho auth.

## Nội dung cần xác minh

- Người hoặc nhóm phê duyệt quyết định và ngày quyết định lịch sử.
- Threat model và lý do chấp nhận access token `CHECK_IN_STAFF` không có thời hạn.
- Quy trình thu hồi khi thiết bị check-in thất lạc hoặc tài khoản staff bị vô hiệu hóa.
- Refresh rotation có yêu cầu chống race giữa nhiều client/process hay chỉ reuse tuần tự.
- Chính sách lưu token khác nhau giữa Audience Web và Admin Dashboard có chủ ý hay là sai khác implementation.
- Mức độ bắt buộc của `ConcertScopeGuard` đối với các controller nghiệp vụ.
- Chính sách rotation signing secret, key ownership và incident response.
- Thời gian lưu giữ và cleanup `RefreshSession` đã revoke/hết hạn.
- Kết quả thực tế của test auth hiện tại trong CI; repository không có pipeline CI được phát hiện.

## Tham khảo

- `blueprint/specs/auth.md`
- `blueprint/design.md`
- `blueprint/specs/api-protection.md`
- `blueprint/specs/mobile-checkin.md`
- `openspec/changes/authentication-and-rbac/design.md`
- `openspec/changes/authentication-and-rbac/specs/authentication-and-session-management/spec.md`
- `openspec/changes/authentication-and-rbac/specs/role-based-access-control/spec.md`
- `docs/adr/ADR-004-booking-consistency-redis-postgresql.md`
