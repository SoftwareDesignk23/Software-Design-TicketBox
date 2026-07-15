# ADR-008: Abstraction cho payment provider

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Nguyễn Phúc Hậu
- Phạm vi: `PaymentModule` và các tích hợp cổng thanh toán
- Liên quan: ADR-002, ADR-004, `blueprint/specs/payment.md`, `openspec/changes/payment-processing-system/design.md`

## Bối cảnh

TicketBox cần tạo yêu cầu thanh toán qua nhiều nhà cung cấp có giao thức, chữ ký, URL và callback khác nhau. Nếu `PaymentService` chứa toàn bộ chi tiết từng cổng, logic booking và chuyển trạng thái thanh toán sẽ bị gắn chặt với SDK/giao thức bên ngoài, khó thay thế hoặc bổ sung provider.

Repository hiện có `IPaymentProvider` với hai thao tác chung:

- `createPaymentUrl(params)` trả về `paymentUrl`;
- `verifyWebhook(payload)` xác minh payload callback.

`VNPayProvider` và `MoMoProvider` cùng implement interface này. `PaymentService.getProvider()` chọn adapter theo enum Prisma `PaymentProvider`, hiện gồm `VNPAY` và `MOMO`. Phần tạo payment sử dụng interface, nhưng phần nhận callback và quyết toán mới chỉ có endpoint VNPAY và gọi trực tiếp `VNPayProvider`.

Mức độ hoàn thiện của hai adapter không tương đương:

- VNPAY tạo URL có chữ ký HMAC SHA-512 và xác minh chữ ký callback. `PaymentService` tiếp tục kiểm tra payment ID, provider, số tiền và trạng thái trước khi cập nhật booking/ticket.
- MoMo gọi test endpoint nhưng gửi cấu trúc nội bộ chưa phải request MoMo hoàn chỉnh, có thể trả mock URL khi request lỗi, và `verifyWebhook()` luôn trả `true`. Không có endpoint callback MoMo trong `PaymentController`.

Vì vậy quyết định này ghi nhận abstraction đang tồn tại và ranh giới dự kiến của nó, không khẳng định cả hai provider đã sẵn sàng cho production.

## Decision Drivers

- Cô lập chữ ký, URL, timeout và giao thức riêng của từng nhà cung cấp.
- Giữ luồng tạo `Payment` và kiểm tra booking nhất quán giữa các provider.
- Cho phép thêm hoặc thay provider mà giảm thay đổi trong nghiệp vụ booking.
- Chuẩn hóa tối thiểu input tạo thanh toán và output URL chuyển hướng.
- Có vị trí riêng để áp dụng timeout, retry và circuit breaker theo provider.
- Dùng enum và trạng thái thanh toán nội bộ trong PostgreSQL làm mô hình chuẩn.
- Tránh để client quyết định trạng thái thanh toán cuối cùng.

## Các phương án được xem xét

Repository không lưu đầy đủ biên bản so sánh lịch sử. Các phương án dưới đây là phân tích kiến trúc; code là bằng chứng trực tiếp cho phương án được chọn.

### Phương án 1: Tích hợp trực tiếp trong `PaymentService`

Mỗi nhánh provider tự tạo request, ký/xác minh callback và cập nhật booking ngay trong service.

Ưu điểm:

- Ít class và interface hơn khi chỉ có một provider.
- Dễ theo dõi luồng nhỏ trong một file.

Nhược điểm:

- Trộn logic nhà cung cấp với state transition của booking/ticket.
- Service tăng nhanh theo số provider.
- Khó kiểm thử và cấu hình resilience độc lập.

### Phương án 2: Adapter chung qua `IPaymentProvider`

Mỗi provider implement một hợp đồng chung; payment service chọn adapter theo provider nội bộ.

Ưu điểm:

- Cô lập chi tiết giao thức và chữ ký.
- Luồng tạo payment dùng cùng input/output.
- Có thể unit test adapter riêng và thay implementation.

Nhược điểm:

