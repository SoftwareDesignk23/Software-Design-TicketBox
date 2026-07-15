# ADR-005: Cache-aside Redis cho concert

- Trạng thái: Accepted
- Ngày: 2026-07-15
- Người quyết định: Nguyễn Phúc Hậu
- Phạm vi: Public concert list/detail trong `ConcertsModule`
- Liên quan: ADR-002, ADR-004, `blueprint/specs/caching.md`, `blueprint/specs/system-architecture.md`

## Bối cảnh

Danh sách concert và chi tiết concert là dữ liệu được đọc thường xuyên nhưng thay đổi ít hơn các thao tác xem trang. Hai truy vấn public hiện tải một object graph tương đối rộng gồm venue, organizer, shows, artists, sponsors, ticket types và gates. Nếu mọi request đều đọc PostgreSQL, tải đọc và thời gian phản hồi tăng theo traffic.

Repository triển khai cache-aside trong `ConcertsService` bằng Redis/ioredis. Chỉ hai read path sau được cache:

- danh sách concert `PUBLISHED`: `concerts:list:published`;
- chi tiết concert `PUBLISHED`: `concerts:detail:{id}`.

PostgreSQL qua Prisma vẫn là system of record. Redis lưu JSON đã serialize, không phải nguồn dữ liệu nghiệp vụ. `getShowSeats()` không dùng concert cache; phương thức này đọc PostgreSQL rồi chồng trạng thái khóa ghế từ Redis.

Cache miss được điều phối bằng một mutex Redis ngắn hạn để giảm thundering herd. TTL cơ sở lấy từ `CACHE_TTL`, mặc định 300 giây, và cộng jitter ngẫu nhiên 0–59 giây.

## Decision Drivers

- Giảm số lần đọc PostgreSQL cho public concert catalog.
- Giảm latency cho dữ liệu được đọc lặp lại.
- Giữ PostgreSQL làm nguồn dữ liệu chuẩn.
- Chấp nhận eventual consistency có giới hạn bằng TTL.
- Chủ động invalidation sau mutation để rút ngắn thời gian dữ liệu cũ.
- Giảm cache stampede khi nhiều request cùng miss một key.
- Dùng chung Redis đã có trong backend thay vì thêm cache service khác.
- Giữ triển khai đơn giản trong modular monolith.

## Các phương án được xem xét

Repository không lưu đầy đủ biên bản benchmark hoặc đánh giá lịch sử. Các phương án dưới đây là phân tích kiến trúc; source code là bằng chứng cho phương án được chọn.

### Phương án 1: Không cache

Mọi request danh sách/chi tiết truy vấn Prisma/PostgreSQL.

Ưu điểm:

- Luôn đọc dữ liệu mới nhất theo database transaction đã commit.
- Không có invalidation, serialization hoặc cache stampede.
- Ít hạ tầng và failure mode hơn.

Nhược điểm:

- Lặp lại truy vấn object graph lớn cho dữ liệu ít đổi.
- PostgreSQL chịu toàn bộ read traffic public.
- Latency tăng khi tải cao.

### Phương án 2: Cache-aside với TTL và invalidation

Read path kiểm tra Redis trước, tự tải PostgreSQL khi miss và ghi lại cache; write path xóa key liên quan.

Ưu điểm:

- Chỉ cache dữ liệu thực sự được đọc.
- PostgreSQL vẫn là system of record.
- Có thể bổ sung hoặc bỏ cache mà không đổi data model.
- TTL giới hạn thời gian key tồn tại nếu invalidation bị thiếu.

Nhược điểm:

- Có khoảng stale data giữa mutation/invalidation hoặc cho tới khi TTL hết.
- Mọi write path liên quan phải biết key cần xóa.
- Cache miss đồng thời cần điều phối để tránh dồn tải về database.

Đây là phương án được triển khai.

### Phương án 3: Write-through/cache materialized read model

