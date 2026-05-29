## ADDED Requirements

### Requirement: Queue Admission for High-Demand Sales
The system SHALL require queue admission before reservation attempts when an event sale is configured for queue mode or demand exceeds configured concurrency thresholds.

#### Scenario: User joins queue
- **WHEN** a user requests access to a queued sale
- **THEN** the system SHALL create or return a queue entry with position or estimated wait metadata and SHALL NOT reserve inventory

#### Scenario: Reservation without admission
- **WHEN** a user attempts to reserve tickets for a queued sale without a valid admission lease
- **THEN** the system SHALL reject the reservation attempt without changing inventory

### Requirement: Admission Lease Window
The system SHALL issue time-limited admission leases that allow admitted users to attempt reservations during a bounded window.

#### Scenario: User admitted from queue
- **WHEN** capacity is available to admit another buyer from the queue
- **THEN** the system SHALL issue an admission lease with an expiration timestamp and maximum reservation-attempt count

#### Scenario: Admission lease expires
- **WHEN** an admitted user does not create a reservation before the admission lease expires
- **THEN** the system SHALL revoke the lease and allow another queued user to be admitted

### Requirement: Queue Traffic Shaping
The system SHALL limit the number of concurrent admitted users per event and ticket type to protect reservation APIs, Redis, and persistence workers during demand spikes.

#### Scenario: Admission capacity reached
- **WHEN** the number of active admission leases equals the configured concurrency limit
- **THEN** the system SHALL keep additional queued users waiting until a lease is consumed, expires, or is revoked

### Requirement: Queue State Updates
The system SHALL provide real-time or pollable queue state updates to clients waiting for admission.

#### Scenario: Queue position changes
- **WHEN** a user's queue position or admission state changes
- **THEN** the system SHALL expose the updated state with enough metadata for the client to render waiting, admitted, expired, or sold-out states

### Requirement: Queue Sold-Out Handling
The system SHALL stop admitting users for ticket types that are sold out and notify queued users of the sold-out state.

#### Scenario: Inventory sells out while users wait
- **WHEN** a queued ticket type reaches sold-out state before a waiting user is admitted
- **THEN** the system SHALL mark the affected queue entry sold out and SHALL NOT issue an admission lease for that ticket type
