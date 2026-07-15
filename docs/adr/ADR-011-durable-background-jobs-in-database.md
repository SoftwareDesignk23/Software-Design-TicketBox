# ADR-011: Durable background job lưu trong database

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Nguyễn Phúc Hậu
- Phạm vi: AI artist bio và CSV guest-list background processing
- Liên quan: ADR-001, ADR-002, ADR-007, `blueprint/specs/ai-artist-bio.md`, `blueprint/specs/csv-guestlist.md`

## Bối cảnh

AI bio và CSV guest-list là các tác vụ có thể chạy lâu hơn một HTTP request, phụ thuộc file/provider bên ngoài và cần cho admin/organizer xem trạng thái sau khi request ban đầu kết thúc. Chỉ giữ trạng thái trong memory hoặc trong RabbitMQ message không đủ để giao diện truy vấn, đối soát kết quả hoặc phục hồi sau khi backend restart.

Repository triển khai model Prisma `BackgroundJob` trong PostgreSQL với các trường:

- `id` UUID;
- `type` dạng chuỗi, hiện dùng `AI_ARTIST_BIO` và `CSV_GUEST_LIST`;
- `status` dạng chuỗi, hiện dùng `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`;
- `data` JSON cho input/context;
- `result` JSON cho kết quả hoặc lỗi;
- `createdBy`, `createdAt`, `updatedAt`.

RabbitMQ message chỉ mang `jobId`. Worker tải lại input và trạng thái từ PostgreSQL, chuyển job sang `PROCESSING`, thực hiện side effect rồi ghi `COMPLETED` hoặc `FAILED`. Admin dashboard đọc danh sách job và poll chi tiết job đang chạy mỗi 2 giây.

Hai loại job có cách kích hoạt khác nhau:

- AI job được tạo `PENDING` rồi publish `job.ai.bio` ngay.
- CSV job được tạo `PENDING` nhưng chưa publish ngay; cron 02:00 hoặc thao tác admin publish `job.csv.import`.

Database row là durable control record. Điều này không tự bảo đảm input artifact, RabbitMQ delivery hoặc side effect là exactly-once.

## Decision Drivers

- Duy trì trạng thái job qua restart của backend/worker.
- Cho client nhận `jobId` ngay và theo dõi tiến trình bằng REST.
- Tách payload lớn/context khỏi RabbitMQ message.
- Lưu kết quả hoặc lỗi để admin/organizer xem lại.
- Cho phép trì hoãn CSV job tới lịch chạy hoặc kích hoạt thủ công.
- Giữ PostgreSQL làm system of record cho operational state.
- Cho worker kiểm tra trạng thái trước khi xử lý message giao lại.
- Hỗ trợ đối soát job với side effect AI/CSV sau sự cố.

## Các phương án được xem xét

Repository không lưu đầy đủ biên bản benchmark hoặc đánh giá lịch sử. Các phương án dưới đây là phân tích kiến trúc; model và service hiện tại là bằng chứng cho phương án được chọn.

### Phương án 1: Chỉ lưu job trong memory

Request tạo promise/task nội bộ và giữ trạng thái trong process.

Ưu điểm:

- Triển khai đơn giản cho tác vụ ngắn.
- Không cần broker hoặc bảng job.

Nhược điểm:

- Mất trạng thái và tác vụ khi process restart.
- Không chia sẻ được giữa nhiều instance.
- Client khó truy vấn lịch sử/kết quả đáng tin cậy.

### Phương án 2: Chỉ dùng RabbitMQ message

Toàn bộ input nằm trong message; trạng thái suy ra từ queue/ACK/DLQ.

Ưu điểm:

- Ít database write cho lifecycle job.
- Broker trực tiếp phân phối công việc.

Nhược điểm:

- UI khó truy vấn trạng thái theo user/job.
- Message payload có thể lớn hoặc chứa dữ liệu nhạy cảm.
- ACK không biểu diễn đầy đủ kết quả nghiệp vụ.
- Queue không thay thế audit/history database.

### Phương án 3: Database job record kết hợp RabbitMQ trigger

PostgreSQL lưu control state/input/result; RabbitMQ chỉ gửi `jobId` để đánh thức worker.

Ưu điểm:

- Trạng thái durable và query được.
- Message nhỏ, worker luôn đọc context mới nhất từ database.
- Có thể kích hoạt bằng HTTP, cron hoặc broker mà dùng cùng processor.
- PostgreSQL tiếp tục là system of record.

