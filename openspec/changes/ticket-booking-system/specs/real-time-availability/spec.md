## ADDED Requirements

### Requirement: Availability Update Publication
The system SHALL publish real-time availability updates after accepted inventory mutations for reservations, expirations, cancellations, completed bookings, and reconciliation corrections.

#### Scenario: Reservation changes availability
- **WHEN** a reservation is successfully created
- **THEN** the system SHALL publish an update containing event ID, ticket type ID, available count, reserved count, sold count, and inventory version

#### Scenario: Expiration changes availability
- **WHEN** a reservation expires and inventory is released
- **THEN** the system SHALL publish an update containing the new availability state

### Requirement: Versioned Availability Ordering
The system SHALL include monotonically increasing inventory versions in availability updates so clients can ignore stale messages.

#### Scenario: Client receives stale update
- **WHEN** a client receives an availability update with a version lower than or equal to the latest applied version for that ticket type
- **THEN** the client SHALL ignore the stale update

### Requirement: Availability Snapshot Recovery
The system SHALL provide a current availability snapshot when clients initially load an event or reconnect after missing real-time updates.

#### Scenario: Client reconnects
- **WHEN** a client reconnects to an event availability channel
- **THEN** the system SHALL send or expose the latest availability snapshot before applying subsequent streaming updates

### Requirement: Sold-Out Broadcast
The system SHALL publish a sold-out state when available inventory reaches zero for a ticket type.

#### Scenario: Last ticket reserved
- **WHEN** a reservation decrements available inventory for a ticket type to zero
- **THEN** the system SHALL broadcast a sold-out availability update for that ticket type
