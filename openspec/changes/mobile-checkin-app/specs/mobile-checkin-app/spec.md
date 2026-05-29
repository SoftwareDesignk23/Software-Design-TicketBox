## ADDED Requirements

### Requirement: Ticket Checker RBAC
The system SHALL allow only authenticated users with the Ticket Checker role to access the mobile scanning interface.

#### Scenario: Authorized access
- **WHEN** a Ticket Checker authenticates in the mobile app
- **THEN** the scanning interface is доступ

#### Scenario: Unauthorized access
- **WHEN** a user without the Ticket Checker role attempts to access the app
- **THEN** the scanning interface is denied

### Requirement: Offline-first local validation
The system SHALL cache event roster data locally and validate scans against the on-device database before any network call.

#### Scenario: Offline scan
- **WHEN** the device is offline and a QR code is scanned
- **THEN** the app validates the ticket locally and records the scan event

### Requirement: Background synchronization queue
The system SHALL enqueue scan events locally and automatically sync them to the backend when connectivity is restored.

#### Scenario: Connectivity restored
- **WHEN** network connectivity is restored
- **THEN** the app dispatches queued scan events to the backend

### Requirement: Distributed duplicate prevention
The system SHALL enforce first-scan-wins conflict resolution using scan timestamps and flag duplicates locally and during backend reconciliation.

#### Scenario: Local duplicate
- **WHEN** the same ticket is scanned twice on the same device
- **THEN** the app flags the second scan as a duplicate

#### Scenario: Cross-device duplicate
- **WHEN** two devices sync scans for the same ticket
- **THEN** the backend accepts the earliest scan and marks later scans as duplicates

### Requirement: High-performance scanning UX
The system SHALL use native camera APIs and provide immediate visual and audio feedback for successful and failed scans.

#### Scenario: Successful scan feedback
- **WHEN** a valid ticket is scanned
- **THEN** the app shows a success state and plays a success sound

#### Scenario: Failed scan feedback
- **WHEN** an invalid or duplicate ticket is scanned
- **THEN** the app shows a failure state and plays a failure sound
