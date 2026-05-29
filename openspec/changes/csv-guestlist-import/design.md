## Context

Sponsors deliver VIP guest lists as nightly CSV files without an API. The ingestion must be isolated from ticketing flows, tolerate bad rows, and provide auditability and retries so gate staff can verify VIP guests in the mobile app.

## Goals / Non-Goals

**Goals:**
- Ingest CSV guest lists asynchronously via worker processes and a message broker.
- Support scheduled nightly ingestion and manual Admin portal uploads.
- Validate and de-duplicate rows while continuing to process valid data.
- Provide import history, per-row error logs, and retry mechanisms.
- Keep the ingestion isolated from core ticket-selling workloads.

**Non-Goals:**
- Real-time sponsor integrations or bidirectional sync.
- Modifying core ticket purchase or checkout flows.
- Building a full CSV editor in the Admin portal.

## Decisions

- **Isolated ingestion pipeline:** Use a dedicated worker service and queue to process CSV imports, preventing load on API threads and primary transactional connections.
  - *Alternatives considered:* In-process parsing on upload. Rejected due to blocking risk and tighter coupling to the web API.
- **Staged import model:** Store uploaded CSV files in object storage and create import job records with status, counts, and metadata. Workers pull files and process in batches.
  - *Alternatives considered:* Direct streaming into the database. Rejected due to weaker retryability and limited audit trail.
- **Chunked processing:** Split rows into fixed-size batches (configurable, e.g., 500-1000 rows) and commit per batch to allow partial success and limit transaction scope.
  - *Alternatives considered:* Single transaction for the entire file. Rejected due to large rollback impact and memory pressure.
- **Idempotency strategy:** Use a deterministic idempotency key (event_id + sponsor_id + guest_external_id/email) to upsert guest records and prevent duplicates within and across imports.
  - *Alternatives considered:* File-level hashing only. Rejected because duplicates can span multiple files and rows.
- **Error isolation:** Record invalid rows and processing errors in a per-row error table, tagged with import job and row index, while continuing other batches.
  - *Alternatives considered:* Failing the entire job on first error. Rejected due to low tolerance for sponsor data quality.
- **Retry policy:** Automatic retries for transient database errors via queue retry with exponential backoff; manual reprocess endpoint for failed rows after correction.
  - *Alternatives considered:* Manual-only retries. Rejected to reduce operational burden.
- **Scheduling:** Nightly poller detects new CSV drops (object storage prefix + timestamp) and enqueues import jobs; manual uploads follow the same pipeline.
  - *Alternatives considered:* Cron in the web app. Rejected to keep ingestion independent and resilient.

## Risks / Trade-offs

- **Risk:** CSV schema drift or missing required fields. → **Mitigation:** Strict validation with explicit required columns; log errors with actionable messages.
- **Risk:** Duplicate VIP entries across sponsors or events. → **Mitigation:** Scoped idempotency key and uniqueness constraints per event/sponsor.
- **Risk:** Large files causing long-running jobs. → **Mitigation:** Batch size limits, worker concurrency caps, and progress checkpoints.
- **Risk:** Storage/retention costs for CSV files and error logs. → **Mitigation:** Retention policy and archive/delete after configured TTL.
- **Risk:** Manual retry could re-introduce duplicates. → **Mitigation:** Use the same idempotency logic for retries and reprocessing.

## Migration Plan

1. Add database tables for import jobs, row errors, and VIP guest records with unique constraints on idempotency keys.
2. Deploy worker service and queue configuration with feature flags disabled.
3. Ship Admin portal upload UI and backend endpoints to create import jobs.
4. Enable scheduled polling and worker processing in stages; monitor metrics and logs.
5. Backout plan: disable worker consumers and scheduled polling; keep historical data intact.

## Open Questions

- Final CSV schema: required fields and accepted identifiers (email, phone, external ID).
- Maximum expected file size and row counts per event.
- Retention period for CSV source files and row-level error logs.
