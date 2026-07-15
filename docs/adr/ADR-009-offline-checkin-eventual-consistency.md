# ADR-009: Offline check-in và eventual consistency

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Nguyễn Phúc Hậu
- Phạm vi: `CheckinModule` và ứng dụng `ui/mobile-checkin`
- Liên quan: ADR-003, `blueprint/specs/checkin.md`, `openspec/changes/offline-ticket-checkin/design.md`

## Bối cảnh

Nhân viên TicketBox phải soát vé tại địa điểm tổ chức, nơi kết nối mạng có thể không ổn định hoặc không khả dụng. Việc yêu cầu backend xác nhận mọi lượt quét có thể làm dừng luồng vào cổng. Ngược lại, cho phép nhiều thiết bị quyết định độc lập khi offline làm phát sinh khoảng thời gian mà các thiết bị và PostgreSQL không có cùng trạng thái vé.

Các ràng buộc quan sát được trong repository:

- Vé được phát hành với QR payload ký số và có `ticketId`, `eventId` cùng thông tin hiển thị.
- Ứng dụng Expo/React Native có SQLite cục bộ, camera, network-state API và token storage.
- Nhân viên tải danh sách vé theo sự kiện trước khi quét offline.
- Mỗi thiết bị chỉ biết dữ liệu vé đã tải và các lượt quét đã ghi trên chính thiết bị đó.
- Backend lưu trạng thái cuối cùng trong `Ticket.status`, `Ticket.checkedInAt` và `CheckInLog` của PostgreSQL.
- Nhân viên có thể được gán `assignedGateId`; cả luồng online và offline phải từ chối vé sai cổng.
- Khi kết nối Wi-Fi khả dụng, mobile có thể tải thay đổi từ server và đẩy log hợp lệ chưa đồng bộ.

Không có giao tiếp trực tiếp giữa các thiết bị offline. Vì vậy hệ thống không thể đồng thời bảo đảm hoạt động hoàn toàn offline và ngăn tuyệt đối cùng một vé được chấp nhận tạm thời trên hai thiết bị khác nhau.

## Decision Drivers

- Duy trì tốc độ soát vé khi venue mất hoặc chập chờn kết nối.
- Cho phản hồi ngay tại cổng mà không chờ network round trip.
- Xác minh tính xác thực cơ bản của QR trên thiết bị.
- Ngăn quét lặp trên cùng thiết bị bằng trạng thái cục bộ.
- Giữ PostgreSQL làm nguồn trạng thái check-in cuối cùng.
- Đồng bộ lại thay đổi từ server và các lượt quét cục bộ khi có kết nối phù hợp.
- Gắn lượt quét với nhân viên, thiết bị và thời điểm để phục vụ xử lý conflict.
- Áp dụng cùng quy tắc sự kiện và cổng trong online/offline ở mức dữ liệu có sẵn.

## Các phương án được xem xét

OpenSpec mô tả các phương án dưới đây, nhưng repository không cung cấp biên bản xác nhận quá trình đánh giá hoặc kết quả thử nghiệm. Chỉ có thể khẳng định phương án thứ hai là hướng đã được triển khai; một số khả năng dự kiến trong OpenSpec vẫn chưa có trong code.

### Phương án 1: Chỉ xác minh online

Mọi QR được gửi tới backend và chỉ cho phép khách vào sau khi server trả kết quả.

Ưu điểm:

- Mỗi lượt quét dùng trạng thái mới nhất trong PostgreSQL.
- Dễ ngăn duplicate giữa nhiều thiết bị hơn nếu transition trên server là atomic.
- Không cần lưu ticket manifest và scan queue trên mobile.

Nhược điểm:

- Luồng vào cổng dừng khi mạng hoặc backend không truy cập được.
- Mỗi lượt quét chịu network latency.
- Không đáp ứng yêu cầu vận hành tại venue có kết nối không ổn định.

### Phương án 2: SQLite cục bộ và đồng bộ eventual consistency

Mobile tải vé về SQLite, xác minh và ghi nhận lượt quét offline cục bộ, sau đó gửi log lên backend khi có Wi-Fi.

Ưu điểm:

- Quét và phản hồi ngay cả khi không có kết nối.
- Dữ liệu quét tồn tại sau khi chuyển màn hình hoặc khởi động lại database.
- Backend vẫn có thể tổng hợp trạng thái sau khi thiết bị kết nối lại.

Nhược điểm:

- Local success chỉ là kết quả tạm thời cho tới khi sync.
- Hai thiết bị offline có thể cùng chấp nhận một vé.
- Phải quản lý dữ liệu cũ, sync queue, conflict và bảo mật dữ liệu trên thiết bị.

Đây là phương án được triển khai hiện tại.

### Phương án 3: Bộ điều phối cục bộ tại venue

Các máy quét giao tiếp với một edge server hoặc mạng cục bộ tại venue; edge server đồng bộ với backend khi Internet trở lại.

Ưu điểm:

- Có thể phát hiện duplicate giữa các thiết bị trong cùng venue khi Internet bên ngoài mất.
- Giữ latency thấp trong mạng cục bộ.

Nhược điểm:

- Thêm hạ tầng, deployment, discovery và quy trình vận hành tại venue.
- Edge state vẫn cần reconciliation với backend trung tâm.
- Không có bằng chứng phương án này đã được triển khai trong repository.

## Quyết định

Hệ thống chấp nhận eventual consistency cho offline check-in. SQLite trên mobile giữ snapshot vé và log quét cục bộ; PostgreSQL giữ trạng thái check-in cuối cùng. Mobile ưu tiên xác minh trực tiếp qua backend khi có Wi-Fi khả dụng và dùng dữ liệu cục bộ khi không có Wi-Fi.

### Chuẩn bị dữ liệu offline

1. User đăng nhập bằng tài khoản có vai trò `CHECK_IN_STAFF`, `ORGANIZER` hoặc `ADMIN`.
2. Mobile gọi `GET /checkin/events` để lấy các sự kiện được trả về cho user.
3. Khi nhân viên tải một sự kiện, mobile gọi `GET /checkin/tickets?eventId=...`.
4. Danh sách vé được `INSERT OR REPLACE` vào bảng SQLite `valid_tickets`, gồm ticket ID, code, gate, attendee, status, event ID và thời điểm cập nhật cục bộ.
5. Dữ liệu này là snapshot dùng cho offline validation, không thay thế trạng thái PostgreSQL.

### Quét online

Khi thiết bị nhận diện có Wi-Fi, mobile gọi `POST /checkin/verify` với `ticketId`. Backend chạy Prisma transaction, kiểm tra vé tồn tại, cổng của nhân viên và trạng thái `CHECKED_IN`; lượt hợp lệ tạo `CheckInLog` trạng thái `ACCEPTED` rồi cập nhật `Ticket` thành `CHECKED_IN`.

Sau thành công, mobile cập nhật vé SQLite thành `CHECKED_IN` và tạo log cục bộ đã được đánh dấu synced. Nếu backend trả `already_checked_in`, mobile cũng cập nhật trạng thái cục bộ để ngăn quét lại trên thiết bị.

### Quét offline

Khi không có Wi-Fi, mobile:

1. Xác minh chữ ký QR RS256 bằng public key cấu hình trong ứng dụng.
2. Kiểm tra `eventId` trong QR với sự kiện đang quét.
3. Tìm `ticketId` trong `valid_tickets`.
4. Từ chối vé cục bộ đã `CHECKED_IN`.
5. Nếu user có `assignedGateId`, yêu cầu dữ liệu vé có `gateId` và phải trùng cổng được gán.
6. Với vé hợp lệ, cập nhật `valid_tickets.status` thành `CHECKED_IN` và thêm log `VALID` có `synced = 0` vào `checkin_logs`.
7. Hiển thị thành công ngay, trước khi backend xác nhận.

Kết quả này phải được hiểu là provisional. Code UI hiển thị thành công nhưng không lưu một trạng thái domain riêng tên `PROVISIONAL`.

### Đồng bộ

Khi màn hình scanner đang hoạt động, mobile chạy đồng bộ mỗi 15 giây và hỗ trợ nút đồng bộ thủ công. Đồng bộ chỉ chạy khi `expo-network` báo kết nối Wi-Fi có thể sử dụng.

