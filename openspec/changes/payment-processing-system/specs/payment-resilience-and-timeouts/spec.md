## ADDED Requirements

### Requirement: Payment Timeout Handling
The system SHALL expire unpaid payment attempts after their configured timeout and coordinate with reservation release rules.

#### Scenario: Payment attempt times out
- **WHEN** a payment attempt reaches its expiration timestamp without verified success
- **THEN** the system SHALL mark the attempt expired and request release of the associated pending reservation

#### Scenario: Late success after timeout
- **WHEN** a verified success arrives after the payment attempt or reservation has expired
- **THEN** the system SHALL NOT issue tickets automatically and SHALL mark the payment for review or configured remediation

### Requirement: Safe Retry Strategy
The system SHALL retry transient provider failures with bounded exponential backoff and SHALL NOT retry non-retryable declines, validation errors, or signature failures.

#### Scenario: Transient provider timeout
- **WHEN** a provider request fails with a retryable network timeout before a definitive provider transaction is recorded
- **THEN** the system SHALL retry within the configured retry budget using the same idempotency context

#### Scenario: Non-retryable provider decline
- **WHEN** a provider returns a verified non-retryable decline
- **THEN** the system SHALL stop retrying and mark the payment failed

### Requirement: Provider Circuit Breaker
The system SHALL maintain independent circuit breakers for VNPAY and MoMo provider calls.

#### Scenario: Circuit opens
- **WHEN** provider failures exceed the configured threshold
- **THEN** the system SHALL open that provider's circuit and fail new payment creation requests fast with provider-unavailable metadata

#### Scenario: Circuit half-open success
- **WHEN** a half-open provider trial request succeeds
- **THEN** the system SHALL close the circuit and allow normal payment requests

### Requirement: Graceful Degradation
The system SHALL provide clear degraded checkout states when a provider is unavailable, slow, or pending confirmation.

#### Scenario: Selected provider unavailable
- **WHEN** a user selects a provider whose circuit is open
- **THEN** the system SHALL return a provider-unavailable response that allows the client to show retry-later or alternate-provider options

#### Scenario: Provider confirmation delayed
- **WHEN** payment creation succeeds but settlement confirmation is delayed
- **THEN** the system SHALL expose a pending state without creating a duplicate payment attempt