Nhược điểm:

- Ghi job và publish message không atomically nếu không có outbox.
- Cần claim/lease, retry, recovery và retention rõ ràng.
- Phải giữ database state và side effect nhất quán khi worker crash.

Đây là phương án được triển khai.

### Phương án 4: Chỉ database queue bằng polling/`SKIP LOCKED`

Worker claim trực tiếp các row `PENDING` mà không dùng RabbitMQ.

Ưu điểm:

- Có thể tạo job và enqueue atomically trong PostgreSQL.
- Một nguồn duy nhất cho queue và trạng thái.

Nhược điểm:

- Cần tự xây dựng polling, wake-up, backoff và throughput control.
- Tạo tải truy vấn định kỳ và độ trễ giữa các lần poll.
- Không tái sử dụng RabbitMQ hiện có cho dispatch.

## Quyết định

Sử dụng PostgreSQL `BackgroundJob` làm durable control record cho tác vụ nền, kết hợp RabbitMQ làm transport kích hoạt worker.

### Lifecycle

1. API xác thực request, lưu input/context vào `BackgroundJob` với trạng thái `PENDING` và trả `jobId`.
2. Producer hoặc scheduler publish message chỉ chứa `jobId`.
3. Worker đọc job; job không tồn tại hoặc không còn `PENDING` thì không xử lý.
4. Worker chuyển job sang `PROCESSING` trước khi thực hiện công việc.
5. Thành công ghi `COMPLETED` và `result`; lỗi cuối ghi `FAILED` và thông tin lỗi phù hợp.
6. Admin API cho phép list/poll trạng thái từ PostgreSQL.

### Luồng cụ thể

- AI lưu `concertId`, `aiProvider` và `pdfFilePath`; kết quả lưu thông tin artist.
- CSV lưu `showId` và `fileUrl`; kết quả lưu số dòng xử lý/thành công/thất bại và danh sách dòng lỗi.
- CSV cron tìm toàn bộ `CSV_GUEST_LIST` đang `PENDING` lúc 02:00 và publish từng job.
- Admin có thể yêu cầu chạy ngay CSV job còn `PENDING`.

### Ý nghĩa durability

- Durable: identity, type, state, JSON context/result và timestamps tồn tại trong PostgreSQL qua process restart.
- Không được suy diễn: exactly-once processing, durable artifact, automatic retry, atomic enqueue, progress tracking hoặc recovery job bị kẹt.

Mọi cải tiến phải giữ database row là nguồn trạng thái job; RabbitMQ ACK không được dùng thay cho terminal status.

## Lý do

Hybrid database record + broker trigger phù hợp với yêu cầu vừa query được từ admin UI, vừa dispatch bất đồng bộ. Message chỉ mang `jobId` tránh sao chép input lớn và cho worker kiểm tra trạng thái hiện tại trước khi chạy.

CSV còn cần trạng thái `PENDING` tồn tại nhiều giờ trước lịch 02:00, nên queue message đơn thuần không biểu diễn thuận tiện ý định trì hoãn và UI status. AI trả `jobId` ngay để giao diện poll thay vì giữ request tới khi provider hoàn tất.

## Hệ quả

### Tích cực

- Job và terminal result tồn tại qua restart.
- Admin dashboard có thể khôi phục selection và tiếp tục poll job đang chạy.
- RabbitMQ payload nhỏ và không chứa toàn bộ PDF/CSV/result.
- Worker bỏ qua message của job đã rời `PENDING` trong phần lớn trường hợp giao lại tuần tự.
- CSV dùng chung processor cho cron và manual trigger.
- Lỗi nghiệp vụ được ghi `FAILED` thay vì chỉ nằm trong process log.

### Tiêu cực

- Claim hiện là hai bước `findUnique` rồi `update`; hai consumer đồng thời có thể cùng thấy `PENDING` và cùng xử lý.
- Không có `attemptCount`, `maxAttempts`, `nextRunAt`, `lockedBy`, lease, heartbeat, timeout hoặc cancel state.
- Không có watchdog đưa job `PROCESSING` bị crash về trạng thái có thể retry.
- Không có transactional outbox giữa tạo job và publish; AI job có thể `PENDING` nhưng không có message.
- Worker bắt lỗi và trả bình thường; RabbitMQ thường ACK, nên broker không tự retry AI/CSV job.
- `type` và `status` là `String`, không phải Prisma enum/database constraint; giá trị không hợp lệ có thể được ghi.
- Không thấy index cho truy vấn `type + status`, `createdBy` hoặc `createdAt`.
- Không có idempotency key/unique constraint cho logical job; request lặp tạo nhiều job.
- Không có retention/archive/cleanup; `data` và `result` có thể tăng vô hạn.
- `createdBy` là chuỗi không có foreign key và comment schema không thống nhất organizer ID hay user ID; code hiện ghi user ID.