1. Mobile gọi `GET /checkin/sync-down?lastUpdated=...`.
2. Backend trả trạng thái log mới nhất theo từng `ticketId` sau mốc thời gian và kèm `serverTime`.
3. Mobile ánh xạ `ACCEPTED` thành `CHECKED_IN` trong SQLite.
4. Mobile đọc các log `VALID` có `synced = 0` và gửi chúng tới `POST /checkin/sync`.
5. Backend xử lý từng log, kiểm tra ticket, gate và `CheckInLog` `ACCEPTED` đã tồn tại.
6. Backend trả từng kết quả `SYNCED`, `INVALID_GATE`, `NOT_FOUND` hoặc `CONFLICT_ALREADY_CHECKED_IN`.
7. Sau khi request sync hoàn tất không ném lỗi, mobile đánh dấu toàn bộ log đã gửi là synced.

Policy trong source được chú thích là “first-valid-check-in wins”. Implementation thực tế chấp nhận lượt `VALID` đầu tiên được backend xử lý khi chưa thấy log `ACCEPTED`; nó không sắp xếp toàn cục theo `scannedAt` và không bảo đảm lượt quét có timestamp sớm nhất thắng.

PostgreSQL, cụ thể là `Ticket` và `CheckInLog`, là source of truth sau đồng bộ. SQLite là working copy và queue cục bộ của từng thiết bị.

## Lý do

**Có bằng chứng trực tiếp:** mobile dùng `expo-sqlite`, lưu `valid_tickets`/`checkin_logs`, xác minh offline và đồng bộ qua các endpoint của `CheckinController`. Backend kiểm tra existing `ACCEPTED` log trước khi nhận lượt sync mới. Git history có các thay đổi để sync khi Wi-Fi khả dụng và kiểm tra sai cổng offline.

**Suy luận hợp lý:** thiết kế ưu tiên throughput tại cổng và khả năng tiếp tục vận hành hơn strong consistency tức thời giữa các thiết bị offline. Việc giữ trạng thái cuối cùng ở PostgreSQL cho phép backend giải quyết conflict sau kết nối lại.

**Cần xác minh:** repository không ghi nhận kết quả thử nghiệm venue thực tế, mức duplicate chấp nhận được, thời gian stale snapshot cho phép hoặc lý do chỉ xem Wi-Fi là online.

## Hệ quả

### Tích cực

- Nhân viên có thể tiếp tục quét vé bằng dữ liệu đã tải khi không có Wi-Fi.
- QR sai chữ ký, sai sự kiện, sai cổng hoặc đã quét trên cùng thiết bị được từ chối tại chỗ.
- SQLite giữ log hợp lệ chưa đồng bộ qua các lần render và trong database của ứng dụng.
- Backend có thể trả conflict khi vé đã có lượt `ACCEPTED` trước đó.
- Sync-down đưa trạng thái check-in từ thiết bị khác về local snapshot.
- Online check-in cập nhật log và ticket trong Prisma transaction.

### Tiêu cực

- Cùng một khách có thể được cho vào ở nhiều cổng nếu các thiết bị đều offline và chưa chia sẻ trạng thái.
- Backend sync không có `scanId`, `batchId`, unique constraint hoặc idempotency key cho từng lượt quét.
- Mobile không lưu outcome riêng của từng log; toàn bộ batch bị đánh dấu synced sau một HTTP response thành công, kể cả log có kết quả conflict/not-found/invalid-gate.
- `CheckInLog.isOfflineSync` tồn tại trong schema nhưng sync service không đặt thành `true`.
- Server conflict check và create/update trong `syncCheckins` không nằm trong transaction; nhiều sync request đồng thời có thể cùng vượt qua bước kiểm tra.
- Online transaction không dùng conditional update hoặc row lock cho `Ticket.status`; hai request online đồng thời vẫn cần được kiểm thử về duplicate acceptance.
- SQLite local không được mã hóa và chứa tên/email người tham dự.
- Mobile chỉ gửi log `VALID`; các lần từ chối offline không tạo audit record trên server.
- Lỗi background sync bị bắt và bỏ qua, không có trạng thái failed/retry hay thông báo vận hành.
- `deviceId` hiện dùng model name của thiết bị, không phải định danh thiết bị ổn định và duy nhất.