- Hợp đồng chung có thể quá nhỏ hoặc ép các provider khác nhau vào cùng mô hình.
- Việc thêm provider vẫn cần cập nhật enum, đăng ký DI và selector.
- Callback chỉ thực sự độc lập nếu cả verification, normalization và settlement đều đi qua abstraction.

Đây là phương án được triển khai một phần.

### Phương án 3: Một payment orchestration service/gateway bên ngoài

TicketBox gọi một dịch vụ thanh toán riêng hoặc payment aggregator để chuẩn hóa toàn bộ provider.

Ưu điểm:

- Tách vòng đời thanh toán, webhook và reconciliation khỏi backend chính.
- Có thể chuẩn hóa observability, audit và compliance tập trung.

Nhược điểm:

- Tăng thành phần triển khai và giao tiếp phân tán.
- Không cần thiết với quy mô implementation hiện tại.
- Có thêm chi phí hoặc phụ thuộc vendor aggregator.

## Quyết định

Áp dụng Adapter/Strategy abstraction cho cổng thanh toán trong `PaymentModule`:

1. Provider-specific code nằm trong `payments/providers` và implement `IPaymentProvider`.
2. `PaymentService` chịu trách nhiệm nghiệp vụ nội bộ: xác thực booking/user, tạo `Payment`, chọn provider và điều phối state transition.
3. Adapter chịu trách nhiệm tạo yêu cầu/URL thanh toán và xác minh dữ liệu callback theo quy tắc riêng của provider.
4. `PaymentProvider` trong Prisma là danh sách provider được phép; `Payment` và PostgreSQL là nguồn dữ liệu chuẩn cho trạng thái nội bộ.
5. Kết quả tạo thanh toán được chuẩn hóa tối thiểu thành `{ paymentUrl }`.
6. Provider phải được đăng ký trong Nest `PaymentModule` và selector của `PaymentService`.
7. Callback chỉ được phép cập nhật trạng thái sau khi xác minh tính xác thực, đối chiếu payment/reference, provider, số tiền và trạng thái hiện tại.

Trong code hiện tại, mục 7 được triển khai riêng cho VNPAY trong `handleVnPayWebhook`; abstraction chưa bao phủ callback normalization hoặc settlement chung. MoMo chỉ là implementation thử nghiệm và không được xem là tích hợp production hoàn chỉnh.

## Lý do

Hai provider có khác biệt lớn về cách tạo request và xác minh chữ ký, trong khi TicketBox vẫn cần dùng chung các trạng thái `PENDING`, `SUCCESS`, `FAILED` và cùng quy tắc booking. Adapter giữ khác biệt ở rìa hệ thống và cho phép phần nghiệp vụ dùng một API tạo payment thống nhất.

Interface hiện tại đủ cho luồng tạo URL đang có, nhưng chưa đủ để hiện thực mục tiêu thay thế provider hoàn toàn. Repository chưa có bằng chứng rằng các phương thức query status, refund, normalized callback result hoặc reconciliation đã được thiết kế/triển khai.

## Hệ quả

### Tích cực

- Chi tiết ký URL VNPAY và gọi API MoMo không nằm trực tiếp trong `PaymentService`.
- Provider dùng chung input gồm payment ID, amount, currency và return URL.
- Caller nhận cùng cấu trúc `paymentUrl`.
- Timeout/circuit breaker có thể cấu hình trong từng adapter.
- Enum Prisma ngăn giá trị provider tùy ý đi vào database/API.

### Tiêu cực

- `PaymentService` inject concrete providers và dùng chuỗi `if`; thêm provider vẫn phải sửa service.
- Interface chỉ chuẩn hóa tạo URL và boolean verify, chưa chuẩn hóa callback data/status/reference.
- Webhook VNPAY bypass selector và phụ thuộc trực tiếp vào `VNPayProvider`.
- Không có webhook/settlement MoMo; `verifyWebhook()` MoMo luôn thành công nên không an toàn để sử dụng.
- MoMo có thể trả mock URL sau lỗi mạng, làm kết quả tạo payment không phản ánh gateway thật.
- Cấu hình VNPAY được đọc đồng bộ từ file JSON thay vì abstraction cấu hình/secret chuẩn hóa.
- `paymentWebhookSchema` và hàm `processPaymentSuccess()` hiện không được dùng.
- Không thấy cơ chế request idempotency; gọi tạo payment lặp có thể sinh nhiều payment `PENDING` cho cùng booking.
- Payment record được tạo trước khi adapter tạo URL; nếu provider lỗi, record có thể còn `PENDING` mà không có URL sử dụng được.

