# Đặc tả: Thanh toán & Chống trừ tiền hai lần

## Mô tả
Tích hợp VNPAY/MoMo với idempotency key, bảo vệ webhook, xử lý timeout/circuit breaker, đảm bảo booking chỉ finalize đúng một lần.

## Yêu cầu chi tiết
- VNPAY: tạo URL ký số, verify return, map status.
- MoMo: create request, verify IPN, map status.
- Idempotency cho create/confirm payment.
- Dedup theo provider transaction reference.
- Timeout expire attempt và release reservation.
- Circuit breaker per provider, graceful degradation.

## Luồng chính
1. Client gửi yêu cầu tạo payment với `idempotency_key`.
2. Payment module kiểm tra key:
	- Key đã có → trả kết quả cũ.
	- Key mới → tạo payment attempt.
3. Tạo URL/redirect tới VNPAY/MoMo.
4. Nhận return/IPN/webhook:
	- Verify chữ ký.
	- Map trạng thái provider → internal state.
5. Success → finalize booking và phát hành e-ticket.
6. Fail/timeout → expire attempt + release reservation.

## Kịch bản lỗi
- Provider timeout → retry bounded, trả pending.
- Callback trễ → idempotent update.
- Signature mismatch → reject và audit.
- Amount mismatch → mark suspicious, không finalize.

## Ràng buộc
- Idempotency key TTL 10-30 phút.
- Circuit breaker per provider với trạng thái `Closed/Open/Half-Open`.
- Webhook/IPN có signature + replay protection + freshness check.
- Dedup theo provider transaction reference.

## Tiêu chí chấp nhận
- Một booking chỉ finalize một lần.
- Request lặp không tạo giao dịch mới.
- Hệ thống vẫn hoạt động khi provider lỗi.