### Trung tính

- Nhân viên phải đăng nhập và tải dữ liệu vé trước khi mất kết nối.
- Public key QR phải được cấu hình trong build mobile.
- Local schema được nâng cấp bằng các lệnh `ALTER TABLE` thử rồi bỏ qua lỗi, thay vì migration có version.
- Đồng bộ định kỳ chỉ hoạt động khi màn hình scanner được mount.
- Server và mobile phải duy trì mapping giữa trạng thái `ACCEPTED` và `CHECKED_IN`.

## Invariant và nguyên tắc bắt buộc

- PostgreSQL là source of truth cho trạng thái check-in cuối cùng.
- SQLite chỉ là snapshot và queue cục bộ; local success offline không phải xác nhận server-final.
- QR phải qua xác minh chữ ký trước khi mobile dùng payload cho offline validation.
- Vé offline phải tồn tại trong snapshot của sự kiện đang quét.
- Vé sai sự kiện hoặc sai cổng không được chấp nhận.
- Một vé đã `CHECKED_IN` trong SQLite không được chấp nhận lại trên cùng thiết bị.
- Chỉ log `VALID` chưa synced mới được gửi qua sync queue hiện tại.
- Backend phải xác thực JWT và role trước khi cung cấp dữ liệu hoặc nhận sync.
- Một lượt sync chỉ được chấp nhận nếu ticket tồn tại và không có lượt `ACCEPTED` thắng trước đó theo policy server hiện tại.
- Khi backend chấp nhận log `VALID`, `Ticket.status` phải trở thành `CHECKED_IN` và `checkedInAt` phải phản ánh thời điểm scan được gửi.
- Kết quả từ sync-down phải cập nhật local snapshot trước các lượt quét offline tiếp theo.
- Không được xem timestamp do thiết bị gửi là thời gian đáng tin tuyệt đối nếu chưa có clock-skew validation.

## Failure Modes

| Failure mode | Ảnh hưởng | Cách hệ thống hiện tại xử lý | Khoảng trống hoặc rủi ro còn lại |
|---|---|---|---|
| Thiết bị chưa tải vé trước khi offline | Không thể xác minh ticket từ snapshot | Hiển thị “Chưa có dữ liệu vé” và không chấp nhận | Không có manifest/readiness version chính thức |
| QR sai chữ ký hoặc không có `ticketId` | Vé giả/hỏng có thể được quét | Mobile từ chối trước khi tra SQLite/API | Public key rotation và key version chưa được triển khai |
| Vé thuộc sự kiện khác | Khách đi sai sự kiện | Mobile so sánh `payload.eventId` và cảnh báo | Nếu payload không có `eventId`, check này bị bỏ qua; local lookup vẫn dựa trên ticket ID |
| Vé sai cổng | Khách đi sai cổng được phân | Online và offline đều so sánh `assignedGateId` với `ticket.gateId` | User không có assigned gate không bị giới hạn cổng |
| Dữ liệu offline cũ không có `gateId` | Không thể xác minh cổng | Mobile chặn và yêu cầu tải lại dữ liệu | Không có schema version/readiness check trước khi vào scanner |
| Hai thiết bị offline quét cùng vé | Cả hai có thể hiển thị thành công và cho khách vào | Backend trả conflict cho lượt được xử lý sau khi sync | Không thể đảo ngược việc khách đã được cho vào; không có conflict dashboard/audit outcome riêng |
| Hai sync request đồng thời cho cùng vé | Có thể cùng thấy chưa có `ACCEPTED` | Chưa tìm thấy cơ chế xử lý atomic | Không có transaction, row lock hoặc unique accepted-scan constraint |
| Hai verify online đồng thời | Có thể cùng đọc ticket chưa `CHECKED_IN` | Mỗi verify chạy trong Prisma transaction | Chưa có conditional state transition/row lock; cần concurrency test |
| Sync batch có kết quả một phần | Một số log conflict hoặc invalid | Backend trả outcome theo từng ticket | Mobile bỏ qua outcome và đánh dấu toàn bộ log synced |
| Request sync lỗi trước khi có response | Log chưa được đánh dấu synced | Catch bỏ lỗi; lần định kỳ sau đọc lại log `synced = 0` | Không có backoff, failed state hoặc thông báo; duplicate retry không idempotent rõ ràng |
| Có Wi-Fi nhưng backend không gọi được | Nhân viên không xác minh online | UI cảnh báo lỗi kết nối | Không fallback sang offline path dù snapshot có sẵn |
| Có cellular nhưng không có Wi-Fi | Thiết bị dùng offline path | `hasWifiConnection` chỉ coi Wi-Fi là online | Có thể bỏ qua backend dù Internet di động hoạt động; cần xác minh đây có phải chủ ý |
| App khởi động hoàn toàn offline | Không restore được profile/gate assignment | `restoreSession` gọi `/auth/me`, thất bại thì unauthenticated | Token staff không hết hạn nhưng app vẫn chưa hỗ trợ cold-start offline đầy đủ |
| Process dừng giữa update ticket local và insert log | Ticket local có thể `CHECKED_IN` nhưng không có log chờ sync | Chưa tìm thấy cơ chế xử lý | Hai thao tác không nằm trong cùng SQLite transaction |
| Đồng hồ thiết bị sai | `checkedInAt` và thứ tự scan sai | Backend lưu `scannedAt` do client gửi | Không có clock offset, freshness validation hoặc timestamp normalization |
| `sync-down` trả dữ liệu ngoài event | Local client nhận ticket IDs của phạm vi rộng | Endpoint yêu cầu role hợp lệ | Query không filter theo event/user; cần xác minh authorization và data-minimization |