Mọi thay đổi concert cập nhật cache/read model đồng thời hoặc qua event projection.

Ưu điểm:

- Read path đơn giản và có thể tối ưu schema riêng.
- Có thể giảm cache miss sau mutation.

Nhược điểm:

- Tăng độ phức tạp consistency và recovery.
- Cần xử lý lỗi một phía thành công, một phía thất bại.
- Chưa cần thiết với quy mô implementation quan sát được.

## Quyết định

Áp dụng cache-aside Redis cho public concert list/detail với hành vi hiện tại:

1. Đọc Redis theo cache key trước; cache hit được `JSON.parse` và trả ngay.
2. Cache miss thử lấy mutex `lock:{cacheKey}` bằng `SET NX PX 5000`.
3. Request lấy được mutex truy vấn Prisma, serialize JSON và ghi Redis bằng `EX` với TTL `CACHE_TTL + jitter`.
4. Request giữ mutex xóa lock trong `finally`.
5. Request không lấy được mutex poll cache mỗi 200 ms, tối đa 25 lần.
6. Sau khoảng 5 giây vẫn miss, request truy vấn PostgreSQL trực tiếp và không ghi cache trong nhánh fallback này.
7. Tạo concert xóa cache danh sách; cập nhật/xóa concert xóa cả danh sách và chi tiết tương ứng.
8. Mutation ticket type, show, artist assignment và gate trong `ConcertsService` xóa cache chi tiết tương ứng.
9. Không cache concert `DRAFT` hoặc concert không tồn tại; chi tiết không `PUBLISHED` trả lỗi và không negative-cache.

TTL là giới hạn stale dự phòng, không thay thế invalidation đúng. Cache key và payload phải thay đổi/version khi response shape thay đổi không tương thích.

## Lý do

Cache-aside phù hợp vì dữ liệu concert public có tỷ lệ đọc cao, PostgreSQL vẫn cần là nguồn dữ liệu chuẩn và backend đã dùng Redis cho khóa tạm thời. Cách này tránh đồng bộ cache trong cùng database transaction và cho phép tái tạo cache từ Prisma bất cứ lúc nào.

Mutex và TTL jitter giảm hai dạng stampede: nhiều request cùng miss một key, và nhiều key hết hạn cùng thời điểm. Tuy nhiên repository không có benchmark chứng minh TTL 300 giây, lock 5 giây hoặc polling 200 ms là ngưỡng tối ưu.

## Hệ quả

### Tích cực

- Cache hit không truy vấn PostgreSQL.
- Hai public endpoint dùng cùng helper và cùng quy tắc TTL/mutex.
- TTL cộng jitter giảm khả năng hết hạn đồng loạt.
- Mutex giới hạn phần lớn truy vấn DB trùng cho cùng cache key.
- Mutation concert chính xóa cache sau khi database write thành công.
- Mất cache không làm mất dữ liệu nghiệp vụ vì có thể tái tạo từ PostgreSQL.

### Tiêu cực

- Cache có thể trả dữ liệu cũ đến hết TTL nếu write path thiếu invalidation.
- Payload danh sách dùng cùng `concertResponseSelect` rộng như chi tiết, làm key danh sách lớn và phụ thuộc nhiều entity.
- Các mutation liên quan thường chỉ xóa `concerts:detail:{id}` dù cache danh sách cũng chứa shows, artists, ticket types và gates.
- `soldQuantity` thay đổi trong booking/payment/expiry nhưng không thấy invalidation concert; số lượng bán trong list/detail có thể cũ.
- AI/admin cập nhật artist không thấy xóa cache các concert chứa nghệ sĩ đó.
- Redis error và JSON parse error không có catch/fallback DB trong helper hiện tại.
- Mutex xóa bằng `DEL` không kiểm tra ownership; nếu lock hết hạn rồi được request khác lấy lại, request cũ có thể xóa lock mới.
- Không negative-cache concert không tồn tại, nên request lặp vẫn truy vấn database.
- Mỗi application shutdown gọi `FLUSHALL`, xóa toàn bộ Redis gồm cả cache và các khóa booking/ghế dùng chung.

