## Why

TicketBox needs reliable user and organizer notifications for booking updates, event reminders, operational alerts, and future channel expansion. A shared event-driven notification system prevents each workflow from sending messages directly and gives the platform one place to manage retries, provider behavior, templates, and delivery state.

## What Changes

- Add in-app notifications with persisted notification records, read/unread state, and user-facing retrieval APIs.
- Add email notifications for transactional and reminder messages.
- Introduce an event-driven notification architecture that consumes domain events and dispatches notification jobs asynchronously.
- Add an extensible provider abstraction so email is implemented now while SMS and Zalo OA can be added later without changing notification producers.
- Add delayed reminder notifications for event start reminders, reservation/payment reminders, and organizer-defined reminder windows.
- Add retry queues with backoff, max attempts, dead-letter handling, and delivery audit records.
- Add notification template and routing rules so event types can target channels, recipients, and providers consistently.

## Capabilities

### New Capabilities
- `in-app-notifications`: Covers persisted in-app notification creation, retrieval, read/unread state, recipient scoping, and notification preferences.
- `email-notifications`: Covers email channel delivery, templates, transactional message sending, provider responses, and delivery state.
- `event-driven-notification-dispatch`: Covers domain event consumption, notification job creation, routing rules, idempotent dispatch, and asynchronous processing.
- `notification-provider-abstraction`: Covers extensible provider interfaces, email provider implementation, and future SMS and Zalo OA provider compatibility.
- `delayed-reminder-notifications`: Covers scheduled reminder creation, delayed delivery, cancellation, and event/reservation/payment reminder use cases.
- `notification-retry-queue`: Covers retry strategy, backoff, max attempts, dead-letter handling, and delivery audit trail.

### Modified Capabilities
<!-- No modified capabilities; there are no archived baseline specs yet. -->

## Impact

- **Backend**: Adds notification service/module, event consumers, provider adapters, template rendering, scheduling workers, retry workers, and notification APIs.
- **Data Model**: Adds notifications, notification jobs, templates, delivery attempts, provider responses, reminder schedules, and user notification preferences.
- **Infrastructure**: Requires message broker topics/queues, delayed job support, retry/dead-letter queues, email provider credentials, and delivery observability.
- **Clients**: Web and admin clients consume in-app notifications, unread counts, mark-read actions, and user notification preferences.
- **Future Channels**: Defines provider interfaces for SMS and Zalo OA without requiring those providers to be fully implemented in this change.
