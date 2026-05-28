## ADDED Requirements

### Requirement: Idempotency Key Handling
The system SHALL require all payment checkout operations to provide a unique `Idempotency-Key` header and use it to prevent duplicate request execution.

#### Scenario: First Payment Request Execution
- **WHEN** a payment request with a new, unused `Idempotency-Key` is received
- **THEN** the system SHALL create a payment record in a PENDING state, store the key in Redis with a lock, and proceed to execute the transaction with the external gateway

#### Scenario: Duplicate Payment Request Blocked
- **WHEN** a payment request with an `Idempotency-Key` that is currently in a PENDING state is received
- **THEN** the system SHALL reject the request immediately with a 409 Conflict error without calling the external gateway

#### Scenario: Cached Response Returned
- **WHEN** a payment request with an `Idempotency-Key` that has already successfully completed is received
- **THEN** the system SHALL return the cached success response of the completed payment to the client immediately without executing another charge

### Requirement: Double Payment Database Enforcement
The system SHALL enforce database-level integrity constraints to prevent a single booking from having more than one successful payment.

#### Scenario: Database Unique Constraint Violation
- **WHEN** a concurrent thread attempts to insert a second SUCCESS payment record for the same `booking_id` or `idempotency_key`
- **THEN** the database SHALL throw a unique constraint violation, prompting the Payment Service to roll back the transaction and return the existing payment status

### Requirement: Payment Gateway Circuit Breaker
The system SHALL wrap calls to the external payment gateway in a circuit breaker to avoid hanging connections and service depletion during payment provider outages.

#### Scenario: Circuit Breaker Trips
- **WHEN** the external payment gateway's failure rate exceeds 50% over a rolling window of 30 seconds
- **THEN** the circuit breaker SHALL transition to the OPEN state, failing all subsequent payment attempts immediately with a 503 Service Unavailable error without calling the gateway

#### Scenario: Circuit Breaker Resets
- **WHEN** the circuit breaker is in the OPEN state, and the cooldown period of 10 seconds has passed
- **THEN** the breaker SHALL enter the HALF-OPEN state, allowing a small test batch of payment requests to execute with the gateway to verify recovery
