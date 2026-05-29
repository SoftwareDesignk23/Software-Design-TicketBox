## ADDED Requirements

### Requirement: Offline Event Readiness
The mobile app SHALL support downloading event manifests, verification keys, ticket metadata needed for local checks, and staff assignment context before offline check-in begins.

#### Scenario: Staff prepares event for offline check-in
- **WHEN** authorized staff downloads an event for offline use
- **THEN** the app SHALL persist the event manifest, verification keys, and check-in metadata needed to scan without connectivity

### Requirement: Connectivity-Aware Check-In
The mobile app SHALL expose online, degraded, and offline connectivity states during check-in and continue local scanning when offline-ready data is available.

#### Scenario: Connectivity lost during check-in
- **WHEN** network connectivity is lost after the event is prepared for offline use
- **THEN** the app SHALL continue scanning with local verification and mark new scans sync-pending

### Requirement: Offline Access Guard
The mobile app SHALL prevent offline scanning for events that have not been prepared with required local verification data.

#### Scenario: Event not prepared
- **WHEN** staff opens check-in for an event with no cached verification keys or manifest
- **THEN** the app SHALL block offline scanning and prompt for online preparation

### Requirement: Offline Readiness Age
The mobile app SHALL display or track the last successful event manifest sync time so staff can identify stale offline data.

#### Scenario: Cached manifest is old
- **WHEN** staff opens an offline-prepared event
- **THEN** the app SHALL make the last manifest sync timestamp available for readiness checks and support decisions
