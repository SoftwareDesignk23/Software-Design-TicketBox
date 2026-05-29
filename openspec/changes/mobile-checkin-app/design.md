## Context

Large venues routinely face cellular outages during peak ingress. Check-in must continue offline with fast scans and guaranteed reconciliation, while preventing duplicate entry across devices.

## Goals / Non-Goals

**Goals:**
- Provide offline-first scanning with local validation and storage.
- Sync check-in events reliably when connectivity returns.
- Enforce Ticket Checker RBAC for access to scanning features.
- Prevent duplicate entry using first-scan-wins conflict resolution.
- Deliver high-throughput UX with immediate visual and audio feedback.

**Non-Goals:**
- Replacing the primary ticketing backend.
- Guaranteeing real-time cross-device consistency while offline.
- Supporting non-check-in staff workflows in the app.

## Decisions

- **Local-first validation:** Cache event rosters locally and validate scans against an on-device database for instant feedback.
  - *Alternatives considered:* Online-only verification. Rejected due to outage risk.
- **SQLite persistence:** Use SQLite for local storage of ticket rosters and scan events with indexed lookups.
  - *Alternatives considered:* In-memory cache. Rejected due to data loss risk.
- **Background sync queue:** Implement a persistent queue that retries on connectivity changes and app restarts.
  - *Alternatives considered:* Manual sync only. Rejected due to operational risk.
- **First-scan-wins:** Server reconciles conflicts based on scan timestamps and accepts the earliest scan; later scans are marked duplicates.
  - *Alternatives considered:* Last-write-wins. Rejected due to fraud risk.
- **UX feedback:** Use native camera APIs and dedicated success/failure feedback patterns to minimize scanning latency.
  - *Alternatives considered:* Web-based scanning. Rejected due to performance limits.

## Risks / Trade-offs

- **Risk:** Local roster becomes stale. → **Mitigation:** Pre-event sync window with version checks and forced refresh.
- **Risk:** Time skew affects conflict resolution. → **Mitigation:** Use server time on sync to adjust and record device clock drift.
- **Risk:** Large roster size impacts device storage. → **Mitigation:** Per-event scoping and compression of payloads.
- **Risk:** Offline duplicates across devices. → **Mitigation:** First-scan-wins with clear duplicate reconciliation UI.

## Migration Plan

1. Add backend endpoints for roster download, scan event sync, and conflict resolution.
2. Build mobile check-in app with offline database and scanning UX.
3. Enable RBAC enforcement and device registration.
4. Pilot at a small venue, monitor sync latency and duplicate rates.
5. Rollout to all venues with training and operational playbooks.
6. Rollback: disable new app access and fall back to existing check-in flow.

## Open Questions

- Max roster size per event and device storage limits.
- Required sync SLA after connectivity returns.
- Device clock drift tolerance thresholds.
