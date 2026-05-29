## Context

TicketBox venue staff need to scan tickets quickly even when mobile networks are unreliable or unavailable. The mobile app must validate ticket authenticity locally, persist scan outcomes, prevent obvious duplicate entry on the device, and synchronize with the backend when connectivity returns.

The backend remains the authoritative source of final check-in state. Offline scans are accepted locally as provisional results, then reconciled through sync batches using deterministic conflict resolution and audit records.

## Goals / Non-Goals

**Goals:**
- Scan QR tickets on mobile devices and classify results as valid, invalid, duplicate, expired, wrong event, or sync-pending.
- Support offline check-in using cached event manifests, ticket verification keys, and local scan history.
- Persist local scan logs, device identity, staff identity, timestamps, sync status, and conflict outcomes.
- Synchronize scan logs when reconnecting with idempotent bulk upload and server acknowledgment.
- Prevent duplicate check-in immediately on the same device and resolve cross-device duplicates after sync.
- Provide a mobile-first architecture optimized for fast scanning, unreliable connectivity, and background sync.
- Maintain eventual consistency between offline devices and backend check-in state.

**Non-Goals:**
- Building full ticket purchase, payment, or booking finalization workflows.
- Guaranteeing real-time cross-device duplicate prevention while all devices are offline.
- Supporting arbitrary third-party scanner hardware in the first implementation.
- Replacing staff authentication and event assignment rules defined by auth/RBAC work.

## Decisions

### Decision 1: Signed QR Payloads for Offline Verification

Ticket QR codes SHALL contain signed payloads with ticket ID, event ID, ticket type, validity window, and signature metadata. The mobile app verifies the payload using event public keys cached before check-in.

Alternatives considered:
- **Online-only validation**: Accurate in real time, but unusable at low-connectivity venues.
- **Opaque QR code requiring server lookup**: Simple backend model, but blocks offline mode.
- **Signed payload verification**: Chosen because it supports offline authenticity checks while preserving backend authority after sync.

### Decision 2: Local Database as the Mobile Check-In Log

The app SHALL use local persistence for event manifests, verification keys, scan logs, sync batches, and duplicate indexes. Scan writes happen locally first so scanning remains fast and resilient.

Alternatives considered:
- **In-memory scan state**: Fast but loses evidence if the app restarts.
- **Flat files or key-value only**: Awkward for querying unsynced logs, duplicate checks, and batch state.
- **Local relational storage**: Chosen for durable, queryable, transactional mobile scan records.

### Decision 3: Provisional Offline Results with Server Reconciliation

Offline scan results SHALL be marked provisional until synchronized. The backend applies final outcomes using ticket state, event scope, scan timestamp, device/staff identity, and conflict rules.

Alternatives considered:
- **Treat offline valid scan as final forever**: Fast UX but unsafe for cross-device duplicates.
- **Block entry until sync confirms**: Defeats offline support.
- **Provisional local success with later reconciliation**: Chosen because it balances venue throughput and eventual correctness.

### Decision 4: Idempotent Bulk Sync Batches

The mobile app SHALL upload unsynced scan logs in batches with stable scan IDs and batch IDs. The backend processes each scan idempotently and returns per-scan outcomes that the app stores locally.

Alternatives considered:
- **Upload one scan at a time**: Simple but inefficient after long offline periods.
- **Replace all local state on reconnect**: Risky and hard to audit.
- **Idempotent batch sync**: Chosen for reliability, retry safety, and clear partial-failure handling.

### Decision 5: First Valid Check-In Wins

For cross-device conflicts, the backend SHALL accept the earliest valid scan for a ticket within the event and mark later valid scans as duplicates. Invalid signatures, wrong-event scans, and revoked tickets never win conflicts.

Alternatives considered:
- **Server receive order wins**: Easy, but unfair when offline devices reconnect at different times.
- **Device-local decision wins**: Unsafe because devices can disagree.
- **Earliest valid scan timestamp with audit**: Chosen as deterministic and explainable, with staff/device metadata for investigation.

## Risks / Trade-offs

- **[Risk] Device clock skew can affect first-scan-wins decisions** -> Mitigation: record device timestamp, server receive timestamp, device clock offset when known, and flag suspicious conflicts for review.
- **[Risk] Cached manifests can become stale** -> Mitigation: show offline readiness age, require pre-event sync, and reconcile revoked or changed tickets on upload.
- **[Risk] Local device loss exposes cached event data** -> Mitigation: use encrypted local storage where available and limit cached data to check-in essentials.
- **[Risk] Offline cross-device duplicates cannot be prevented immediately** -> Mitigation: prevent same-device duplicates locally and surface server conflict outcomes after sync.
- **[Risk] Large offline batches can fail partially** -> Mitigation: process sync batches idempotently with per-scan acknowledgments and retry only unresolved records.

## Migration Plan

1. Add backend scan sync, event manifest, and verification-key endpoints.
2. Add mobile local database schema for manifests, keys, scans, sync batches, and server outcomes.
3. Implement QR scanner flow with signed payload parsing and local validation.
4. Add offline readiness download and connectivity state handling.
5. Implement local duplicate detection and provisional scan outcomes.
6. Implement idempotent reconnect sync and backend conflict resolution.
7. Add admin/operations visibility for duplicate conflicts and failed sync batches.
8. Roll back by disabling offline scan mode while retaining online scan validation and uploaded scan audit records.

## Open Questions

- Which local database package should the React Native app standardize on?
- How long before event start should staff devices be required to refresh manifests and verification keys?
- Should conflict resolution use raw device timestamp, server-adjusted timestamp, or staff-confirmed review for high-risk conflicts?
