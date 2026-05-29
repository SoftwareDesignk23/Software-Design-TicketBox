## ADDED Requirements

### Requirement: VNPAY Payment Request Creation
The system SHALL create signed VNPAY payment URLs for valid pending reservations using configured merchant credentials, amount, order reference, return URL, IP address, locale, and expiration timestamp.

#### Scenario: Successful VNPAY request
- **WHEN** a user starts VNPAY checkout for a pending reservation with a valid idempotency key
- **THEN** the system SHALL create a payment attempt, generate a signed VNPAY redirect URL, and return it to the client

#### Scenario: Invalid VNPAY request
- **WHEN** a user starts VNPAY checkout for an expired or completed reservation
- **THEN** the system SHALL reject the request without creating a provider payment URL

### Requirement: VNPAY Return Verification
The system SHALL verify VNPAY return parameters and signature before updating payment state or showing a trusted payment result.

#### Scenario: Valid VNPAY return
- **WHEN** VNPAY redirects the user back with a valid signature and matching transaction reference
- **THEN** the system SHALL update the payment attempt with the verified provider response and show the normalized payment state

#### Scenario: Invalid VNPAY signature
- **WHEN** VNPAY return parameters fail signature verification
- **THEN** the system SHALL reject the return as untrusted and SHALL NOT mark the payment successful

### Requirement: VNPAY Status Mapping
The system SHALL map VNPAY response and transaction status codes to normalized internal payment states.

#### Scenario: VNPAY successful settlement
- **WHEN** VNPAY reports a verified successful transaction for a matching amount and order reference
- **THEN** the system SHALL mark the payment successful and trigger booking finalization once

#### Scenario: VNPAY failed settlement
- **WHEN** VNPAY reports a verified failed or cancelled transaction
- **THEN** the system SHALL mark the payment failed and SHALL NOT finalize the booking

### Requirement: VNPAY Amount and Reference Validation
The system SHALL validate VNPAY amount, currency, order reference, and merchant reference against the stored payment attempt.

#### Scenario: VNPAY amount mismatch
- **WHEN** a verified VNPAY callback references a payment attempt but the amount does not match
- **THEN** the system SHALL mark the event suspicious, SHALL NOT finalize the booking, and SHALL require review
