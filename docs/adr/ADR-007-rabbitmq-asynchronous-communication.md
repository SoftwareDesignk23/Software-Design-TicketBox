# ADR-007: RabbitMQ cho giao tiếp bất đồng bộ

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Lê Thành Công
- Phạm vi: Backend TicketBox, các luồng thông báo và background job
- Liên quan: ADR-002, ADR-004, `blueprint/specs/notification.md`, `blueprint/specs/system-architecture.md`

## Bối cảnh

TicketBox có các tác vụ không nên giữ HTTP request hoặc luồng nghiệp vụ chính chờ hoàn tất: gửi thông báo sau thanh toán, sinh tiểu sử nghệ sĩ bằng AI và nhập danh sách khách từ CSV. Các tác vụ này có thời gian xử lý và phụ thuộc bên ngoài khác nhau, đồng thời cần tách producer khỏi consumer.

Repository hiện triển khai RabbitMQ qua `@golevelup/nestjs-rabbitmq`. Một module global khai báo topic exchange `ticketbox.exchange`, dead-letter exchange `ticketbox.dlx` và queue `ticketbox.dlq`. Kết nối lấy từ `RABBITMQ_URL`, có giá trị mặc định dành cho môi trường local và được cấu hình `wait: false`, nên backend có thể khởi động khi broker chưa sẵn sàng.

Các luồng quan sát được:

- Thanh toán VNPAY thành công phát `payment.success`; notification consumer tạo thông báo IN_APP và EMAIL.
- Yêu cầu sinh bio tạo `BackgroundJob` trong PostgreSQL rồi phát `job.ai.bio`.
- Import CSV tạo `BackgroundJob` trạng thái `PENDING`; cron lúc 02:00 hoặc thao tác admin phát `job.csv.import`.
- Trong quá trình import CSV, vé khách được phát hành có thể tiếp tục phát `payment.success`.

PostgreSQL lưu booking, ticket, notification và trạng thái background job. RabbitMQ chỉ vận chuyển tín hiệu xử lý, không phải system of record.

## Decision Drivers

- Không chặn luồng thanh toán hoặc HTTP request bởi email, AI hay xử lý CSV dài hạn.
- Giảm phụ thuộc trực tiếp giữa producer và implementation của consumer.
- Định tuyến nhiều loại sự kiện/job bằng routing key.
- Cho phép lưu hàng đợi và redelivery khi consumer tạm thời lỗi.
- Có đường dead-letter cho lỗi xử lý thông báo thanh toán.
- Giữ trạng thái nghiệp vụ có thể truy vấn trong PostgreSQL.
- Có thể kích hoạt xử lý CSV theo lịch hoặc thủ công mà tái sử dụng cùng worker.

## Các phương án được xem xét

Repository không lưu biên bản đánh giá lịch sử cho toàn bộ phương án. Các ưu, nhược điểm dưới đây là phân tích kiến trúc dựa trên code hiện tại; chỉ việc chọn RabbitMQ là bằng chứng triển khai trực tiếp.

### Phương án 1: Gọi đồng bộ trong luồng nghiệp vụ

Producer gọi trực tiếp email provider, AI provider hoặc CSV processor.

Ưu điểm:

- Luồng điều khiển đơn giản, lỗi được trả ngay cho caller.
- Không cần vận hành broker hay quản lý queue.

Nhược điểm:

- Tăng latency và nguy cơ timeout của request.
- Lỗi provider có thể ảnh hưởng giao dịch chính.
- Khó điều tiết các tác vụ nặng và tái xử lý độc lập.

### Phương án 2: Chỉ dùng PostgreSQL và polling/cron

Mọi tác vụ được lưu trong bảng job; worker hoặc cron định kỳ tìm bản ghi chưa xử lý.

Ưu điểm:

- Trạng thái và yêu cầu xử lý có thể được ghi atomically trong một database transaction.
- Ít thành phần hạ tầng hơn.

Nhược điểm:

- Polling tạo độ trễ và tải truy vấn định kỳ.
- Cần tự xây dựng claim, lock, retry và phân phối công việc.
- Không thuận tiện cho fan-out sự kiện như thông báo sau thanh toán.

### Phương án 3: RabbitMQ topic exchange và consumer bất đồng bộ

Producer publish routing key; consumer đăng ký queue tương ứng. PostgreSQL vẫn giữ trạng thái nghiệp vụ.

Ưu điểm:

- Tách producer khỏi consumer và giảm thời gian chờ của luồng gọi.
- RabbitMQ cung cấp queue, routing và redelivery.
- Có thể bổ sung consumer mới theo routing key mà không đổi producer chính.

Nhược điểm:

- Phát sinh vận hành broker và mô hình eventual consistency.
- Cần thiết kế idempotency, schema thông điệp, retry và quan sát queue.
- Ghi database và publish không nằm trong cùng transaction nếu không có outbox.

Đây là phương án được triển khai.

## Quyết định

Sử dụng RabbitMQ làm transport bất đồng bộ cho domain event và background job của backend, với các quy tắc hiện tại:

1. `ticketbox.exchange` và `ticketbox.dlx` là topic exchange dùng chung.
2. `payment.success` được nhận bởi `payment.success.queue`. Queue này dead-letter lỗi sang `ticketbox.dlx` với cùng routing key.
3. `ticketbox.dlq` nhận routing key `#` từ dead-letter exchange. Notification service đọc dead letter của `payment.success`, chờ 5 giây và publish lại, dự kiến dừng sau ba lần dựa trên header `x-death`.
4. `job.ai.bio` được nhận bởi `ai.bio.queue`; worker gọi AI service và trạng thái cuối được lưu trong `BackgroundJob`.
5. `job.csv.import` được nhận bởi `csv.import.queue`; cron và admin có thể publish cùng một job đang `PENDING`.
6. Message của job chỉ mang định danh `jobId`; consumer đọc dữ liệu nghiệp vụ từ PostgreSQL.
7. PostgreSQL là nguồn dữ liệu chuẩn. Việc ACK message không thay thế trạng thái booking, ticket, notification hay background job.
8. Backend không chờ kết nối RabbitMQ trong lúc khởi động (`connectionInitOptions.wait = false`). Lựa chọn này ưu tiên khả năng khởi động, nhưng publish có thể thất bại trong thời gian broker chưa sẵn sàng.

Các worker hiện là provider trong các Nest module của cùng backend process. Quyết định này tạo tách biệt logic và thời gian xử lý qua queue, nhưng chưa chứng minh khả năng triển khai hoặc scale worker độc lập.

## Lý do

RabbitMQ phù hợp với cách dự án đã phân loại công việc bằng routing key và cần xử lý nền. Nó cho phép luồng thanh toán hoàn tất mà không đợi email, đồng thời tái sử dụng worker CSV cho lịch chạy và lệnh admin. Topic exchange cũng phù hợp khi hệ thống cần mở rộng thêm consumer.

Việc giữ PostgreSQL làm system of record tránh phụ thuộc vào message để dựng lại trạng thái nghiệp vụ. Với AI và CSV, `BackgroundJob` cung cấp trạng thái `PENDING`, `PROCESSING`, `COMPLETED` hoặc `FAILED` cho việc theo dõi.

Không có bằng chứng trong repository về benchmark giữa RabbitMQ với Kafka, cloud queue hay database polling. Vì vậy ADR này ghi nhận quyết định thể hiện trong code, không khẳng định RabbitMQ đã thắng một thử nghiệm hiệu năng chính thức.

## Hệ quả

### Tích cực

- Email, AI và CSV không cần chạy đồng bộ trong request khởi tạo.
- Producer và consumer phụ thuộc vào routing key thay vì gọi trực tiếp nhau.
- Job AI/CSV có trạng thái lâu dài trong PostgreSQL.
- Notification path có dead-letter exchange và retry ở mức consumer/provider.
- Cùng worker CSV phục vụ được cả cron và thao tác admin.
- RabbitMQ container có volume dữ liệu, healthcheck và management UI cho môi trường triển khai hiện tại.

