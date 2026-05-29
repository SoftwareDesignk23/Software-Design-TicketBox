## Context

TicketBox workflows produce many user-visible events: booking confirmations, payment updates, event reminders, organizer alerts, check-in updates, and operational notices. Sending those messages directly from each domain service would duplicate template logic, make retries inconsistent, and make future channels such as SMS and Zalo OA harder to add.

The notification system will consume domain events, resolve recipients and channels, create notification jobs, deliver through provider adapters, and persist delivery outcomes. In-app and email channels are implemented now; SMS and Zalo OA are designed as future providers behind the same abstraction.

## Goals / Non-Goals

**Goals:**
- Provide persisted in-app notifications with unread counts and read state.
- Send transactional email notifications through an email provider adapter.
- Consume domain events asynchronously and produce notification jobs using routing rules.
- Define an extensible provider abstraction compatible with future SMS and Zalo OA providers.
- Support delayed reminders for events, reservations, payments, and organizer-defined reminder windows.
- Retry transient delivery failures through retry queues with backoff, max attempts, and dead-letter handling.
- Store audit records for notification jobs, delivery attempts, provider responses, and final delivery state.

**Non-Goals:**
- Implementing SMS or Zalo OA delivery providers in this change.
- Building a full marketing campaign platform, segmentation engine, or visual template editor.
- Guaranteeing provider-level delivery beyond accepted provider responses.
- Replacing client push notifications unless added by a future capability.

## Decisions

### Decision 1: Event-Driven Notification Jobs

Domain services SHALL publish notification-relevant events to a broker, and the notification system SHALL create jobs from those events using routing rules. Producers do not call email or in-app provider code directly.

Alternatives considered:
- **Synchronous direct sends from domain services**: Simple, but slows critical workflows and duplicates retry/provider logic.
- **Single generic send endpoint only**: Useful for manual sends, but misses event replay and asynchronous delivery benefits.
- **Event-driven jobs**: Chosen because it decouples domain transactions from delivery and supports retries, replay, and delayed scheduling.

### Decision 2: Channel and Provider Separation

The system SHALL model channel behavior separately from provider adapters. Channels define message semantics such as in-app or email, while providers implement external delivery APIs such as SMTP, SES, SendGrid, SMS, or Zalo OA.

Alternatives considered:
- **Provider-specific job types**: Fast initially, but couples templates and routing to vendor details.
- **Single provider interface with no channel model**: Too vague for in-app persistence versus email delivery.
- **Channel plus provider abstraction**: Chosen to support in-app, email now, and SMS/Zalo OA later with clear boundaries.

### Decision 3: Persist Before Delivery

Notification jobs and in-app records SHALL be persisted before delivery attempts are made. Delivery workers update attempt history and final state after provider responses.

Alternatives considered:
- **Fire-and-forget provider calls**: Lowest latency, but loses auditability and retry capability.
- **Persist only failures**: Reduces storage, but makes success auditing and duplicate detection weaker.
- **Persist jobs and attempts**: Chosen for reliability, traceability, and replay.

### Decision 4: Delayed Reminders Use Scheduler-Owned Jobs

Delayed reminders SHALL be represented as scheduled notification jobs with due timestamps, cancellation keys, and recipient/routing metadata. The scheduler enqueues due jobs into the normal delivery pipeline.

Alternatives considered:
- **Client-side reminder timers**: Unreliable when clients are offline.
- **Ad hoc cron per reminder type**: Easy to fragment and hard to cancel consistently.
- **Scheduler-owned jobs**: Chosen because all reminders share one lifecycle and retry path.

### Decision 5: Retry Queue with Dead-Letter Handling

Transient delivery failures SHALL be retried with exponential backoff and jitter until a maximum attempt count is reached. Exhausted jobs move to a dead-letter state with enough context for operational review or manual replay.

Alternatives considered:
- **Immediate repeated retries**: Can worsen provider incidents and hit rate limits.
- **No retries**: Creates poor reliability for temporary network or provider failures.
- **Backoff retry queue plus dead-letter state**: Chosen as the resilient middle path.

## Risks / Trade-offs

- **[Risk] Duplicate domain events can create duplicate notifications** -> Mitigation: store idempotency keys derived from event ID, notification type, recipient, and channel.
- **[Risk] Provider outages can build large retry backlogs** -> Mitigation: use retry backoff, dead-letter thresholds, queue depth alerts, and provider circuit metadata where available.
- **[Risk] Delayed reminders may fire after a booking or event is cancelled** -> Mitigation: scheduled jobs use cancellation keys and re-check eligibility before dispatch.
- **[Risk] Templates can drift across channels** -> Mitigation: centralize template keys, variables, validation, and rendering tests.
- **[Risk] Future SMS and Zalo OA requirements may differ from email** -> Mitigation: keep provider contracts explicit about capabilities, payload shape, rate limits, and provider-specific metadata.

## Migration Plan

1. Add notification data models for notifications, jobs, templates, attempts, preferences, and reminder schedules.
2. Add event consumer subscriptions for booking, payment, event, and organizer events.
3. Implement in-app notification APIs and unread count support.
4. Implement email channel delivery through the provider abstraction.
5. Add delayed reminder scheduling and cancellation.
6. Add retry queue, dead-letter handling, and operational metrics.
7. Enable notification routing rules incrementally by event type.
8. Roll back by disabling event consumers for new jobs while allowing already queued jobs to drain or move to dead-letter.

## Open Questions

- Which email provider should be the first production adapter?
- What default reminder windows should TicketBox support for events and unpaid reservations?
- Should notification preferences be global per channel or configurable by notification category in the first implementation?
