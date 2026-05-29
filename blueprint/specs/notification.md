# Đặc tả: Notification System

## Mô tả
Hệ thống thông báo event-driven, hỗ trợ in-app, email, nhắc nhở trễ và retry có dead-letter.

## Yêu cầu chi tiết
- Consume domain events và tạo notification jobs.
- Routing rules map event → template + channel + recipient.
- Idempotent theo event_id + channel + recipient.
- In-app notification: lưu, đọc, unread count, isolate theo user.
- Email: render template, validate variables, track states.
- Delayed reminders: schedule, re-check eligibility, cancel khi state đổi.
- Provider abstraction cho SMS/Zalo OA tương lai.
- Retry với backoff, DLQ và audit attempt.

## Luồng chính
1. Domain event (booking/payment) emit vào broker.
2. Notification service consume và tạo job theo routing rules.
3. Render template và gửi qua provider.
4. Persist trạng thái và attempt log.
5. Delayed reminder được schedule theo T-24h.

## Kịch bản lỗi
- Provider tạm thời lỗi → retry backoff.
- Template thiếu biến → fail non-retryable.
- Job retry quá ngưỡng → dead-letter.

## Ràng buộc
- Idempotent theo event_id + recipient + channel.
- Provider abstraction để mở rộng SMS/Zalo OA.
- Respect user preferences cho optional notifications.

## Tiêu chí chấp nhận
- Mỗi event tạo đúng số job theo routing.
- Retry hoạt động và audit đầy đủ.
- Delayed reminder được cancel khi trạng thái thay đổi.