### Trung lập

- JSON `data/result` linh hoạt giữa nhiều loại job nhưng không được database kiểm tra schema.
- UI dùng polling 2 giây thay vì realtime job event.
- Trạng thái durable không làm input file hoặc external URL tự trở nên durable.

## Các invariant cần duy trì

- PostgreSQL row là nguồn trạng thái job cuối cùng.
- Chỉ transition hợp lệ: `PENDING -> PROCESSING -> COMPLETED|FAILED`, trừ khi có retry/cancel design mới.
- Một logical execution chỉ được một worker claim atomically.
- Terminal job không được chạy lại nếu không tạo attempt/retry transition rõ ràng.
- RabbitMQ message chỉ tham chiếu job hợp lệ và worker phải tải context từ database.
- Side effect phải idempotent hoặc có deduplication trước khi hỗ trợ retry/redelivery.
- Job access phải được scope theo creator/organizer/domain ownership.
- Input artifact phải còn truy cập được bởi worker nhận job, không chỉ process tạo job.
- `result`/error không được lưu secret, raw credential hoặc PII quá mức cần thiết.
- Job `PROCESSING` phải có cơ chế phát hiện/recovery khi worker chết.
- Retention phải bảo toàn audit cần thiết nhưng xóa dữ liệu nhạy cảm đúng hạn.

Atomic claim, recovery, ownership đầy đủ và retention hiện chưa được code thực thi.

## Failure Modes

| Tình huống | Hành vi hiện tại | Ảnh hưởng | Giảm thiểu/việc cần làm |
|---|---|---|---|
| DB tạo AI job thành công, RabbitMQ publish lỗi | API lỗi nhưng row còn `PENDING` | Job không được xử lý tự động | Transactional outbox hoặc sweeper republish |
| CSV cron publish lỗi giữa vòng lặp | Cron không catch từng job | Các job sau có thể đợi tới lần cron tiếp theo | Per-job error isolation và retry schedule |
| Hai message cùng `jobId` đến đồng thời | Cả hai có thể đọc `PENDING` trước update | Side effect chạy hai lần | Atomic conditional update/`SKIP LOCKED` claim |
| Worker chết sau khi ghi `PROCESSING` | Không có lease/watchdog | Job kẹt vĩnh viễn | `lockedAt`, heartbeat và stale-job recovery |
| Worker lỗi sau side effect nhưng trước `COMPLETED` | Job có thể `PROCESSING` hoặc `FAILED` dù side effect đã xảy ra | Retry có nguy cơ duplicate | Idempotent side effect và execution record |
| AI publish message bị mất | Không có AI sweeper `PENDING` quan sát được | Job chờ vô hạn | Outbox hoặc periodic dispatcher |
| AI PDF lưu local filesystem | Worker khác/restart/container có thể không thấy path | AI xử lý thiếu input; code có thể vẫn hoàn thành bằng fallback | Durable object storage và artifact reference |
| AI extraction lỗi | Lỗi bị log, processor tiếp tục fallback | Job có thể `COMPLETED` với artist ngẫu nhiên/thông tin thiếu | Xác định lỗi terminal hay degraded result rõ ràng |
| PDF extraction lỗi trước cleanup | Cleanup không nằm trong `finally` | File tạm có thể tồn tại | Artifact lifecycle/cleanup job |
| CSV URL hết hạn hoặc không truy cập được | Job chuyển `FAILED` | Import không chạy | Durable object storage/signed URL đủ hạn |
| CSV xử lý một phần rồi lỗi | Side effect từng chunk/row đã commit, job `FAILED` | Retry có thể lặp/không nhất quán | Per-row idempotency và checkpoint/progress |
| Worker catch exception rồi return | Message được ACK mà không broker retry | Chỉ DB status/log còn lại | Retry policy dựa trên DB state |
| `type/status` sai chính tả | Database vẫn chấp nhận String | Job không được dispatcher/worker nhận | Prisma enum/check constraint |
| Job/result tăng không giới hạn | Không thấy cleanup | Database phình và giữ PII lâu | Retention/archive policy |
| Organizer biết UUID job khác | `getJobStatus`/`runJob` không scope owner | Có thể xem result hoặc kích hoạt CSV job khác | Ownership check ở query và command |
| CSV result chứa dòng lỗi | JSON lưu row và reason | Có thể giữ email/phone/PII | Redact/minimize, retention và access control |
| Admin UI poll mỗi 2 giây | Mỗi active UI tạo truy vấn DB liên tục | Tải tăng theo số session | Backoff, ETag hoặc job event/realtime hint |

