## ADDED Requirements

### Requirement: MoMo Payment Request Creation
The system SHALL create signed MoMo payment requests for valid pending reservations using configured partner credentials, amount, order ID, request ID, redirect URL, IPN URL, and expiration metadata.

#### Scenario: Successful MoMo request
- **WHEN** a user starts MoMo checkout for a pending reservation with a valid idempotency key
- **THEN** the system SHALL create a payment attempt, call MoMo safely, store the provider request metadata, and return the redirect or deeplink payload to the client

#### Scenario: MoMo rejects request
- **WHEN** MoMo rejects the payment creation request with a non-retryable validation response
- **THEN** the system SHALL mark the attempt failed and return a provider failure response without retrying

### Requirement: MoMo IPN Verification
The system SHALL verify MoMo IPN/webhook signatures before processing payment state changes.

#### Scenario: Valid MoMo IPN
- **WHEN** MoMo sends an IPN with a valid signature, matching request ID, matching order ID, and matching amount
- **THEN** the system SHALL process the event idempotently and update the normalized payment state

#### Scenario: Invalid MoMo IPN signature
- **WHEN** MoMo sends an IPN with an invalid signature
- **THEN** the system SHALL reject the event and SHALL NOT change payment or booking state

### Requirement: MoMo Redirect Handling
The system SHALL handle MoMo redirect returns as user-facing status updates and verify provider data before trusting the result.

#### Scenario: MoMo redirect returns pending
- **WHEN** a user returns from MoMo before the verified IPN has been processed
- **THEN** the system SHALL show a pending payment state and continue waiting for verified settlement

### Requirement: MoMo Status Mapping
The system SHALL map MoMo result codes and transaction statuses to normalized internal payment states.

#### Scenario: MoMo successful settlement
- **WHEN** MoMo reports a verified successful payment for the expected amount and order
- **THEN** the system SHALL mark the payment successful and trigger booking finalization once

#### Scenario: MoMo failed settlement
- **WHEN** MoMo reports a verified failed, cancelled, or expired payment
- **THEN** the system SHALL mark the payment failed or expired and SHALL NOT finalize the booking
