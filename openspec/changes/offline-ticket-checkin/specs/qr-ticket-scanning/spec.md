## ADDED Requirements

### Requirement: QR Payload Parsing
The mobile app SHALL parse TicketBox QR payloads into ticket ID, event ID, ticket type, validity window, signature metadata, and issued-at metadata.

#### Scenario: Supported QR payload scanned
- **WHEN** staff scans a QR code containing a supported TicketBox ticket payload
- **THEN** the app SHALL parse the payload fields needed for local verification and scan logging

#### Scenario: Unsupported QR payload scanned
- **WHEN** staff scans a QR code that is not a supported TicketBox ticket payload
- **THEN** the app SHALL classify the scan as invalid and persist the failed scan attempt locally

### Requirement: Local Signature Verification
The mobile app SHALL verify scanned ticket payload signatures using cached event verification keys before showing a valid result offline.

#### Scenario: Valid signed ticket scanned
- **WHEN** staff scans a ticket with a valid signature for the selected event
- **THEN** the app SHALL classify the scan as locally valid and persist a provisional success scan record

#### Scenario: Invalid signed ticket scanned
- **WHEN** staff scans a ticket whose signature does not verify against cached keys
- **THEN** the app SHALL classify the scan as invalid and persist the failed scan attempt

### Requirement: Scan Result Classification
The mobile app SHALL classify each scan as valid, invalid, duplicate-on-device, wrong-event, expired, revoked-if-known, or sync-pending.

#### Scenario: Wrong event ticket scanned
- **WHEN** staff scans a validly signed ticket for a different event than the active check-in event
- **THEN** the app SHALL classify the scan as wrong-event and SHALL NOT mark it as a local success

### Requirement: Fast Scan Feedback
The mobile app SHALL show scan results immediately after local validation without waiting for network sync.

#### Scenario: Device offline during valid scan
- **WHEN** staff scans a locally valid ticket while offline
- **THEN** the app SHALL show immediate success feedback and mark the record sync-pending