## Thành phần bị ảnh hưởng

| Thành phần | Vai trò |
|---|---|
| Prisma `BackgroundJob` | Durable job identity, state, input và result |
| `AiService` | Tạo/process AI job và ghi terminal result |
| `AiWorker` | Consumer `job.ai.bio` theo `jobId` |
| `CsvService` | Tạo, schedule, process và tổng hợp CSV job |
| `CsvWorker` | Consumer `job.csv.import` theo `jobId` |
| `AdminService`/`AdminController` | List, poll và manual trigger job |
| RabbitMQ | Dispatch signal, không phải job state store |
| Admin Dashboard | Khôi phục/list/poll và hiển thị lifecycle/result |
| Local/object storage và external URL | Nơi input artifact thực tế tồn tại |

## Bảo mật

- `data` và `result` là JSON linh hoạt nên phải validate theo `type` trước khi dùng.
- `createdBy` phải là identity có quan hệ rõ ràng; organizer chỉ được đọc/chạy job thuộc phạm vi mình quản lý.
- `GET /admin/jobs/:id` và `POST /admin/jobs/:id/run` hiện không truyền identity vào service để scope ownership, dù controller yêu cầu role admin/organizer.
- AI enqueue kiểm tra concert tồn tại nhưng không thấy kiểm tra organizer sở hữu concert; CSV enqueue cũng chưa xác minh ownership show ở request path.
- CSV failed-row result có thể chứa dữ liệu khách mời; cần minimize/redact và retention ngắn phù hợp.
- Error message không nên lưu stack, local path, provider response hoặc secret.
- `fileUrl` cần allowlist/validation để giảm SSRF khi worker gọi `axios.get` tới URL từ request.
- PDF local path không nên do client kiểm soát và phải nằm trong thư mục được quản lý.
- Admin API trả job data/result cần audit và tránh over-fetch trường nhạy cảm.

## Vận hành và quan sát

Hiện có `createdAt/updatedAt`, status/result trong PostgreSQL, worker/service log, danh sách 20 job gần nhất và UI poll 2 giây cho active job. CSV cron log lúc chạy và từng job được publish.

Chưa thấy trong repository:

- metric số job theo type/status/age;
- cảnh báo `PENDING` hoặc `PROCESSING` quá lâu;
- attempt history, duration, queue delay hoặc worker identity;
- correlation giữa HTTP request, DB job và RabbitMQ delivery;
- dashboard failure rate/throughput;
- retry/requeue command cho `FAILED`;
- cancellation và progress percentage/checkpoint;
- retention/archive/cleanup job;
- outbox dispatcher hoặc reconciliation worker;
- index tối ưu dispatcher/admin query.

## Chiến lược kiểm thử

Không tìm thấy automated test chuyên biệt cho `BackgroundJob` lifecycle trong các đường dẫn đã rà soát. Không chạy test trong quá trình lập ADR.

Cần bổ sung:

- tạo job trả `jobId` và lưu đúng creator/type/data;
- transition hợp lệ và từ chối transition từ terminal state;
- hai worker cạnh tranh chỉ một worker claim thành công;
- duplicate RabbitMQ delivery không lặp side effect;
- crash sau claim được watchdog khôi phục;
- publish lỗi sau DB commit được dispatcher phát lại;
- AI worker khác instance vẫn đọc được artifact;
- CSV partial failure và retry không tạo trùng ticket/notification;
- cron lỗi một job không chặn job tiếp theo;
- organizer không đọc/chạy job ngoài ownership;
- validation JSON theo job type và SSRF protection cho URL;
- retention xóa/redact data/result đúng policy;
- UI polling dừng ở terminal state và xử lý job bị kẹt.