### Tiêu cực

- Không có transactional outbox: database có thể commit nhưng publish thất bại, làm mất tín hiệu xử lý/thông báo.
- Không có inbox, event ID hoặc unique key chung để consumer chống xử lý trùng.
- Không thấy schema/version chuẩn, validation runtime hoặc correlation ID cho message.
- IN_APP và EMAIL chạy song song; nếu một channel thành công còn channel kia lỗi, redelivery có thể tạo thông báo trùng.
- AI và CSV queue chưa có dead-letter/retry policy tương đương `payment.success.queue`.
- DLQ handler chờ 5 giây ngay trong consumer, giữ handler trong thời gian delay.
- `wait: false` cho phép backend chạy khi broker lỗi nhưng không tạo cơ chế bù publish bị mất.
- Broker là thêm một thành phần phải vận hành, bảo mật và giám sát.

### Trung lập

- Dữ liệu giữa PostgreSQL và consumer là eventually consistent.
- Thứ tự xử lý toàn cục giữa các routing key không được bảo đảm.
- Worker hiện cùng vòng đời triển khai với backend dù giao tiếp qua broker.

## Các invariant cần duy trì

- PostgreSQL luôn là nguồn dữ liệu chuẩn cho trạng thái nghiệp vụ.
- Message job phải tham chiếu tới một `BackgroundJob` tồn tại; worker phải kiểm tra trạng thái trước khi xử lý.
- Consumer phải giả định message có thể được giao lại và không dựa vào exactly-once delivery.
- Routing key, exchange và queue name giữa producer/consumer phải tương thích.
- Chỉ ACK sau khi side effect và trạng thái cần thiết đã đạt trạng thái kết thúc có chủ đích.
- Lỗi không thể xử lý của notification phải được NACK để đi vào dead-letter flow.
- Message không được chứa secret; dữ liệu cá nhân chỉ nên gửi ở mức cần thiết cho consumer.

Một số invariant về idempotency và ACK mới chỉ là yêu cầu kiến trúc; code hiện tại chưa thực thi đầy đủ.

## Failure Modes

| Tình huống | Hành vi hiện tại | Ảnh hưởng | Giảm thiểu/việc cần làm |
|---|---|---|---|
| RabbitMQ chưa sẵn sàng khi backend khởi động | Backend vẫn khởi động do `wait: false` | Publish có thể lỗi | Health/readiness riêng cho broker; outbox hoặc cơ chế bù |
| PostgreSQL commit nhưng publish `payment.success` lỗi | Lỗi publish bị log và bỏ qua | Vé được phát hành nhưng không có thông báo | Transactional outbox và publisher retry |
| AI job được tạo nhưng publish lỗi | Request publish lỗi sau khi job đã `PENDING` | Job có thể nằm chờ vô hạn | Outbox hoặc sweeper phát lại job `PENDING` |
| Consumer chết sau side effect nhưng trước ACK | RabbitMQ có thể redeliver | Email, notification hoặc xử lý job bị lặp | Inbox/idempotency key và unique constraint |
| Một notification channel thành công, channel còn lại lỗi | Handler NACK toàn message | Lần retry có thể lặp channel đã thành công | Tách event theo channel hoặc idempotency theo event/channel |
| `payment.success` liên tục lỗi | Message đi DLQ và handler cố publish lại | Poison message hoặc vòng lặp retry | Xác minh retry count; parking queue và cảnh báo |
| Header `x-death` không được giữ khi publish lại | Code publish lại chỉ truyền payload | Giới hạn ba lần có thể không tăng như dự kiến | Integration test và retry header riêng |
| AI/CSV worker bắt exception rồi trả bình thường | Message được ACK sau khi lỗi được log | Không có broker retry/DLQ | Dựa rõ ràng vào trạng thái FAILED hoặc cấu hình retry/DLQ |
| Cron/admin cùng publish một CSV job | Có thể có delivery trùng/gần đồng thời | Hai worker có thể tranh xử lý cùng job | Atomic claim `PENDING -> PROCESSING` |
| Message payload thay đổi không tương thích | Không thấy runtime schema validation | Consumer lỗi hoặc dùng dữ liệu sai | Envelope có version và validation schema |
| Queue tồn đọng | Chưa thấy metric/alert trong repository | Thông báo và job trễ | Theo dõi depth, age, consumer rate và DLQ |
| PostgreSQL lỗi trong consumer | Xử lý job/notification không hoàn tất | Retry không đồng nhất giữa các queue | Chuẩn hóa ACK/NACK, backoff và retry policy |

