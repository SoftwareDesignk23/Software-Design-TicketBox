## 1. Notification Foundation

- [ ] 1.1 Add notification module/service structure with domain models for notifications, jobs, templates, delivery attempts, preferences, and reminder schedules
- [ ] 1.2 Add configuration validation for broker subscriptions, email provider settings, retry policy, reminder scheduler cadence, and dead-letter queue names
- [ ] 1.3 Add notification template registry with required-variable validation and versioned template keys
- [ ] 1.4 Add idempotency key generation for event ID, notification type, recipient, and channel
- [ ] 1.5 Add audit logging utilities that redact sensitive recipient and provider data

## 2. Event-Driven Dispatch

- [ ] 2.1 Add broker consumers for booking, payment, event, organizer, and system notification events
- [ ] 2.2 Implement routing rules that map event types to recipients, channels, templates, and delivery timing
- [ ] 2.3 Implement notification job creation from consumed events using idempotency checks
- [ ] 2.4 Ensure duplicate domain events do not create duplicate jobs for the same recipient and channel
- [ ] 2.5 Add asynchronous worker processing so domain workflows do not wait for provider delivery

## 3. In-App Notifications

- [ ] 3.1 Implement persisted in-app notification creation from notification jobs
- [ ] 3.2 Add recipient-scoped notification list API ordered by newest first
- [ ] 3.3 Add unread count API for authenticated recipients
- [ ] 3.4 Add mark-read and mark-all-read APIs that update only the authenticated recipient's notifications
- [ ] 3.5 Add authorization checks preventing users from reading or modifying another recipient's notifications

## 4. Email Channel and Provider Abstraction

- [ ] 4.1 Define provider adapter contracts for capability validation, send execution, normalized responses, and retryability metadata
- [ ] 4.2 Implement the first email provider adapter behind the provider contract
- [ ] 4.3 Implement email template rendering for subject and body with required-variable validation
- [ ] 4.4 Implement email delivery worker that records queued, sending, accepted, failed, retrying, and dead-letter states
- [ ] 4.5 Implement notification preference checks for optional email categories
- [ ] 4.6 Add placeholder capability metadata and contract tests for future SMS and Zalo OA adapters

## 5. Delayed Reminders

- [ ] 5.1 Implement scheduled reminder records with due timestamp, cancellation key, recipient metadata, template key, and channel routing
- [ ] 5.2 Add reminder scheduling for event reminders and reservation or payment reminders
- [ ] 5.3 Implement scheduler worker that enqueues due reminders into the normal notification job pipeline
- [ ] 5.4 Implement cancellation flow for reminders whose event, booking, reservation, or payment state is no longer eligible
- [ ] 5.5 Re-check reminder eligibility immediately before dispatch and record skipped reminders with reasons

## 6. Retry Queue and Dead-Letter Handling

- [ ] 6.1 Classify provider and validation failures as retryable or non-retryable
- [ ] 6.2 Implement retry scheduling with exponential backoff, jitter, max attempts, and next-attempt timestamps
- [ ] 6.3 Implement dead-letter state after retry exhaustion with preserved job metadata and failure context
- [ ] 6.4 Record every delivery attempt with attempt number, provider, response classification, timestamps, and retry decision
- [ ] 6.5 Add authorized operator replay flow for eligible dead-lettered notifications
- [ ] 6.6 Add metrics and alerts for queue depth, retry volume, dead-letter count, provider failures, and reminder lag

## 7. Client Integration

- [ ] 7.1 Add client API utilities for notification list, unread count, mark-read, and mark-all-read actions
- [ ] 7.2 Add web/admin notification UI integration for unread count and notification list
- [ ] 7.3 Add client handling for notification preference retrieval and updates if preferences are exposed in this phase
- [ ] 7.4 Add user-facing states for empty notification lists and read/unread updates

## 8. Verification

- [ ] 8.1 Add unit tests for routing rules, template rendering, idempotency keys, and duplicate event handling
- [ ] 8.2 Add in-app notification API tests for retrieval, unread count, read state, and recipient isolation
- [ ] 8.3 Add email provider adapter tests for accepted, retryable failure, non-retryable failure, and invalid template variables
- [ ] 8.4 Add delayed reminder tests for scheduling, due enqueueing, cancellation, eligibility recheck, and skipped reminders
- [ ] 8.5 Add retry queue tests for backoff, max attempts, dead-letter transition, audit records, and manual replay eligibility
- [ ] 8.6 Add integration tests proving domain events create expected in-app and email notification jobs asynchronously
- [ ] 8.7 Run affected backend and client test/lint commands and document any skipped checks
