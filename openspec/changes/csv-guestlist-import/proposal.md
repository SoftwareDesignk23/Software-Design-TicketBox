## Why

Sponsors provide VIP guest lists as late-night CSV drops with no live API. We need a resilient, isolated ingestion path so gate staff can verify VIP guests without impacting core ticketing performance.

## What Changes

- Add a CSV guest list ingestion pipeline that runs asynchronously via background workers and a message broker.
- Support scheduled nightly imports plus manual uploads from the Admin portal.
- Validate rows, isolate invalid data, and keep processing even when bad rows exist.
- Enforce idempotent imports with duplicate detection across files and prior records.
- Record import history, per-row errors, and audit metadata; enable retries for transient failures and manual reprocessing for corrected rows.

## Capabilities

### New Capabilities
- `vip-guestlist-import`: Ingest, validate, de-duplicate, and audit CSV VIP guest lists with scheduled and manual triggers.

### Modified Capabilities
- None.

## Impact

- New background worker flows and message broker usage for CSV ingestion.
- Admin portal upload and retry controls.
- New database tables for guest list records, import jobs, and error logs.
- Mobile check-in depends on imported VIP data for verification, but core ticketing flows remain isolated.
