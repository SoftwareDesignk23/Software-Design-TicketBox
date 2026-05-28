## ADDED Requirements

### Requirement: High-Concurrency Ticket Reservation
The system SHALL support reserving ticket inventory within Redis at sub-millisecond speeds under heavy concurrent load to guarantee zero overselling.

#### Scenario: Successful Ticket Reservation
- **WHEN** a user requests to reserve 2 tickets for a ticket type that has 10 remaining in stock
- **THEN** the system SHALL successfully decrement the Redis inventory by 2, create a pending reservation with a 10-minute TTL, and return a success response to the user

#### Scenario: Insufficient Stock Reservation Failure
- **WHEN** a user requests to reserve 5 tickets for a ticket type that has only 3 remaining in stock
- **THEN** the system SHALL reject the reservation, make no modifications to inventory, and return an "Out of Stock" error response

### Requirement: Temporary Reservation Expiration
The system SHALL automatically release and return reserved ticket counts to the active pool if checkout is not completed within 10 minutes.

#### Scenario: Reservation Expiration
- **WHEN** a reservation's 10-minute TTL expires without a completed payment
- **THEN** the system SHALL increment the Redis ticket inventory by the reserved quantity and mark the database reservation status as EXPIRED

### Requirement: Real-Time Availability Updates
The system SHALL broadcast updated ticket inventory changes in real-time to active clients via WebSockets when sales occur or reservations expire.

#### Scenario: Real-Time Inventory Broadcast
- **WHEN** a ticket reservation is successfully finalized or expires
- **THEN** the system SHALL broadcast the updated remaining ticket count to all connected WebSocket clients for that event

### Requirement: API Rate Limiting
The system SHALL enforce rate limits using a Token Bucket algorithm in Redis to prevent system degradation from traffic spikes.

#### Scenario: Request Within Rate Limits
- **WHEN** a user submits an API request and their token bucket contains available tokens
- **THEN** the system SHALL process the request normally and decrement the token count by one

#### Scenario: Rate Limit Exceeded
- **WHEN** a user submits an API request and their token bucket is empty
- **THEN** the system SHALL reject the request immediately with a 429 Too Many Requests response
