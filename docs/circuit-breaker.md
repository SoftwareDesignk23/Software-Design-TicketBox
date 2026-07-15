# Thiết kế Circuit Breaker

**Ngày đối chiếu:** 15/07/2026  
**Phạm vi:** AI provider, VNPAY, MoMo và Cloudinary  
**Mục tiêu:** Kiểm tra state transition và fallback theo code hiện tại

## 1. Mô hình trạng thái

| Trạng thái | Hành vi |
|---|---|
| CLOSED | Cho request tới dependency và ghi nhận kết quả |
| OPEN | Fail fast trong thời gian reset |
| HALF_OPEN | Cho request thăm dò để quyết định phục hồi |

State transition:

    CLOSED -- đủ lỗi/ngưỡng lỗi --> OPEN
    OPEN -- hết reset timeout --> HALF_OPEN
    HALF_OPEN -- probe thành công --> CLOSED
    HALF_OPEN -- probe thất bại --> OPEN

## 2. Các circuit breaker thực tế

| Thành phần | Implementation | Action được bảo vệ | Timeout | Ngưỡng mở | Reset | Retry |
|---|---|---|---:|---|---:|---|
| AI generation | Utility custom | provider.generateBio() | Không có | 3 lỗi được tính | 60 giây | 3 lần, backoff 2 và 4 giây |
| VNPAY | Opossum | HEAD health check sandbox | 5 giây | 50% lỗi | 10 giây | Không |
| MoMo | Opossum | POST test payment endpoint | 5 giây | 50% lỗi | 10 giây | Axios 3 lần |
| Cloudinary | Opossum | Upload file | 20 giây | 50% lỗi | 30 giây | Axios 3 lần |

## 3. State transition của AI breaker

1. Khởi tạo ở CLOSED, failureCount bằng 0.
2. Lỗi được shouldTrip() chấp nhận làm tăng failureCount.
3. Đủ 3 lỗi: chuyển OPEN trong 60 giây.
4. Trong OPEN, fire() ném CircuitBreakerError ngay.
5. Hết timeout: request kế tiếp chuyển HALF_OPEN.
6. Mỗi thành công HALF_OPEN tăng successCount.
7. Sau 2 thành công: chuyển CLOSED.
8. Một lỗi được tính trong HALF_OPEN: trở lại OPEN.

Lỗi không được tính gồm HTTP 4xx, 401/403/Unauthorized, quota hoặc invalid key thuần túy và ai_generation_failed. Lỗi transient server hoặc unknown provider có thể được tính.

### Tương tác với retry

- Lỗi dependency thường được retry tối đa 3 lần.
- Delay exponential backoff là 2 giây rồi 4 giây.
- CircuitBreakerError không bị retry, tránh retry storm khi OPEN.

## 4. State transition của Opossum

1. CLOSED theo dõi tỷ lệ lỗi trong rolling window của thư viện.
2. Đạt ngưỡng 50% lỗi: chuyển OPEN.
3. Request trong OPEN đi vào fallback.
4. Hết resetTimeout: chuyển HALF_OPEN và chạy probe.
5. Probe thành công đóng circuit; probe thất bại mở lại.
6. Event open, halfOpen và close được ghi log.

## 5. Fallback thực tế

| Thành phần | Fallback |
|---|---|
| AI | AiService bắt lỗi và tiếp tục với artist info mặc định |
| VNPAY | Ném AppException với reason vnpay_gateway_down |
| MoMo | Ném AppException với reason payment_gateway_down |
| Cloudinary | Ném InternalServerErrorException báo storage quá tải |

MoMo có nhánh trả mock payment URL cho lỗi thường. Tuy nhiên lỗi từ fallback là AppException và được ném lại, nên mock URL không được đảm bảo khi circuit OPEN.

## 6. Kịch bản kiểm tra State Transition

### CLOSED giữ nguyên

- Dependency thành công liên tục.
- Không phát event open.

### CLOSED sang OPEN

- AI phát sinh 3 lỗi được tính hoặc Opossum vượt 50% lỗi.
- Xác nhận log OPEN.
- Request tiếp theo fail fast.

### OPEN sang HALF_OPEN

- Chờ reset timeout.
- Gửi request mới.
- Xác nhận HALF_OPEN và dependency nhận probe.

### HALF_OPEN sang CLOSED

- AI cần 2 lần thành công.
- Opossum cần probe thành công.
- Xác nhận CLOSED và request bình thường trở lại.

### HALF_OPEN trở lại OPEN

- Cho probe thất bại.
- Xác nhận circuit mở lại và reset timer mới.

## 7. Điểm cần lưu ý

1. AI breaker không giới hạn concurrency ở HALF_OPEN; nhiều probe có thể chạy cùng lúc.
2. AI breaker không dùng rolling window, chỉ đếm lỗi tới khi có thành công reset.
3. VNPAY breaker chỉ bọc health check khi tạo URL, không bọc webhook settlement.
4. MoMo cấu hình axios retry trên default axios instance, có thể ảnh hưởng module khác.
5. Cloudinary có cả retry và breaker; một fire() có thể tạo nhiều HTTP attempt.
6. Chưa có metric tập trung cho state, reject, latency hoặc fallback count.

## 8. Code đối chiếu

- src/apps/backend/src/utils/circuit-breaker.util.ts
- src/apps/backend/src/ai/ai.service.ts
- src/apps/backend/src/payments/providers/vnpay.provider.ts
- src/apps/backend/src/payments/providers/momo.provider.ts
- src/apps/backend/src/storage/storage.service.ts

