## ADDED Requirements

### Requirement: Domain Event Consumption
The system SHALL consume notification-relevant domain events from the configured message broker and convert eligible events into notification jobs.

#### Scenario: Booking event consumed
- **WHEN** a booking confirmation event is received
- **THEN** the system SHALL evaluate routing rules and create notification jobs for configured channels and recipients

### Requirement: Routing Rules
The system SHALL use routing rules to map event types to notification templates, channels, recipients, and delivery timing.

#### Scenario: Event type has multiple channels
- **WHEN** a routing rule maps an event type to in-app and email channels
- **THEN** the system SHALL create one notification job per recipient and channel

### Requirement: Idempotent Dispatch
The system SHALL process duplicate domain events idempotently using event ID, notification type, recipient, and channel.

#### Scenario: Duplicate event received
- **WHEN** the same domain event is consumed more than once
- **THEN** the system SHALL avoid creating duplicate notification jobs for the same recipient and channel

### Requirement: Asynchronous Processing
The system SHALL dispatch notifications asynchronously so domain workflows do not wait for provider delivery.

#### Scenario: Notification provider slow
- **WHEN** an email provider is slow or unavailable
- **THEN** the originating booking or payment workflow SHALL remain decoupled from notification delivery completion
