## ADDED Requirements

### Requirement: Same-Device Duplicate Prevention
The mobile app SHALL prevent a repeated same-device scan from being treated as another provisional success for the same ticket and event.

#### Scenario: Local duplicate after success
- **WHEN** the same device scans the same ticket again after a provisional success
- **THEN** the app SHALL show duplicate feedback and SHALL NOT create another provisional success for that ticket

### Requirement: Cross-Device Conflict Resolution
The backend SHALL resolve valid cross-device duplicate check-ins using a deterministic first-valid-check-in policy.

#### Scenario: Two devices sync same valid ticket
- **WHEN** two devices upload valid scans for the same ticket and event
- **THEN** the backend SHALL mark the earliest valid scan as accepted and later valid scans as duplicate conflicts

### Requirement: Invalid Scans Cannot Win Conflicts
The backend SHALL exclude invalid, wrong-event, expired, and revoked-if-known scans from winning check-in conflicts.

#### Scenario: Invalid scan submitted before valid scan
- **WHEN** an invalid scan is uploaded with a timestamp earlier than a later valid scan
- **THEN** the backend SHALL reject the invalid scan and allow the valid scan to become the accepted check-in if no earlier valid accepted scan exists

### Requirement: Conflict Audit Trail
The backend SHALL record conflict outcomes with ticket ID, event ID, accepted scan ID, duplicate scan IDs, staff IDs, device IDs, timestamps, and resolution reason.

#### Scenario: Duplicate conflict resolved
- **WHEN** the backend marks a scan as a duplicate conflict
- **THEN** it SHALL persist an audit record and expose the duplicate outcome to the syncing device

### Requirement: Admin Conflict Visibility
The system SHALL make duplicate check-in conflicts available to authorized organizer or admin workflows.

#### Scenario: Duplicate conflict occurs
- **WHEN** a cross-device duplicate is resolved by the backend
- **THEN** the system SHALL make the conflict visible with enough scan metadata for operational review