### Trung lập

- Dữ liệu cache là eventually consistent và object thời gian được serialize thành chuỗi JSON.
- Nhánh chờ mutex quá thời gian ưu tiên trả kết quả từ database hơn là tiếp tục chờ cache.
- Redis đang phục vụ cả cache và distributed lock; vòng đời một loại key có thể ảnh hưởng loại còn lại nếu dùng lệnh toàn cục.

## Các invariant cần duy trì

- PostgreSQL là nguồn dữ liệu chuẩn; Redis cache luôn có thể bị xóa và tái tạo.
- Chỉ concert `PUBLISHED` được đưa vào hai public cache key.
- Cache key phải phản ánh đầy đủ scope/filter và version của response.
- TTL phải luôn hữu hạn và là số giây hợp lệ.
- Database write phải commit trước khi xóa cache liên quan.
- Mọi mutation của trường xuất hiện trong cached payload phải invalidation tất cả key chứa trường đó.
- Cache failure không được làm ghi sai dữ liệu PostgreSQL.
- Mutex phải có TTL và chỉ owner được giải phóng lock của mình.
- Không dùng `FLUSHALL` trong lifecycle của một instance nếu Redis dùng chung hoặc chứa lock nghiệp vụ.
- Không lưu secret hoặc dữ liệu nhạy cảm không cần thiết trong cached concert payload.

Một số invariant chưa được code thực thi đầy đủ: ownership của cache mutex, invalidation mọi dependency và cô lập lifecycle cache khỏi booking lock.

## Failure Modes

| Tình huống | Hành vi hiện tại | Ảnh hưởng | Giảm thiểu/việc cần làm |
|---|---|---|---|
| Redis không truy cập được | Lệnh `get/set/del` không được catch trong helper | Public concert request có thể lỗi/chờ reconnect dù DB còn hoạt động | Timeout ngắn và fallback Prisma có kiểm soát |
| Cache JSON hỏng/không tương thích | `JSON.parse` ném lỗi | Request thất bại | Bắt lỗi, xóa key và tải lại DB; version key |
| Nhiều request cùng cache miss | Một request lấy mutex, request khác poll | Giảm stampede trong tối đa 5 giây | Theo dõi lock contention và DB fallback rate |
| DB query lâu hơn TTL mutex | Lock hết hạn trước khi request đầu hoàn tất | Request khác có thể cùng query DB | Chọn TTL theo p99 hoặc gia hạn lock an toàn |
| Request cũ `DEL` lock mới | Lock không có token ownership | Mất mutex của request khác | Random token và Lua compare-and-delete |
| Request chờ hết 5 giây vẫn miss | Query DB trực tiếp, không ghi cache | Nhiều fallback có thể dồn tải DB | Backoff/jitter và single-flight chặt hơn |
| Mutation concert chính | Xóa list/detail sau write | Lần đọc sau tái tạo cache | Giữ invalidation sau commit |
| Mutation ticket/show/artist/gate | Chỉ detail key thường bị xóa | List cache vẫn chứa dữ liệu cũ | Xóa cả list hoặc tách list payload tối giản |
| Booking tăng/giảm `soldQuantity` | Không thấy xóa list/detail cache | Availability hiển thị cũ đến hết TTL | Không cache số động hoặc phát invalidation event |
| Artist bio/avatar đổi ở module khác | Không thấy truy ngược/xóa concert cache | Artist data trong concert cũ | Dependency-based invalidation hoặc cache version/tag |
| Concert không tồn tại bị request lặp | Không negative-cache exception | DB bị đọc lặp | Negative cache TTL ngắn nếu cần |
| `CACHE_TTL` không hợp lệ | `parseInt` có thể tạo `NaN` | Lệnh Redis `EX` lỗi | Validate config lúc startup |
| Backend shutdown | `RedisService.onModuleDestroy()` gọi `FLUSHALL` | Toàn bộ cache và distributed lock bị xóa | Chỉ disconnect; không flush shared Redis |
| Nhiều backend instance | Một instance shutdown vẫn flush Redis dùng chung | Cache stampede và mất khóa trên toàn cụm | Loại bỏ `FLUSHALL`, namespace key và ACL |

