## ADDED Requirements

### Requirement: Cryptographic Offline Verification
The React Native mobile app SHALL verify scanned ticket QR codes offline by decoding and validating the ticket's cryptographic signature against pre-synchronized public keys.

#### Scenario: Valid Offline Scan
- **WHEN** a staff member scans a ticket QR code offline, and the QR code contains a valid ticket token cryptographically signed by the TicketBox server
- **THEN** the mobile app SHALL decrypt the payload, verify the signature locally, display a "TICKET VALID" message, and log the scan locally in SQLite

#### Scenario: Invalid Offline Scan
- **WHEN** a staff member scans a ticket QR code offline, and the QR code signature does not match the pre-synchronized public key
- **THEN** the mobile app SHALL display a "TICKET INVALID" warning message and log the failed attempt locally

### Requirement: Local SQLite Scan Logging
The mobile app SHALL log all local scan results (ticket ID, timestamp, device ID, scan status) to its local SQLite database when offline.

#### Scenario: Log Scan Event Offline
- **WHEN** an offline ticket scan is processed
- **THEN** the mobile app SHALL insert a scan record into the local SQLite table with status SUCCESS, and set the synchronized status to FALSE

### Requirement: Asynchronous Background Sync
The mobile app SHALL automatically sync local scan logs with the backend servers when internet connectivity is re-established.

#### Scenario: Synchronize Scans
- **WHEN** the mobile app detects network connectivity, and there are local scan records with synchronized status FALSE
- **THEN** the mobile app SHALL push these scan logs to the server in chronological order via a background bulk upload API endpoint, and update local status to TRUE upon server acknowledgment

### Requirement: Scan Conflict Resolution
The backend SHALL process synchronized scan logs using a "first scan wins" policy to resolve any double-entry or duplicate scans.

#### Scenario: First Scan Wins Conflict
- **WHEN** two identical ticket scans are synced, with Scan A having a scan timestamp earlier than Scan B
- **THEN** the backend SHALL register Scan A as SUCCESS (scanned), mark Scan B as DUPLICATE, and trigger an alert in the admin dashboard for Scan B