## Tác động đến các thành phần

| Thành phần | Tác động |
|---|---|
| `CheckinController` | Cung cấp events, tickets, verify, sync-down và sync APIs có auth/role guard |
| `CheckinService` | Xác minh online, ghi log, cập nhật ticket và xử lý conflict khi sync |
| `checkin.dto.ts` | Định nghĩa contract log gồm `ticketId`, `deviceId`, `scannedAt`, `scanResult` |
| `Ticket` | Giữ trạng thái `ISSUED`, `CHECKED_IN`, `VOIDED` và `checkedInAt` cuối cùng |
| `CheckInLog` | Lưu staff, device, scan time và kết quả server |
| `User.assignedGateId` | Giới hạn cổng của nhân viên trong online/offline validation |
| Mobile `scanner.tsx` | Chọn online/offline path, xác minh QR, tạo log và chạy sync |
| Mobile `db.ts` | Quản lý SQLite snapshot, local state và unsynced queue |
| Mobile `events.tsx` | Tải và refresh dữ liệu vé cho offline use |
| Mobile `crypto.ts` | Xác minh QR RS256 trước offline processing |
| Mobile `api.ts` | Gửi Bearer token và gọi các check-in endpoint |
| PostgreSQL | Lưu trạng thái authoritative sau online verify hoặc sync |
| SQLite thiết bị | Lưu working copy và log provisional của từng thiết bị |

## Bảo mật

- Các endpoint check-in dùng `JwtAuthGuard`, `RolesGuard` và cho phép `CHECK_IN_STAFF`, `ORGANIZER`, `ADMIN`.
- Offline QR được xác minh bằng public key RS256; private signing key không nằm trên mobile.
- Gate assignment được lấy từ authenticated profile và so với `gateId` của ticket.
- SQLite hiện lưu ticket ID, code, tên và email người tham dự dưới dạng không mã hóa; mất thiết bị có thể làm lộ dữ liệu snapshot.
- `getTickets(eventId)` không thực hiện kiểm tra assignment trực tiếp trong service ngoài role guard; quyền truy cập event dựa phần lớn vào cách danh sách event được cung cấp cho user. Client có thể tự truyền event ID khác, nên cần xác minh authorization boundary.
- `syncDown` không filter theo event, organizer hoặc staff assignment; dù response không chứa attendee PII, nó có thể làm lộ ticket ID và check-in activity ngoài phạm vi.
- Backend tin `deviceId` và `scannedAt` do client cung cấp; chưa có device registration, attestation hoặc freshness check.
- Local invalid scans không lên server nên audit trail không đầy đủ.
- ADR không chứa QR payload thật, token, public key hoặc dữ liệu cá nhân.

