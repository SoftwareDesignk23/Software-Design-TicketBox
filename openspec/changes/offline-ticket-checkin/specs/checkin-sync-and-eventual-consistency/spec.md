## ADDED Requirements

### Requirement: Reconnect Sync
The mobile app SHALL automatically upload unsynced scan logs when network connectivity is restored and staff remains authorized for the event.

#### Scenario: Device reconnects with unsynced scans
- **WHEN** the app detects connectivity and has unsynced scan records
- **THEN** it SHALL upload the records to the backend through an authenticated sync request

### Requirement: Idempotent Bulk Upload
The backend SHALL process bulk scan uploads idempotently using stable scan IDs, batch IDs, device ID, staff ID, and event ID.

#### Scenario: Sync batch retried
- **WHEN** the same sync batch is submitted more than once
- **THEN** the backend SHALL return the existing per-scan outcomes without applying duplicate side effects

### Requirement: Per-Scan Sync Acknowledgment
The backend SHALL return a final or pending outcome for each uploaded scan record.

#### Scenario: Partial sync success
- **WHEN** a sync batch contains some accepted scans and some rejected scans
- **THEN** the backend SHALL return per-scan outcomes so the app can update each local record independently

### Requirement: Eventual Consistency State
The system SHALL distinguish local provisional scan outcomes from server-final outcomes until sync completes.

#### Scenario: Offline scan before sync
- **WHEN** a valid ticket is scanned offline and has not yet synced
- **THEN** the app SHALL retain the scan as provisional and sync-pending rather than server-final

### Requirement: Sync Retry
The mobile app SHALL retry failed sync uploads without losing local scan records.

#### Scenario: Sync upload fails
- **WHEN** a scan upload fails due to a transient network or server error
- **THEN** the app SHALL keep the affected records unsynced or failed-retryable and retry later
