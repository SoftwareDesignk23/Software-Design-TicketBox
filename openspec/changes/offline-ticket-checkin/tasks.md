## 1. Backend Check-In Foundation

- [ ] 1.1 Add backend data models or persistence adapters for event manifests, verification keys, scan logs, sync batches, server outcomes, and conflict records
- [ ] 1.2 Add event manifest and verification-key download APIs scoped to authorized check-in staff assignments
- [ ] 1.3 Add authenticated scan sync API accepting batch ID, scan IDs, staff ID, device ID, event ID, timestamps, and scan classifications
- [ ] 1.4 Add idempotency handling for repeated sync batches and repeated scan IDs
- [ ] 1.5 Add operational metrics for offline scan volume, sync lag, failed batches, duplicate conflicts, and stale manifest usage

## 2. Mobile Local Storage

- [ ] 2.1 Add mobile local database schema for cached events, verification keys, manifests, scan records, sync batches, and server outcomes
- [ ] 2.2 Add local data protection using platform-appropriate secure storage or encrypted database mechanisms where available
- [ ] 2.3 Implement local scan log writes for valid, invalid, duplicate-on-device, wrong-event, expired, and revoked-if-known classifications
- [ ] 2.4 Implement local sync state transitions for unsynced, syncing, synced, failed, conflict, and retryable states
- [ ] 2.5 Add local indexes for fast ticket duplicate detection during active event scanning

## 3. QR Scanning and Offline Verification

- [ ] 3.1 Implement mobile QR scanner flow for TicketBox ticket payloads
- [ ] 3.2 Implement QR payload parser for ticket ID, event ID, ticket type, validity window, signature metadata, and issued-at metadata
- [ ] 3.3 Implement local signature verification against cached event public keys
- [ ] 3.4 Implement scan classification for unsupported payloads, invalid signatures, wrong event, expired tickets, known revoked tickets, and local success
- [ ] 3.5 Add immediate mobile scan feedback that does not wait for network sync

## 4. Offline Mode Readiness

- [ ] 4.1 Implement event preparation flow that downloads manifests, verification keys, and check-in metadata for offline use
- [ ] 4.2 Add connectivity state detection for online, degraded, and offline check-in modes
- [ ] 4.3 Block offline scanning when required event manifest or verification-key data is missing
- [ ] 4.4 Track and expose last successful manifest sync timestamp for offline readiness decisions
- [ ] 4.5 Add mobile-first UI states for prepared, stale, offline, syncing, and sync-failed conditions

## 5. Sync and Eventual Consistency

- [ ] 5.1 Implement mobile reconnect detection that queues unsynced scans for upload when connectivity returns
- [ ] 5.2 Implement idempotent bulk upload with stable batch IDs and scan IDs
- [ ] 5.3 Implement backend per-scan acknowledgment with accepted, rejected, duplicate, conflict, pending, and failed outcomes
- [ ] 5.4 Update local scan records from backend acknowledgments without losing provisional scan history
- [ ] 5.5 Implement retry behavior for transient sync failures and partial batch failures

## 6. Conflict Resolution

- [ ] 6.1 Implement same-device duplicate prevention so repeated local scans do not create multiple provisional successes
- [ ] 6.2 Implement backend first-valid-check-in-wins policy for cross-device conflicts
- [ ] 6.3 Exclude invalid, wrong-event, expired, and revoked-if-known scans from winning conflicts
- [ ] 6.4 Persist conflict audit records with accepted scan, duplicate scans, staff/device IDs, timestamps, and resolution reason
- [ ] 6.5 Expose duplicate conflict outcomes to syncing devices and authorized admin or organizer review workflows
- [ ] 6.6 Add suspicious clock-skew detection or metadata capture for conflict review

## 7. Verification

- [ ] 7.1 Add mobile unit tests for QR parsing, signature verification, scan classification, and local duplicate detection
- [ ] 7.2 Add local persistence tests for scan logging, sync status transitions, and protected manifest/key storage
- [ ] 7.3 Add offline readiness tests for prepared event data, stale manifest timestamp, missing verification keys, and connectivity transitions
- [ ] 7.4 Add backend sync API tests for idempotent batches, per-scan acknowledgments, partial failures, and retry-safe behavior
- [ ] 7.5 Add conflict resolution tests for first-valid-check-in wins, invalid scan exclusion, same-ticket cross-device duplicates, and audit records
- [ ] 7.6 Add end-to-end mobile/backend simulation for scanning offline, reconnecting, syncing, and receiving final outcomes
- [ ] 7.7 Run affected backend and mobile test/lint commands and document any skipped checks