## Thành phần bị ảnh hưởng

| Thành phần | Vai trò |
|---|---|
| `ConcertsService` | Cache-aside helper, query và invalidation concert |
| `ConcertsModule` | Đăng ký Prisma/Auth/Redis dependency |
| `RedisService` | Kết nối ioredis và lifecycle dùng chung |
| Prisma/PostgreSQL | Nguồn dữ liệu chuẩn và cache refill |
| Booking/Payment/Cron | Thay đổi `soldQuantity` hiện ảnh hưởng payload cache |
| AI/Admin artist flow | Thay đổi artist được embed trong concert payload |
| Public web client | Consumer danh sách/chi tiết có thể nhận dữ liệu cache |
| Redis container | Persistence, authentication và healthcheck môi trường local/container |

## Bảo mật

- `REDIS_URL` phải lấy từ secret manager/biến môi trường; không ghi credential production trong repository hoặc ADR.
- File hạ tầng hiện chứa password phát triển dạng rõ và publish cổng Redis; không được dùng nguyên trạng cho production.
- Redis production cần network isolation, authentication/ACL và TLS nếu đi qua mạng không tin cậy.
- Concert cache hiện là dữ liệu public đã chọn trường; không được mở rộng select sang secret hoặc dữ liệu cá nhân mà không review.
- Không cho client truy cập trực tiếp Redis.
- Lệnh quản trị rộng như `FLUSHALL` phải bị hạn chế bằng ACL và không nằm trong lifecycle application.
- Key namespace nên phân biệt môi trường/ứng dụng để tránh collision hoặc xóa chéo.

## Vận hành và quan sát

Hiện có log kết nối/lỗi Redis và một log khi list cache miss truy vấn database. Redis container có persistence AOF, volume và healthcheck. TTL tự hết hạn giúp cache không tồn tại vô hạn.

Chưa thấy trong repository:

- metric cache hit/miss, latency, key size và DB fallback;
- metric mutex contention, polling timeout hoặc stale age;
- alert Redis memory/eviction/reconnect/error;
- tracing từ API request qua Redis tới Prisma;
- cache key versioning hoặc invalidation event audit;
- readiness policy phân biệt Redis cache lỗi với Redis lock lỗi;
- memory policy/maxmemory được cấu hình trong file hạ tầng;
- runbook warm-up, eviction hoặc cache stampede.

## Chiến lược kiểm thử

Không tìm thấy automated test chuyên biệt cho concert cache trong các đường dẫn đã rà soát. Không chạy test trong quá trình lập ADR.

Cần bổ sung:

- cache hit không gọi Prisma;
- cache miss ghi đúng JSON với TTL trong khoảng base đến base + 59;
- chỉ concert `PUBLISHED` được cache;
- nhiều request cùng miss chỉ có một refill trong điều kiện bình thường;
- polling timeout fallback về Prisma;
- Redis down và corrupt JSON fallback đúng;
- mutation concert xóa list/detail đúng;
- mutation ticket type/show/artist/gate xóa mọi key có chứa dữ liệu đó;
- booking/payment/expiry làm mới `soldQuantity` trong cache;
- lock hết hạn/reacquire không bị owner cũ xóa;
- nhiều backend instance shutdown không xóa cache/lock dùng chung;
- thay đổi response shape dùng key version mới hoặc xử lý cache cũ.

## Rollback hoặc thay thế

