## ADDED Requirements

### Requirement: Local Scan Log Persistence
The mobile app SHALL persist every scan attempt locally with scan ID, ticket ID when available, event ID, staff ID, device ID, timestamp, result classification, and sync status.

#### Scenario: Offline valid scan logged
- **WHEN** a locally valid ticket is scanned offline
- **THEN** the app SHALL insert a local scan record with provisional success and unsynced status

#### Scenario: Invalid scan logged
- **WHEN** an invalid QR code is scanned
- **THEN** the app SHALL persist the failed scan attempt with the invalid classification and diagnostic metadata

### Requirement: Local Duplicate Detection
The mobile app SHALL detect repeated scans of the same ticket on the same device before sync.

#### Scenario: Same ticket scanned twice on same device
- **WHEN** staff scans a ticket that already has a local provisional success record for the active event
- **THEN** the app SHALL classify the new scan as duplicate-on-device and persist the duplicate attempt

### Requirement: Local Sync State Tracking
The mobile app SHALL track unsynced, syncing, synced, failed, and conflict scan states locally.

#### Scenario: Server acknowledges scan
- **WHEN** the backend acknowledges an uploaded scan with a final outcome
- **THEN** the app SHALL update the local scan record with synced status and the server outcome

### Requirement: Local Data Protection
The mobile app SHALL protect locally persisted check-in data using platform-appropriate secure storage or encrypted database mechanisms where available.

#### Scenario: Event manifest stored locally
- **WHEN** event check-in data is downloaded for offline use
- **THEN** the app SHALL store verification material and scan logs using the configured local data protection mechanism