### Trung lập

- Provider-specific callback endpoint vẫn có thể tồn tại, miễn kết quả được chuẩn hóa trước state transition.
- Việc thêm provider yêu cầu migration enum Prisma cùng thay đổi backend và client.
- Circuit breaker của VNPAY hiện kiểm tra một HTTP endpoint trước khi trả URL được ký cục bộ; nó không bao bọc một giao dịch thanh toán từ xa.

## Các invariant cần duy trì

- Chỉ provider có trong enum `PaymentProvider` mới được tạo payment.
- Amount và currency truyền cho adapter phải lấy từ booking/payment phía server, không tin giá trị từ client.
- Callback không được cập nhật dữ liệu trước khi xác minh chữ ký/tính xác thực và đối chiếu payment.
- Provider, payment reference, amount và trạng thái hiện tại phải khớp trước settlement.
- Một payment đã rời `PENDING` không được xử lý settlement lần thứ hai.
- Booking/ticket state transition phải nằm trong Prisma transaction.
- Provider secret không được trả về client, ghi log hoặc lưu trong ADR.
- Adapter không được biến lỗi gateway thành kết quả thành công giả ở môi trường production.
- Mọi implementation của `verifyWebhook()` phải fail closed khi payload không hợp lệ.

Một số invariant mới được đảm bảo cho VNPAY; adapter MoMo hiện vi phạm yêu cầu fail closed.

## Failure Modes

| Tình huống | Hành vi hiện tại | Ảnh hưởng | Giảm thiểu/việc cần làm |
|---|---|---|---|
| Provider không được hỗ trợ | DTO enum từ chối hoặc selector ném lỗi | Không tạo được payment | Trả lỗi domain rõ ràng và đồng bộ enum/client |
| Adapter lỗi sau khi `Payment` đã được tạo | Request thất bại, payment có thể vẫn `PENDING` | Payment attempt mồ côi | Transaction/outbox workflow hoặc đánh dấu attempt `FAILED` |
| Client gọi tạo payment nhiều lần | Có thể tạo nhiều bản ghi `PENDING` | Nhiều URL/attempt cho một booking | Idempotency key và ràng buộc active attempt |
| Chữ ký VNPAY sai | Trả `RspCode 97` | Không cập nhật booking/payment | Giữ fail closed và audit callback |
| VNPAY callback sai amount | Trả `RspCode 04` | Không settlement | Alert/audit mismatch và reconciliation |
| Callback VNPAY lặp sau settlement | Trả `RspCode 02` | Không cập nhật lại | Duy trì atomic conditional transition |
| Callback đồng thời cùng thấy `PENDING` | Check nằm trước transaction và update không conditional | Có nguy cơ xử lý hai lần | Atomic compare-and-set hoặc idempotency event |
| MoMo request lỗi | Có thể trả mock payment URL | Client nhận URL không chứng minh giao dịch thật | Loại bỏ fallback giả ở production |
| Callback MoMo giả mạo | `verifyWebhook()` trả `true`, nhưng chưa có route sử dụng | Rủi ro nghiêm trọng nếu endpoint được thêm nguyên trạng | Triển khai signature validation trước khi mở webhook |
| Circuit breaker mở | Adapter ném gateway-down exception | Không tạo được URL; payment có thể đã tồn tại | Đánh dấu attempt và trả lỗi có thể retry |
| Cấu hình VNPAY thiếu/sai | Adapter ném config-missing hoặc verify false | Checkout/callback không hoạt động | Typed config validation và secret management |
| Provider đổi payload/API | Interface không validation response/callback chuẩn hóa | Runtime error hoặc state sai | Contract test, schema validation và versioning |
| Callback hợp lệ nhưng RabbitMQ publish notification lỗi | Settlement vẫn commit và lỗi publish bị bỏ qua | Vé có thể không được thông báo | Transactional outbox; xem ADR-007 |