Cache-aside có thể tắt bằng cách bỏ read/write Redis ở hai endpoint và luôn gọi Prisma; không cần migration dữ liệu vì cache không phải system of record. Trước rollback, phải bảo đảm thay đổi không ảnh hưởng Redis seat/booking lock là quyết định riêng trong ADR-004.

Nếu thay Redis hoặc đổi key:

1. Triển khai read hỗ trợ key cũ/mới hoặc chấp nhận cold cache.
2. Ghi key mới với TTL hữu hạn.
3. Theo dõi hit rate và DB load.
4. Ngừng đọc key cũ rồi để TTL tự dọn hoặc xóa theo namespace.
5. Không dùng `FLUSHALL` vì Redis chứa key ngoài concert cache.

## Tiêu chí xem xét lại

- Cache hit rate thấp hoặc payload list quá lớn so với lợi ích.
- Stale `soldQuantity`, artist, show hoặc gate gây lỗi trải nghiệm/nghiệp vụ đáng kể.
- PostgreSQL/read replica đáp ứng tải mà không cần Redis cache.
- Traffic yêu cầu CDN/edge cache cho catalog public.
- Số backend instance tăng và mutex/invalidation hiện tại không còn an toàn.
- Redis cache cạnh tranh memory/availability với booking lock.
- Cần read model/search index riêng cho catalog.
- Cache stampede hoặc Redis outage thường xuyên làm API mất khả dụng.
- Response contract cần versioning rõ cho nhiều client.

## Bằng chứng trong repository

- `src/apps/backend/src/concerts/concerts.service.ts`: key, TTL, jitter, mutex, polling, Prisma fallback và invalidation.
- `src/apps/backend/src/concerts/concerts.module.ts`: dependency Redis/Prisma của concert module.
- `src/apps/backend/src/redis/redis.service.ts`: ioredis connection, error log và `FLUSHALL` khi shutdown.
- `src/apps/backend/src/redis/redis.module.ts`: Redis service global dùng chung.
- `src/apps/backend/src/bookings/booking.service.ts`: cập nhật `TicketType.soldQuantity` và dùng Redis lock.
- `src/apps/backend/src/bookings/booking.cron.ts`: hoàn `soldQuantity` khi booking hết hạn.
- `src/apps/backend/src/payments/payment.service.ts`: hoàn `soldQuantity` khi thanh toán thất bại.
- `src/apps/backend/src/ai/ai.service.ts`: tạo/cập nhật artist được embed trong concert payload.
- `src/apps/backend/src/admin/admin.service.ts`: cập nhật artist không có concert cache invalidation quan sát được.
- `src/infra/redis.yaml`: Redis container, AOF, volume, credential phát triển và healthcheck.
- `src/apps/backend/package.json`: dependency `ioredis`.
- `blueprint/specs/caching.md`: đặc tả cache-aside hiện tại.
- `blueprint/specs/system-architecture.md`: vai trò Redis cache/lock trong hệ thống.

## Cần xác minh

- TTL 300 giây, mutex 5 giây và polling 200 ms có dựa trên benchmark production hay không.
- Redis production có replica/Sentinel/managed service, TLS, ACL và maxmemory policy hay không.
- Có monitoring cache/Redis nằm ngoài repository hay không.
- `FLUSHALL` khi shutdown có chủ ý chỉ cho môi trường đơn instance hay là lỗi chưa xử lý.
- Mức stale data được sản phẩm chấp nhận cho `soldQuantity` và artist metadata.
- Có write path concert liên quan nằm ngoài backend repository và cần invalidation hay không.
- Có kế hoạch tách list payload khỏi detail payload để giảm dependency invalidation hay không.
- Lịch sử đánh giá Redis so với in-process cache, CDN hoặc database read replica không được lưu trong repository.

## Tham chiếu

- `docs/adr/ADR-002-postgresql-prisma-system-of-record.md`
- `docs/adr/ADR-004-booking-consistency-redis-postgresql.md`
- `blueprint/specs/caching.md`
- `blueprint/specs/system-architecture.md`
- `blueprint/design.md`
