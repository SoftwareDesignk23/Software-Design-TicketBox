## ADDED Requirements

### Requirement: Payment Creation Idempotency
The system SHALL require an idempotency key for payment creation and SHALL return the original result for repeated requests with the same key and matching request fingerprint.

#### Scenario: Duplicate payment creation request
- **WHEN** a client repeats a payment creation request with the same idempotency key, reservation, provider, amount, and user
- **THEN** the system SHALL return the existing payment attempt result without creating another provider transaction

#### Scenario: Idempotency key reused with different payload
- **WHEN** a client reuses an idempotency key with a different reservation, provider, amount, or user
- **THEN** the system SHALL reject the request as an idempotency conflict

### Requirement: Duplicate Payment Prevention
The system SHALL prevent more than one successful payment from finalizing the same reservation.

#### Scenario: Two successful callbacks for same reservation
- **WHEN** multiple verified successful provider events reference payment attempts for the same reservation
- **THEN** the system SHALL finalize the booking once and mark additional successful events as duplicate or review-required without issuing extra tickets

### Requirement: Provider Transaction Deduplication
The system SHALL enforce uniqueness for provider transaction references and process each provider transaction at most once.

#### Scenario: Duplicate provider transaction reference
- **WHEN** the same provider transaction reference is received more than once
- **THEN** the system SHALL return the previously processed outcome without repeating booking finalization

### Requirement: Idempotent Booking Finalization
The system SHALL use durable constraints and transactional state checks so booking finalization is exactly once per successful reservation payment.

#### Scenario: Finalization retried after timeout
- **WHEN** booking finalization is retried after an internal timeout
- **THEN** the system SHALL either complete the existing finalization or return the already finalized booking result without creating duplicate tickets
