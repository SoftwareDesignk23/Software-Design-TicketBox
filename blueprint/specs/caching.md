# Đặc tả hiện trạng: Caching Concert

## Mô tả
Redis cache-aside hiện được dùng cho danh sách concert đã publish và chi tiết concert.

## Luồng hiện tại
- Key danh sách: `concerts:list:published`.
- Key chi tiết: `concerts:detail:{id}`.
- TTL mặc định lấy từ `CACHE_TTL`, mặc định 300 giây, cộng jitter tối đa 59 giây.
- Cache miss dùng mutex Redis `SET NX PX 5000`; request không lấy được lock sẽ poll cache tối đa 5 giây rồi đọc DB.
- Các thao tác tạo/cập nhật/xóa concert và cấu hình liên quan xóa các key list/detail tương ứng.

## Giới hạn hiện tại
- Chưa cache availability hoặc số vé còn lại.
- Không có stale-while-revalidate.
- Không có fallback rõ ràng khi Redis mất kết nối; thao tác Redis lỗi có thể làm request thất bại trước khi đọc DB.
- Chưa đo cache-hit ratio hoặc cam kết độ lệch availability.

## Điểm cần lưu ý
`RedisService.onModuleDestroy()` gọi `flushall()`, vì vậy khi một instance backend tắt có thể xóa toàn bộ key trong Redis dùng chung.
