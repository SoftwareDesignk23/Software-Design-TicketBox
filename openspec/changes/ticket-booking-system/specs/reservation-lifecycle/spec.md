## ADDED Requirements

### Requirement: Reservation Creation
The system SHALL create a pending reservation with a unique reservation ID, user ID, ticket type ID, quantity, expiration timestamp, and initial inventory version after inventory is atomically reserved.

#### Scenario: Successful reservation creation
- **WHEN** an admitted user reserves an available quantity within purchase limits
- **THEN** the system SHALL create a `PENDING` reservation, decrement available inventory, return the expiration timestamp, and publish an availability update

#### Scenario: Reservation persistence fails
- **WHEN** Redis inventory is reserved but the durable reservation record cannot be persisted
- **THEN** the system SHALL release the reserved inventory or place the reservation attempt into a reconciliation-required state without issuing tickets

### Requirement: Reservation Expiration
The system SHALL expire pending reservations after their expiration timestamp and return the reserved quantity to available inventory.

#### Scenario: Reservation expires before checkout
- **WHEN** a pending reservation reaches its expiration timestamp without completed checkout
- **THEN** the system SHALL mark the reservation `EXPIRED`, increment available inventory by the reserved quantity, reduce the user's pending count, and publish an availability update

#### Scenario: Expiration repeats
- **WHEN** an expiration worker processes an already expired reservation
- **THEN** the system SHALL make no additional inventory change and SHALL keep the reservation in `EXPIRED` state

### Requirement: Reservation Completion
The system SHALL convert a pending reservation into a completed booking only before expiration and only once.

#### Scenario: Checkout completes before expiration
- **WHEN** payment confirmation is accepted for a pending unexpired reservation
- **THEN** the system SHALL mark the reservation `COMPLETED`, create the booking tickets, increment sold inventory, reduce the user's pending count, and keep available inventory unchanged

#### Scenario: Checkout attempts after expiration
- **WHEN** checkout completion is attempted for an expired reservation
- **THEN** the system SHALL reject the completion and SHALL NOT issue tickets

### Requirement: Reservation Cancellation
The system SHALL allow users or system workflows to cancel pending reservations before checkout completion.

#### Scenario: User cancels pending reservation
- **WHEN** a user cancels a pending reservation before payment completion
- **THEN** the system SHALL mark the reservation `CANCELLED`, release the reserved quantity to available inventory, reduce the user's pending count, and publish an availability update