## Thành phần bị ảnh hưởng

| Thành phần | Vai trò |
|---|---|
| `IPaymentProvider` | Hợp đồng tạo URL và xác minh webhook |
| `VNPayProvider` | Ký URL, xác minh chữ ký VNPAY và circuit breaker health check |
| `MoMoProvider` | Adapter MoMo thử nghiệm, retry/circuit breaker và mock fallback |
| `PaymentService` | Chọn adapter, tạo payment và xử lý settlement VNPAY |
| `PaymentController` | API tạo payment và endpoint IPN VNPAY |
| `PaymentModule` | Đăng ký service và concrete providers vào Nest DI |
| Prisma `PaymentProvider`/`Payment` | Provider và trạng thái thanh toán nội bộ |
| Booking/Ticket/Seat | Nhận state transition khi settlement thành công/thất bại |
| RabbitMQ notification flow | Nhận `payment.success` sau phát hành vé |

## Bảo mật

- Merchant code, hash secret và credential provider phải đến từ secret manager/biến môi trường có validation; không nên lưu credential production trong JSON của repository.
- VNPAY callback hiện xác minh HMAC SHA-512 trước khi đọc settlement; quy tắc này phải giữ nguyên khi refactor abstraction.
- MoMo verification hiện chưa được triển khai và không được phép đưa vào production dưới dạng `return true`.
- Callback là endpoint công khai nên cần giới hạn payload, validation schema, audit log an toàn và rate limiting phù hợp.
- Không log secret, chữ ký đầy đủ, thông tin định danh hoặc raw payment payload không được lọc.
- Return URL do client gửi phải được allowlist để tránh open redirect/phishing; DTO hiện chỉ kiểm tra định dạng URL.
- `vnp_IpAddr` hiện được gán loopback cố định, không phản ánh địa chỉ thực và cần xác minh yêu cầu chống gian lận của provider.
- Repository chưa cho thấy mã hóa/retention policy cho `rawPayload` hoặc `providerRef`; hai trường hiện chưa được sử dụng trong flow quan sát được.

## Vận hành và quan sát

Hiện adapter có log trạng thái circuit breaker và lỗi gọi provider. PostgreSQL lưu `Payment.status`, amount, provider và timestamps. VNPAY callback trả response code theo nhánh lỗi.

Chưa thấy trong repository:

- metric theo provider về latency, error rate, circuit state và conversion;
- correlation ID giữa payment, request tạo URL và callback;
- audit trail callback đã xác minh;
- job reconciliation/query provider cho payment `PENDING` lâu;
- alert cho amount mismatch, signature failure hoặc orphan payment;
- typed configuration validation và startup health check cho từng provider.

## Chiến lược kiểm thử

Không tìm thấy automated test chuyên biệt cho payment provider abstraction trong các đường dẫn đã rà soát. Không chạy test trong quá trình lập ADR.

Cần bổ sung:

- contract test mọi adapter với cùng input/output cơ bản;
- fixture test chữ ký URL và webhook VNPAY hợp lệ/không hợp lệ;
- test amount, provider, reference và duplicate callback;
- concurrency test hai callback cho cùng payment;
- test provider timeout, circuit open/half-open/close và failure cleanup;
- test tạo payment lặp với idempotency key;
- test cấu hình thiếu mà không làm lộ secret;
- MoMo signed request/response và callback verification test trước khi kích hoạt;
- integration test chứng minh settlement chỉ tạo vé một lần.

## Rollback hoặc thay thế

Có thể thay một adapter mà không đổi API tạo payment nếu implementation mới giữ `IPaymentProvider`. Với thay đổi callback, nên triển khai adapter normalization mới song song endpoint cũ, chạy contract test rồi chuyển route.

Nếu loại bỏ một provider:

