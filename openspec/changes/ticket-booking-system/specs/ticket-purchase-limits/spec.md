## ADDED Requirements

### Requirement: Per-User Limit Evaluation
The system SHALL enforce configured per-user ticket limits before creating a reservation by counting both completed purchases and active pending reservations for the same limit scope.

#### Scenario: Request within user limit
- **WHEN** a user with 1 completed ticket and 1 pending reserved ticket requests 2 more tickets for an event with a limit of 4
- **THEN** the system SHALL allow the reservation attempt to proceed because the total would not exceed the limit

#### Scenario: Request exceeds user limit
- **WHEN** a user with 2 completed tickets and 2 pending reserved tickets requests 1 more ticket for an event with a limit of 4
- **THEN** the system SHALL reject the reservation attempt without changing inventory

### Requirement: Atomic Limit Counter Updates
The system SHALL update pending ticket counters atomically with reservation inventory changes.

#### Scenario: Limit and inventory checked together
- **WHEN** a reservation request is evaluated
- **THEN** the system SHALL atomically check the user's remaining limit and available inventory before accepting the reservation

### Requirement: Limit Counter Release
The system SHALL release pending ticket counts when reservations expire, are cancelled, or are completed into sold tickets.

#### Scenario: Expired reservation releases pending count
- **WHEN** a user's pending reservation expires
- **THEN** the system SHALL reduce the user's pending ticket count by the expired reservation quantity

### Requirement: Limit Failure Response
The system SHALL return a stable limit-exceeded error response that includes the configured limit and the user's remaining reservable quantity.

#### Scenario: Limit exceeded response
- **WHEN** a user requests more tickets than their remaining limit allows
- **THEN** the system SHALL return a `TICKET_LIMIT_EXCEEDED` response with no inventory mutation