## Thành phần bị ảnh hưởng

| Thành phần | Vai trò |
|---|---|
| `RabbitMQModule` | Khai báo kết nối, exchange và DLQ dùng chung |
| `PaymentService` | Producer `payment.success` sau thanh toán thành công |
| `NotificationService` | Consumer `payment.success`, provider retry và DLQ handler |
| `AiService` / `AiWorker` | Tạo, publish và xử lý `job.ai.bio` |
| `CsvService` / `CsvWorker` | Tạo, lập lịch, publish và xử lý `job.csv.import` |
| `AdminService` | Kích hoạt thủ công CSV job đang `PENDING` |
| PostgreSQL/Prisma | Lưu trạng thái nghiệp vụ và background job |
| RabbitMQ container | Broker, persistent volume, healthcheck và management UI |

## Bảo mật

- URI và credential của broker phải lấy từ biến môi trường hoặc secret manager; không đưa credential thật vào source hay ADR.
- File hạ tầng hiện chứa credential phát triển dạng rõ; không được tái sử dụng cho môi trường production.
- Management port cần giới hạn mạng và xác thực, không phơi công khai.
- Repository chưa cho thấy AMQPS/TLS hoặc phân quyền vhost/user theo producer và consumer; cần xác minh ở môi trường triển khai.
- `payment.success` chứa email người tham dự và dữ liệu vé/QR, nên message, log và DLQ phải được coi là dữ liệu nhạy cảm.
- Consumer hiện tin cậy cấu trúc payload và dùng kiểu `any` ở notification path; cần validation trước side effect.

## Vận hành và quan sát

Hiện có log tại producer/consumer, trạng thái `BackgroundJob`, trạng thái `Notification`, RabbitMQ healthcheck trong container và script `check-rmq.js` để kiểm tra `payment.success.queue`. Management image cho phép quan sát broker trong môi trường phù hợp.

Chưa thấy trong repository:

- metric/alert cho queue depth, oldest-message age, consumer lag và DLQ;
- tracing hoặc correlation ID xuyên producer-consumer;
- readiness check của backend phụ thuộc trạng thái publish;
- dashboard hoặc runbook xử lý poison message;
- publisher confirm/outbox monitoring;
- quy định retention và quyền truy cập DLQ.

## Chiến lược kiểm thử

Repository chưa cho thấy automated integration test chuyên biệt cho RabbitMQ; `check-rmq.js` là công cụ chẩn đoán thủ công, không thay thế test hành vi.

Cần có integration test với broker thật hoặc container để kiểm tra:

- routing của ba routing key tới đúng queue;
- publish khi broker tắt và phục hồi;
- redelivery sau consumer crash;
- dead-letter và giới hạn retry của `payment.success`;
- việc giữ/tăng `x-death` qua chu kỳ publish lại;
- idempotency khi giao cùng message nhiều lần;
- lỗi một trong hai channel IN_APP/EMAIL;
- atomic claim khi cron và admin cùng phát CSV job;
- chuyển trạng thái AI/CSV sang `FAILED` và chính sách retry;
- payload không tương thích hoặc thiếu trường bắt buộc.

## Rollback hoặc thay thế

RabbitMQ có thể được thay bằng database-backed queue/polling hoặc một managed message broker, nhưng cần giữ hợp đồng routing/payload trong giai đoạn chuyển đổi.

Trình tự thay thế an toàn:

1. Dừng tạo loại message mới hoặc triển khai dual-publish có kiểm soát.
2. Chờ/di chuyển các message còn trong queue và DLQ.
3. Chuyển consumer sang transport mới, giữ idempotency trong thời gian chạy song song.
4. Đối soát trạng thái `BackgroundJob`, notification, booking và ticket trong PostgreSQL.
5. Chỉ gỡ exchange/queue sau khi không còn producer hoặc consumer cũ.

Fallback đồng bộ chỉ phù hợp tạm thời cho tác vụ ngắn; không nên đưa AI hoặc CSV dài hạn trở lại request path.

## Tiêu chí xem xét lại

- Tỷ lệ publish lỗi hoặc message mất ảnh hưởng đến booking/notification.
- Nhu cầu bảo đảm delivery mạnh hơn yêu cầu transactional outbox/inbox.
- Queue backlog hoặc throughput vượt khả năng một backend process.
- Cần scale/deploy AI, CSV hoặc notification worker độc lập.
- Poison message hoặc duplicate side effect xảy ra đáng kể.
- Yêu cầu audit, schema governance hoặc tracing xuyên dịch vụ tăng lên.
- Broker trở thành điểm lỗi/vận hành không phù hợp và cần managed service.
- Có yêu cầu ordering, replay dài hạn hoặc event streaming mà RabbitMQ queue hiện tại không đáp ứng.

## Bằng chứng trong repository

- `src/apps/backend/src/rabbitmq/rabbitmq.module.ts`: module global, URI, topic exchanges, DLQ và `wait: false`.
- `src/apps/backend/src/app.module.ts`: đăng ký `RabbitMQModule` trong backend.
- `src/apps/backend/src/payments/payment.service.ts`: publish `payment.success` và bỏ qua lỗi publish sau khi log.
- `src/apps/backend/src/notifications/notification.service.ts`: consumer, dead-letter, retry provider và DLQ republish.
- `src/apps/backend/src/notifications/notification.module.ts`: đăng ký notification consumer/provider trong backend.
- `src/apps/backend/src/ai/ai.service.ts`: tạo `BackgroundJob`, publish và cập nhật trạng thái AI job.
- `src/apps/backend/src/ai/ai.worker.ts`: consumer `ai.bio.queue`.
- `src/apps/backend/src/ai/ai.module.ts`: worker là provider của backend module.
- `src/apps/backend/src/csv/csv.service.ts`: tạo CSV job, cron publish và phát notification cho vé khách.
- `src/apps/backend/src/csv/csv.worker.ts`: consumer `csv.import.queue`.
- `src/apps/backend/src/csv/csv.module.ts`: worker là provider của backend module.
- `src/apps/backend/src/admin/admin.service.ts`: publish thủ công CSV job.
- `src/apps/backend/check-rmq.js`: script kiểm tra kết nối/queue thủ công.
- `src/infra/rbmq.yaml`: RabbitMQ management container, port, volume và healthcheck.
- `src/apps/backend/package.json`: dependency RabbitMQ client/Nest integration.

## Cần xác minh

- Chính sách durable, prefetch, concurrency, retry và publisher confirm thực tế của thư viện/môi trường production.
- `x-death` có tăng qua cách DLQ handler tạo message mới bằng `publish` hay không; code không truyền lại header một cách tường minh.
- Queue/exchange có được cấu hình bổ sung ngoài source trong production hay không.
- AMQPS, network policy, credential rotation và quyền vhost/user ở môi trường thật.
- Có monitor/alert hoặc runbook RabbitMQ nằm ngoài repository hay không.
- Có kế hoạch triển khai worker thành process/service độc lập hay không.
- Lịch sử lựa chọn RabbitMQ so với các broker khác không được ghi trong repository.

## Tham chiếu

- `docs/adr/ADR-002-postgresql-prisma-system-of-record.md`
- `docs/adr/ADR-004-booking-consistency-redis-postgresql.md`
- `blueprint/specs/notification.md`
- `blueprint/specs/system-architecture.md`
- `blueprint/design.md`
- `openspec/changes/notification-system/design.md`
- `openspec/changes/ticketbox-system-architecture/design.md`
