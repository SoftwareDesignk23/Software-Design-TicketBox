# Thiết kế Rate Limiting

**Ngày đối chiếu:** 15/07/2026  
**Phạm vi:** Backend NestJS  
**Mục tiêu:** Giới hạn lưu lượng HTTP và đối chiếu với mô hình Token Bucket

## 1. Hiện trạng triển khai

Backend sử dụng **@nestjs/throttler** và đăng ký **AppThrottlerGuard** dưới dạng **APP_GUARD**, nên giới hạn áp dụng toàn cục cho HTTP.

| Thuộc tính | Giá trị hiện tại |
|---|---|
| Cửa sổ thời gian | 60.000 ms |
| Số request tối đa | 100 request |
| Tracker mặc định | Địa chỉ IP của client |
| Phạm vi | Toàn bộ HTTP endpoint |
| Ngoại lệ | Execution context không phải HTTP, gồm WebSocket |
| Storage | Storage mặc định trong tiến trình backend |
| Khi vượt giới hạn | HTTP 429 Too Many Requests |

Luồng xử lý:

1. Request đi vào NestJS.
2. AppThrottlerGuard kiểm tra execution context.
3. Nếu không phải HTTP, request được bỏ qua throttling.
4. Nếu là HTTP, guard gọi logic mặc định của ThrottlerGuard.
5. Counter của tracker được tăng trong cửa sổ TTL.
6. Request thứ 101 trong cùng cửa sổ bị từ chối với HTTP 429.

## 2. Mô hình hiện tại và Token Bucket

### Cơ chế hiện tại

Triển khai hiện tại giới hạn số request trong một khoảng TTL. Code không có bucket, token hoặc refill liên tục, vì vậy không thể mô tả đây là Token Bucket.

### Lý thuyết Token Bucket

Token Bucket duy trì:

- **capacity:** số token tối đa.
- **refillRate:** số token được thêm theo thời gian.
- Mỗi request tiêu thụ một hoặc nhiều token.
- Request chỉ được xử lý khi bucket đủ token.
- Token dư tích lũy tới capacity, cho phép burst ngắn.

Ví dụ tham chiếu tương đương mức trung bình hiện tại:

| Tham số | Giá trị |
|---|---|
| Capacity | 100 token |
| Refill rate | 100 token/phút, khoảng 1,67 token/giây |
| Chi phí request thường | 1 token |
| Burst tối đa | 100 request khi bucket đầy |

Đây chỉ là mô hình tham chiếu. Dự án chưa có Token Bucket hoặc Redis Lua script để refill và consume token.

## 3. So sánh

| Tiêu chí | Giới hạn hiện tại | Token Bucket |
|---|---|---|
| Độ phức tạp | Thấp | Trung bình |
| Burst ngắn | Phụ thuộc cửa sổ | Điều khiển bằng capacity |
| Biên cửa sổ | Có thể burst ở hai phía biên | Không có biên cứng |
| Chi phí theo endpoint | Chưa có | Có thể gán token cost |
| Nhiều backend instance | Counter tách theo process | Chia sẻ bằng Redis |

## 4. Phạm vi bảo vệ

| Nhóm | Hiện trạng |
|---|---|
| Concert API | Chịu giới hạn global |
| Booking API | Chịu giới hạn global, chưa có quota riêng |
| Payment API và webhook | Chịu giới hạn global, chưa có quota riêng |
| Auth API | Chịu giới hạn global, login chưa có mức riêng |
| CSV, AI, storage | Chịu cùng giới hạn global |
| Socket.IO | Bị AppThrottlerGuard bỏ qua |

## 5. Hạn chế và rủi ro

1. Counter nằm trong từng tiến trình. Khi scale nhiều instance, quota không được chia sẻ.
2. Theo IP có thể chặn người dùng chung NAT và dễ bị phân tán qua nhiều IP.
3. Mọi endpoint dùng cùng mức 100 request/phút dù độ nhạy cảm khác nhau.
4. WebSocket bị bỏ qua hoàn toàn và cần bảo vệ riêng.
5. Blueprint đề cập Redis rate limit nhưng code hiện tại chưa nối Redis vào ThrottlerModule.

## 6. Hướng áp dụng Token Bucket

1. Dùng Redis lưu bucket chung giữa các instance.
2. Key đề xuất: **ratelimit:{scope}:{identity}**.
3. Identity ưu tiên userId, fallback IP.
4. Dùng Lua script để refill và consume nguyên tử.
5. Áp dụng policy riêng:

| Endpoint class | Capacity tham chiếu | Refill tham chiếu |
|---|---:|---:|
| Concert read | 120 | 2 token/giây |
| Booking mutation | 10 | 1 token/3 giây |
| Payment create | 5 | 1 token/10 giây |
| Auth login | 5 | 1 token/phút |

Các giá trị trên là đề xuất, chưa phải cấu hình đang chạy.

## 7. Tiêu chí kiểm tra

- Không quá 100 request trong 60 giây từ một IP: được xử lý.
- Request thứ 101 trong cùng cửa sổ: nhận HTTP 429.
- Event WebSocket: không bị AppThrottlerGuard chặn.
- Hai backend instance: counter hiện không chia sẻ.

## 8. Code đối chiếu

- src/apps/backend/src/app.module.ts
- src/apps/backend/src/common/guards/app-throttler.guard.ts
- src/apps/backend/package.json

