## ADDED Requirements

### Requirement: Atomic Inventory Reservation
The system SHALL use Redis atomic operations to validate and mutate ticket inventory for reservation attempts so concurrent requests cannot reserve more tickets than available capacity.

#### Scenario: Concurrent reservations within stock
- **WHEN** multiple users concurrently request reservations whose total quantity is less than or equal to the available ticket count
- **THEN** the system SHALL accept only reservations covered by available inventory and SHALL decrement the available count exactly once per accepted ticket

#### Scenario: Concurrent reservations exceed stock
- **WHEN** multiple users concurrently request reservations whose total quantity exceeds the available ticket count
- **THEN** the system SHALL reject the excess reservation attempts without decrementing inventory below zero

### Requirement: Distributed Lock Protection
The system SHALL use bounded distributed locks for reservation finalization, reservation expiration, and inventory reconciliation operations that update multiple resources.

#### Scenario: Checkout races reservation expiration
- **WHEN** a reservation completion and reservation expiration attempt run concurrently for the same reservation
- **THEN** only one operation SHALL acquire the transition lock and complete the reservation state change

#### Scenario: Lock acquisition fails
- **WHEN** a booking transition cannot acquire the required distributed lock before the retry budget is exhausted
- **THEN** the system SHALL leave the reservation unchanged and return a retryable conflict response

### Requirement: Durable Optimistic Locking
The system SHALL persist inventory-affecting records with optimistic locking so stale writes cannot overwrite newer reservation, expiration, or sale changes.

#### Scenario: Stale inventory version
- **WHEN** a database update uses an inventory version older than the current persisted version
- **THEN** the system SHALL reject the stale update and retry from the latest inventory state or mark the operation for reconciliation

### Requirement: Inventory Reconciliation
The system SHALL detect and repair differences between Redis inventory counters and durable reservation, booking, and ticket records.

#### Scenario: Redis and database counts diverge
- **WHEN** reconciliation detects that Redis availability differs from the durable sold and active reservation totals
- **THEN** the system SHALL correct Redis counters, record an audit entry, and emit an updated availability event