## Rollback hoặc thay thế

Không nên xóa `BackgroundJob` ngay khi đổi transport vì UI và vận hành phụ thuộc trạng thái/history. Có thể thay RabbitMQ bằng database polling mà giữ model job:

1. Bổ sung atomic claim/index/lease trên bảng job.
2. Chạy dispatcher/worker mới song song, phân vùng theo job type hoặc feature flag.
3. Ngừng producer RabbitMQ sau khi queue cũ đã drain.
4. Đối soát mọi `PENDING`/`PROCESSING` trước khi gỡ consumer.
5. Giữ terminal rows theo retention policy.

Nếu chuyển sang managed job service, vẫn cần mapping job ID/trạng thái về PostgreSQL hoặc thay API/UI contract có migration rõ ràng.

## Tiêu chí xem xét lại

- Job `PENDING`/`PROCESSING` bị kẹt hoặc mất thường xuyên.
- Duplicate delivery gây side effect trùng.
- Số job tăng làm scan/poll database chậm.
- Cần retry, cancel, priority, progress hoặc scheduled execution phong phú.
- Cần worker deploy/scale độc lập và lease/heartbeat chuẩn hóa.
- Dữ liệu job/PII yêu cầu retention hoặc audit chặt hơn.
- RabbitMQ + DB dual-write tạo tỷ lệ orphan job đáng kể.
- Cần workflow nhiều bước/compensation mà model một row không đủ.
- Managed workflow/job platform giảm chi phí vận hành đáng kể.

## Bằng chứng trong repository

- `src/apps/backend/prisma/schema.prisma`: model `BackgroundJob` với String status/type và JSON data/result.
- `src/apps/backend/src/ai/ai.service.ts`: tạo AI job, lưu local PDF path, publish và lifecycle update.
- `src/apps/backend/src/ai/ai.worker.ts`: nhận `jobId`, gọi processor và catch lỗi.
- `src/apps/backend/src/ai/ai.controller.ts`: API role-protected tạo AI bio job.
- `src/apps/backend/src/csv/csv.service.ts`: tạo CSV job, cron 02:00, process và result từng dòng.
- `src/apps/backend/src/csv/csv.worker.ts`: nhận `jobId`, gọi processor và catch lỗi.
- `src/apps/backend/src/csv/csv.controller.ts`: API role-protected tạo CSV job từ `showId/fileUrl`.
- `src/apps/backend/src/admin/admin.service.ts`: list 20 job, get status và manual trigger CSV.
- `src/apps/backend/src/admin/admin.controller.ts`: endpoint job cho admin/organizer.
- `src/apps/ui/admin-dashboard/src/pages/ArtistBioPage.jsx`: list/restore và poll AI job mỗi 2 giây.
- `src/apps/ui/admin-dashboard/src/pages/GuestlistPage.jsx`: list/poll/manual run CSV job.
- `blueprint/specs/ai-artist-bio.md`: lifecycle AI job hiện tại.
- `blueprint/specs/csv-guestlist.md`: lifecycle CSV job hiện tại.

## Cần xác minh

- PostgreSQL production có index/check constraint hoặc migration ngoài schema repository hay không.
- `uploads/temp` có persistent/shared volume giữa worker instance hay không.
- `fileUrl` CSV có thời hạn, access control và SSRF protection ở storage/proxy ngoài code hay không.
- Có watchdog, cleanup, retry hoặc outbox chạy ngoài repository hay không.
- Retention/audit requirement cho job result và failed CSV rows.
- Ý nghĩa chính thức của `createdBy`: user ID hay organizer ID.
- Mức độ idempotent thực tế của AI artist creation và CSV per-row side effect khi chạy đồng thời.
- Có monitoring/alert job age/failure nằm ngoài repository hay không.
- Lịch sử đánh giá managed workflow hoặc database-only queue không được lưu trong repository.

## Tham chiếu

- `docs/adr/ADR-001-modular-monolith-three-independent-clients.md`
- `docs/adr/ADR-002-postgresql-prisma-system-of-record.md`
- `docs/adr/ADR-007-rabbitmq-asynchronous-communication.md`
- `blueprint/specs/ai-artist-bio.md`
- `blueprint/specs/csv-guestlist.md`
- `blueprint/specs/system-architecture.md`
- `blueprint/design.md`
