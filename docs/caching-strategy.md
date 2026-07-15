# Thiết kế Caching

**Ngày đối chiếu:** 15/07/2026  
**Phạm vi:** Redis cache và Redis key liên quan  
**Mục tiêu:** Đối chiếu cache key, TTL, cache-aside và invalidation

## 1. Chiến lược hiện tại

Hệ thống dùng cache-aside cho:

- Danh sách concert PUBLISHED.
- Chi tiết concert PUBLISHED.

PostgreSQL là system of record; Redis giữ JSON có thể tái tạo.

Luồng:

1. Đọc key Redis.
2. Hit: parse JSON và trả ngay.
3. Miss: thử lấy mutex bằng SET NX.
4. Request giữ mutex query PostgreSQL và ghi cache.
5. Request còn lại poll 25 lần, cách 200 ms.
6. Sau tối đa 5 giây vẫn miss thì query PostgreSQL trực tiếp.

## 2. Cache key và TTL

| Key pattern | Nội dung | TTL cơ sở | TTL thực tế |
|---|---|---:|---:|
| **concerts:list:published** | Danh sách concert published | CACHE_TTL, mặc định 300 giây | 300–359 giây mặc định |
| **concerts:detail:{concertId}** | Chi tiết concert published | CACHE_TTL, mặc định 300 giây | 300–359 giây mặc định |

TTL thực tế bằng **parseInt(CACHE_TTL hoặc 300) + random(0..59) giây**. Jitter giảm khả năng nhiều key hết hạn cùng lúc.

## 3. Mutex chống Thundering Herd

| Key pattern | Mục đích | TTL | Cơ chế |
|---|---|---:|---|
| **lock:concerts:list:published** | Một request rebuild list | 5 giây | SET NX PX |
| **lock:concerts:detail:{concertId}** | Một request rebuild detail | 5 giây | SET NX PX |

Request giữ mutex xóa lock trong finally. Request không giữ lock poll cache rồi fallback DB.

## 4. Redis key không phải cache dữ liệu

| Key pattern | Mục đích | TTL |
|---|---|---:|
| **seat_lock:{showSeatId}** | Giữ ghế theo user | 900.000 ms, 15 phút |
| **lock:show:{showId}:booking** | Mutex tạo booking theo show | 5.000 ms |

Booking có expiresAt 15 phút trong PostgreSQL; đây không phải Redis cache TTL.

## 5. Invalidation hiện tại

| Mutation | List cache | Detail cache |
|---|:---:|:---:|
| Tạo concert | Xóa | Không có detail cũ |
| Cập nhật concert | Xóa | Xóa |
| Xóa concert | Xóa | Xóa |
| Tạo/cập nhật/xóa ticket type | Không xóa | Xóa |
| Tạo show | Không xóa | Xóa |
| Gán/gỡ artist | Không xóa | Xóa |
| Cập nhật gate | Không xóa | Xóa |
| Tạo booking/payment thành công | Không xóa | Không xóa |

List response chứa show, artist, ticket type và gate, nên list cache có thể stale khi các mutation trên chỉ xóa detail.

## 6. Tính nhất quán số lượng vé

Concert cache chứa totalQuantity, soldQuantity và maxPerOrder. BookingService tăng soldQuantity khi giữ booking nhưng không invalidation concert cache. Số lượng vé có thể cũ tới khi TTL 300–359 giây hết hoặc mutation khác xóa key.

API getShowSeats(showId) không dùng concert cache. API đọc ShowSeat từ PostgreSQL và ghép seat_lock từ Redis nên trạng thái ghế chi tiết mới hơn.

## 7. Failure Behavior

| Tình huống | Hành vi |
|---|---|
| Miss, lấy được mutex | Query DB, ghi cache |
| Miss, mutex đang giữ | Poll tối đa 5 giây |
| Poll vẫn miss | Query DB trực tiếp |
| Redis command lỗi | Lỗi propagate; chưa có fallback tổng quát |
| JSON cache hỏng | JSON.parse ném lỗi; chưa tự xóa key và retry |

## 8. Điểm cần lưu ý

1. RedisService.onModuleDestroy() gọi flushall(), xóa toàn bộ cache và lock trong Redis database.
2. Invalidation thủ công dễ bỏ sót key.
3. List cache chứa dữ liệu lồng sâu nhưng nhiều mutation chỉ xóa detail.
4. Booking không invalidation soldQuantity.
5. Không có stale-while-revalidate hoặc stale-if-error.
6. Key không có namespace môi trường.
7. Mutex DEL không kiểm tra owner; request cũ có thể xóa lock mới sau khi TTL hết.

## 9. Khuyến nghị

### Ưu tiên cao

- Bỏ flushall() khi shutdown, chỉ disconnect.
- Invalidate list và detail khi payload list thay đổi.
- Invalidate sau inventory mutation hoặc tách availability khỏi metadata.
- Thêm namespace môi trường vào key.

### Ưu tiên trung bình

- Dùng owner token và Lua compare-and-delete cho mutex.
- Catch lỗi Redis và fallback Prisma cho read path.
- Xóa key JSON hỏng rồi query DB.
- Ghi metric hit, miss, rebuild, wait và fallback.

## 10. Tiêu chí kiểm tra

- Lần đầu miss: có Prisma query và tạo Redis key.
- Lần sau hit: không query Prisma.
- TTL nằm trong CACHE_TTL đến CACHE_TTL + 59.
- Nhiều miss cùng key: một request rebuild.
- Update concert: list và detail bị xóa.
- Booking đổi soldQuantity: cache hiện có thể giữ số cũ.

## 11. Code đối chiếu

- src/apps/backend/src/concerts/concerts.service.ts
- src/apps/backend/src/redis/redis.service.ts
- src/apps/backend/src/bookings/booking.service.ts
- src/apps/backend/src/app.module.ts
- blueprint/specs/caching.md
