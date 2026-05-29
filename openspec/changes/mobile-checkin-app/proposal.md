## Why

Gate staff face network outages and severe latency during peak events, so online-only check-in fails and slows entry. An offline-first mobile app is needed now to keep scanning fast and reliable without losing data.

## What Changes

- Introduce an offline-first mobile check-in app with local ticket validation and storage.
- Add background sync to reconcile check-ins when connectivity returns.
- Enforce strict Ticket Checker RBAC for access to scanning features.
- Implement first-scan-wins conflict handling to prevent duplicate entry across devices.
- Provide high-performance scanning UX with immediate visual and audio feedback.

## Capabilities

### New Capabilities
- `mobile-checkin-app`: Offline-first QR scanning with local validation, background sync, and duplicate prevention.

### Modified Capabilities
- None.

## Impact

- New mobile app flows for check-in and offline storage.
- Backend sync endpoints and conflict resolution for check-in events.
- Updates to event data distribution to support preloading on devices.
