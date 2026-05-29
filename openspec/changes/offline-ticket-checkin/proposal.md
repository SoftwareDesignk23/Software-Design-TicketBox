## Why

TicketBox check-in must continue working at venues with poor or unavailable connectivity while still preventing duplicate entry when devices reconnect later. This change defines a mobile-first offline scanning, local persistence, synchronization, and conflict-resolution contract for reliable eventual consistency.

## What Changes

- Add QR ticket scanning that validates TicketBox ticket payloads on staff mobile devices.
- Add offline mode support so authorized staff can scan tickets without a live backend connection.
- Add local persistence for event manifests, ticket verification material, scan logs, sync status, and duplicate-detection data.
- Add reconnect synchronization that uploads local scan logs and downloads server outcomes.
- Add backend conflict resolution using a deterministic first-valid-check-in policy.
- Prevent duplicate check-in on the same device immediately and across devices after synchronization.
- Define a mobile-first architecture for React Native check-in workflows, connectivity state, local storage, and background sync.
- Accept eventual consistency for offline scans while preserving auditable server authority after sync.

## Capabilities

### New Capabilities
- `qr-ticket-scanning`: Covers QR payload parsing, ticket verification, scan result classification, and mobile staff scan UX.
- `offline-checkin-mode`: Covers offline event readiness, cached verification material, connectivity state, and mobile-first offline behavior.
- `local-checkin-persistence`: Covers local database schema, scan log persistence, sync flags, manifest storage, and local duplicate detection.
- `checkin-sync-and-eventual-consistency`: Covers reconnect sync, bulk upload/download, idempotent sync, server acknowledgments, and eventual consistency states.
- `checkin-conflict-resolution`: Covers duplicate prevention, cross-device conflicts, first-valid-check-in policy, conflict audit, and admin alert outcomes.

### Modified Capabilities
<!-- No modified capabilities; there are no archived baseline specs yet. -->

## Impact

- **Mobile App**: Adds camera scanning workflow, offline readiness UI, local database access, scan history, duplicate warnings, and background sync.
- **Backend**: Adds check-in sync APIs, conflict resolution processing, scan audit records, and event/staff permission integration points.
- **Data Model**: Adds or updates event manifests, ticket verification keys, local scan records, sync batches, server scan outcomes, and conflict records.
- **Security**: Requires signed ticket payload verification, secure local storage for event keys/manifests, authenticated sync, and device/staff identity tracking.
- **Operations**: Adds metrics for offline scan volume, sync lag, duplicate scans, conflict resolution outcomes, and failed sync batches.
