# Đặc tả: Caching cho Concert

## Mô tả
Hệ thống áp dụng cache-aside bằng Redis cho danh sách concert đã publish và chi tiết concert nhằm giảm số lần truy vấn PostgreSQL.

## Yêu cầu chi tiết
- Danh sách concert đã publish được cache với key `concerts:list:published`.
- Chi tiết concert được cache với key `concerts:detail:{id}`.
- TTL cơ sở được đọc từ biến môi trường `CACHE_TTL`, mặc định là 300 giây.
- TTL thực tế được cộng jitter ngẫu nhiên từ 0 đến 59 giây.
- Cache miss sử dụng Redis mutex để hạn chế nhiều request cùng truy vấn DB.
- Các thao tác thay đổi concert và dữ liệu liên quan chủ động xóa cache tương ứng.

## Luồng chính
1. Client gọi API danh sách hoặc chi tiết concert.
2. Backend đọc dữ liệu theo cache key trong Redis.
3. Cache hit → parse JSON và trả dữ liệu.
4. Cache miss → thử tạo mutex `lock:{cacheKey}` bằng `SET NX`.
5. Request giữ mutex đọc PostgreSQL, ghi kết quả vào Redis với TTL và trả dữ liệu.
6. Request không giữ được mutex chờ cache tối đa 5 giây.
7. Sau thời gian chờ, nếu cache vẫn chưa có dữ liệu thì request đọc trực tiếp PostgreSQL.
8. Khi concert hoặc cấu hình liên quan thay đổi, backend xóa key cache bị ảnh hưởng.

## Kịch bản lỗi
- Concert chi tiết không tồn tại hoặc không ở trạng thái `PUBLISHED` → trả lỗi không tìm thấy concert.
- Mutex đang được request khác giữ → poll cache mỗi 200 mili giây, tối đa 25 lần.
- Sau khi poll vẫn cache miss → đọc trực tiếp từ PostgreSQL.

## Ràng buộc
- Mutex cache có TTL 5 giây.
- Request giữ mutex phải xóa mutex trong khối `finally`.
- Dữ liệu cache được serialize dưới dạng JSON.
- API danh sách chỉ cache concert có trạng thái `PUBLISHED`.
- API chi tiết chỉ cache concert có trạng thái `PUBLISHED`.

## Tiêu chí chấp nhận
- Cache hit trả dữ liệu mà không truy vấn PostgreSQL.
- Cache miss ghi kết quả truy vấn vào Redis với TTL.
- Nhiều request cache miss cùng key được điều phối bằng mutex.
- Tạo, cập nhật hoặc xóa concert làm mất hiệu lực cache danh sách và chi tiết liên quan.
- Thay đổi ticket type, show, artist hoặc gate làm mất hiệu lực cache chi tiết concert.