1. Ngừng cho client tạo payment mới với provider đó.
2. Tiếp tục nhận callback/reconcile các payment `PENDING` cũ.
3. Đối soát payment và booking trước khi gỡ endpoint/credential.
4. Xóa selector/DI registration và chỉ migration enum khi không còn bản ghi phụ thuộc.

Nếu thay abstraction, dữ liệu `Payment` và state transition trong PostgreSQL phải được giữ nguyên; không được coi việc đổi adapter là lý do xử lý lại settlement đã hoàn tất.

## Tiêu chí xem xét lại

- Thêm provider thứ ba hoặc cần chọn provider theo cấu hình động.
- Cần refund, query transaction, capture/cancel hoặc reconciliation chung.
- Callback VNPAY/MoMo cần dùng chung pipeline settlement.
- Số lượng payment mồ côi, callback trùng hoặc mismatch tăng.
- Cần tách payment thành service độc lập vì compliance hoặc tải.
- Interface boolean `verifyWebhook()` không đủ biểu diễn normalized status/reference/error.
- Cần managed payment aggregator thay vì tự duy trì adapter.
- Yêu cầu production buộc secret rotation, audit và provider certification chặt hơn.

## Bằng chứng trong repository

- `src/apps/backend/src/payments/providers/payment.provider.interface.ts`: interface và input/output chung hiện tại.
- `src/apps/backend/src/payments/providers/vnpay.provider.ts`: ký URL, xác minh HMAC và circuit breaker VNPAY.
- `src/apps/backend/src/payments/providers/momo.provider.ts`: request test, retry, circuit breaker, mock URL và webhook verification placeholder.
- `src/apps/backend/src/payments/payment.service.ts`: selector, tạo payment qua interface và settlement hard-code VNPAY.
- `src/apps/backend/src/payments/payment.controller.ts`: API tạo payment và duy nhất endpoint IPN VNPAY.
- `src/apps/backend/src/payments/payment.dto.ts`: validation provider bằng enum Prisma và webhook schema chưa được dùng.
- `src/apps/backend/src/payments/payment.module.ts`: đăng ký hai concrete adapter.
- `src/apps/backend/prisma/schema.prisma`: enum `VNPAY`/`MOMO`, `Payment`, status, `providerRef` và `rawPayload`.
- `blueprint/specs/payment.md`: mô tả chức năng payment hiện tại.
- `openspec/changes/payment-processing-system/design.md`: thiết kế mục tiêu cho provider adapter và normalized state.
- `openspec/changes/payment-processing-system/tasks.md`: nhiều hạng mục payment vẫn được đánh dấu chưa hoàn thành.

## Cần xác minh

- Credential/config production có được inject ngoài file JSON hay không.
- VNPAY IPN hiện dùng GET có đúng hợp đồng triển khai thực tế và cấu hình merchant hay không.
- MoMo có được dự định chỉ demo hay sẽ được hoàn thiện cho production.
- Có idempotency/reconciliation ở gateway, reverse proxy hoặc hệ thống ngoài repository hay không.
- Circuit breaker health-check VNPAY có phản ánh đúng khả năng tạo giao dịch hay chỉ kiểm tra endpoint.
- Chính sách xử lý payment `PENDING` khi provider URL creation lỗi hoặc booking hết hạn.
- `providerRef` và `rawPayload` có kế hoạch được ghi ở callback hay không.
- Có dashboard, alert hoặc đối soát tài chính nằm ngoài repository hay không.
- Lịch sử đánh giá adapter so với payment aggregator không được ghi nhận trong repository.

## Tham chiếu

- `docs/adr/ADR-002-postgresql-prisma-system-of-record.md`
- `docs/adr/ADR-004-booking-consistency-redis-postgresql.md`
- `docs/adr/ADR-007-rabbitmq-asynchronous-communication.md`
- `blueprint/specs/payment.md`
- `blueprint/design.md`
- `openspec/changes/payment-processing-system/proposal.md`
- `openspec/changes/payment-processing-system/design.md`
- `openspec/changes/payment-processing-system/specs/vnpay-payment-integration/spec.md`
- `openspec/changes/payment-processing-system/specs/payment-resilience-and-timeouts/spec.md`