## Khả năng vận hành và quan sát

**Đã tồn tại:** mobile hiển thị số log chờ đồng bộ; backend trả outcome theo từng ticket; PostgreSQL lưu `CheckInLog` với staff/device/timestamp; Git history ghi nhận các sửa lỗi sync Wi-Fi và gate validation.

**Chưa tìm thấy:**

- Structured log cho batch sync, conflict, sync latency hoặc duplicate rate.
- Metric số scan offline, thời gian pending, tỷ lệ conflict và lỗi theo device/event/gate.
- Alert khi thiết bị không sync trong thời gian dài hoặc conflict tăng bất thường.
- Stable scan ID/batch ID/correlation ID xuyên mobile và backend.
- Dashboard conflict và audit outcome cho mỗi lượt local scan.
- Trạng thái last successful full ticket download/readiness age đáng tin cậy.
- Metric clock skew hoặc scan timestamp bất thường.

Các mục chưa tồn tại là nhu cầu vận hành suy ra từ eventual-consistency model, không phải tính năng đã triển khai.

## Kiểm thử và xác minh

Không tìm thấy unit, integration hoặc end-to-end test dành riêng cho `CheckinService`, SQLite sync hay concurrent duplicate check-in. Git history cho thấy có sửa lỗi thủ công liên quan tới Wi-Fi sync và gate validation, nhưng commit không thay thế bằng chứng test tự động.

Quyết định cần được xác minh bằng:

- E2E test tải vé, tắt mạng, quét, bật mạng và kiểm tra PostgreSQL/SQLite hội tụ.
- Test hai thiết bị offline quét cùng vé rồi sync theo các thứ tự khác nhau.
- Concurrency test nhiều `POST /checkin/sync` và `POST /checkin/verify` cho cùng ticket.
- Test partial batch outcome và bảo toàn log chưa được server chấp nhận.
- Test crash giữa local ticket update và local log insert.
- Test Wi-Fi có Internet, Wi-Fi không gọi được backend, cellular-only và cold-start offline.
- Authorization test cho `getTickets`, `syncDown`, `verify` và `sync` ngoài event/gate assignment.
- Security test QR giả, QR sai event, stale/revoked ticket và device timestamp bất thường.
- Migration test cho các phiên bản SQLite cũ thiếu `eventId` hoặc `gateId`.

## Kế hoạch rollback hoặc thay thế

Có thể vô hiệu hóa offline path ở mobile và buộc mọi lượt quét gọi `POST /checkin/verify`; PostgreSQL schema `Ticket` và `CheckInLog` vẫn dùng được. Tuy nhiên rollback này làm ứng dụng không thể soát vé khi backend hoặc mạng không khả dụng và cần phát hành lại mobile client.

Thay bằng edge server tại venue yêu cầu thêm service, local network discovery, authentication giữa scanner–edge, replication và conflict protocol. Dữ liệu SQLite hiện tại cần được migrate hoặc bỏ sau khi toàn bộ log pending đã sync.

Nâng cấp implementation hiện tại sang idempotent batch sync cần bổ sung stable `scanId`/`batchId`, constraint hoặc dedup store, trạng thái outcome cục bộ và migration cho cả PostgreSQL lẫn SQLite. Trong giai đoạn chuyển đổi, backend phải chấp nhận contract mobile cũ cho tới khi thiết bị được cập nhật.

## Tiêu chí đánh giá lại

ADR cần được xem xét lại khi:

- Tỷ lệ cross-device duplicate hoặc conflict vượt ngưỡng vận hành được thống nhất.
- Venue yêu cầu ngăn duplicate giữa các cổng ngay cả khi Internet mất.
- Sync lag làm dữ liệu local quá cũ để quyết định cho khách vào.
- Yêu cầu audit/compliance bắt buộc outcome cho mọi scan, kể cả invalid/conflict.
- PII trên SQLite phải được mã hóa hoặc giảm thiểu theo chính sách bảo mật.
- Số thiết bị hoặc batch size làm sync tuần tự hiện tại trở thành bottleneck.
- Có bằng chứng concurrent sync/verify tạo nhiều log `ACCEPTED` cho cùng ticket.
- Hệ thống triển khai scan ID, batch ID, per-log outcome và idempotent retry theo OpenSpec.
- Connectivity policy cần hỗ trợ cellular, degraded network hoặc background task ngoài scanner screen.
- QR key rotation hoặc ticket revocation phải có hiệu lực offline trong thời gian ngắn hơn.

## Bằng chứng trong repository

- `src/apps/backend/src/checkin/checkin.controller.ts`: REST API và role guard cho check-in.
- `src/apps/backend/src/checkin/checkin.service.ts`: online verify, sync-down, sync-up, gate check và conflict handling.
- `src/apps/backend/src/checkin/checkin.dto.ts`: schema của sync log.
- `src/apps/backend/prisma/schema.prisma`: `Ticket`, `CheckInLog`, `TicketStatus`, `CheckInStatus` và gate assignment.
- `src/apps/ui/mobile-checkin/src/app/scanner.tsx`: quyết định online/offline, local validation và sync mỗi 15 giây.
- `src/apps/ui/mobile-checkin/src/app/events.tsx`: tải dữ liệu vé vào SQLite.
- `src/apps/ui/mobile-checkin/src/services/db.ts`: schema SQLite, snapshot vé, log và synced flag.
- `src/apps/ui/mobile-checkin/src/services/api.ts`: check-in API client và token interceptor.
- `src/apps/ui/mobile-checkin/src/services/crypto.ts`: QR signature verification.
- `src/apps/ui/mobile-checkin/src/services/auth.ts`: session restore phụ thuộc `/auth/me`.
- `src/apps/ui/mobile-checkin/package.json`: Expo Camera, Network, SQLite, SecureStore và cryptography dependencies.
- `blueprint/specs/checkin.md`: đặc tả hiện trạng online/offline và đồng bộ.
- `blueprint/design.md`: vị trí mobile check-in trong kiến trúc tổng thể.
- `openspec/changes/offline-ticket-checkin/design.md`: mục tiêu, phương án và trade-off ban đầu; nhiều mục idempotency/audit chưa có trong code.
- Lịch sử Git: `998d61a` sửa kiểm tra sai cổng offline; `abcf86d` sửa thời điểm gọi sync theo Wi-Fi.

## Nội dung cần xác minh

- Ngưỡng duplicate/conflict được chấp nhận tại venue và quy trình xử lý khách đã được cho vào hai lần.
- “First valid wins” phải dựa trên server processing order hay timestamp scan sớm nhất.
- Lý do chỉ coi Wi-Fi là online và không fallback offline khi Wi-Fi gọi backend thất bại.
- Authorization mong muốn cho `getTickets` và `syncDown` theo organizer/event assignment.
- Yêu cầu mã hóa/retention đối với attendee data và log trong SQLite.
- `deviceId` mong muốn là model name hay một device identity được đăng ký ổn định.
- Mục đích của `CheckInLog.isOfflineSync` và lý do service chưa cập nhật trường này.
- Chính sách retry, batch size, idempotency và lưu per-log outcome.
- Kết quả test thực tế với nhiều thiết bị và clock skew.
- Quy trình key rotation, ticket revocation và refresh snapshot trước sự kiện.

## Tham khảo

- `docs/adr/ADR-003-jwt-refresh-token-rotation-rbac.md`
- `blueprint/specs/checkin.md`
- `blueprint/specs/mobile-checkin.md`
- `blueprint/design.md`
- `openspec/changes/offline-ticket-checkin/design.md`
- `openspec/changes/offline-ticket-checkin/specs/checkin-sync-and-eventual-consistency/spec.md`
- `openspec/changes/offline-ticket-checkin/specs/checkin-conflict-resolution/spec.md`
- `openspec/changes/offline-ticket-checkin/specs/local-checkin-persistence/spec.md`
