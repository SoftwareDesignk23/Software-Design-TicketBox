## ADDED Requirements

### Requirement: Webhook Signature Verification
The system SHALL verify provider webhook, IPN, and return signatures before processing payment state changes.

#### Scenario: Valid signed webhook
- **WHEN** a provider sends a webhook with a valid signature and expected merchant credentials
- **THEN** the system SHALL accept the event for idempotent processing

#### Scenario: Invalid signed webhook
- **WHEN** a provider sends a webhook with a missing or invalid signature
- **THEN** the system SHALL reject the event and SHALL NOT change payment or booking state

### Requirement: Webhook Replay Protection
The system SHALL prevent replayed provider events from applying payment state changes more than once.

#### Scenario: Replayed webhook event
- **WHEN** the same provider event ID, transaction reference, or derived event hash is received again
- **THEN** the system SHALL return the previously processed outcome without repeating side effects

### Requirement: Webhook Freshness Validation
The system SHALL validate provider event timestamps or request freshness where provider payloads support it.

#### Scenario: Stale webhook event
- **WHEN** a provider event timestamp is outside the accepted freshness window and no reconciliation override is active
- **THEN** the system SHALL reject or quarantine the event without finalizing a booking

### Requirement: Webhook Audit Trail
The system SHALL store verified and rejected provider events with processing outcome, correlation IDs, and sensitive values redacted.

#### Scenario: Webhook processed
- **WHEN** a provider event is accepted or rejected
- **THEN** the system SHALL record an audit entry that supports troubleshooting without storing raw secrets or full sensitive payment data
